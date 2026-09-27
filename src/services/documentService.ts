import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { TripDocument } from '@/types/database.types'

const mockDocumentsStorageKey = 'smartplanner_local_documents'
const STORAGE_BUCKET = 'trip-documents'

// Demo/offline mode keeps small files inline as base64; real uploads go to Supabase Storage
export const MAX_DEMO_FILE_SIZE = 8 * 1024 * 1024 // 8MB

const getLocalData = <T>(key: string, defaultValue: T): T => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : defaultValue
  } catch {
    return defaultValue
  }
}

const setLocalData = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (err) {
    console.error('LocalStorage write failed:', err)
  }
}

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })

const sanitizeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_')

const isRealTrip = (tripId: string) => !tripId.startsWith('demo-') && !tripId.startsWith('trip-')

export const documentService = {
  async getDocuments(tripId: string): Promise<TripDocument[]> {
    if (isSupabaseConfigured && isRealTrip(tripId)) {
      try {
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('trip_id', tripId)
          .order('created_at', { ascending: false })

        if (!error && data) return data as TripDocument[]
      } catch (err) {
        console.error('Failed to get documents from Supabase:', err)
      }
    }

    return getLocalData<TripDocument[]>(mockDocumentsStorageKey, []).filter((d) => d.trip_id === tripId)
  },

  async uploadDocument(
    tripId: string,
    userId: string,
    file: File
  ): Promise<{ document: TripDocument | null; error: Error | null }> {
    if (isSupabaseConfigured && isRealTrip(tripId) && userId && !userId.startsWith('demo-')) {
      try {
        const storagePath = `${userId}/${tripId}/${Date.now()}-${sanitizeFileName(file.name)}`
        const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, file)
        if (uploadError) return { document: null, error: new Error(uploadError.message) }

        const { data, error: insertError } = await supabase
          .from('documents')
          .insert({
            trip_id: tripId,
            user_id: userId,
            file_name: file.name,
            storage_path: storagePath,
            file_type: file.type || 'application/octet-stream',
            file_size: file.size,
          })
          .select()
          .single()

        if (insertError || !data) {
          await supabase.storage.from(STORAGE_BUCKET).remove([storagePath])
          return { document: null, error: new Error(insertError?.message || 'Failed to save document record') }
        }

        return { document: data as TripDocument, error: null }
      } catch (err: any) {
        return { document: null, error: new Error(err.message || 'Failed to upload document') }
      }
    }

    // Local / Demo fallback — keeps the file inline as a base64 data URL
    if (file.size > MAX_DEMO_FILE_SIZE) {
      return {
        document: null,
        error: new Error('Files larger than 8MB are not supported in offline demo mode.'),
      }
    }

    try {
      const dataUrl = await readFileAsDataUrl(file)
      const newDocument: TripDocument = {
        id: `doc-${Date.now()}`,
        trip_id: tripId,
        user_id: userId,
        file_name: file.name,
        storage_path: `local/${tripId}/${file.name}`,
        file_type: file.type || 'application/octet-stream',
        file_size: file.size,
        created_at: new Date().toISOString(),
        data_url: dataUrl,
      }
      const currentDocuments = getLocalData<TripDocument[]>(mockDocumentsStorageKey, [])
      setLocalData(mockDocumentsStorageKey, [newDocument, ...currentDocuments])
      return { document: newDocument, error: null }
    } catch (err: any) {
      return { document: null, error: new Error(err.message || 'Failed to read file') }
    }
  },

  // Resolves a viewable/downloadable URL for a document (signed URL for Supabase Storage, or the inline data URL locally)
  async getFileUrl(document: TripDocument): Promise<string | null> {
    if (isSupabaseConfigured && isRealTrip(document.trip_id) && !document.storage_path.startsWith('local/')) {
      try {
        const { data, error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .createSignedUrl(document.storage_path, 60 * 60)
        if (error) return null
        return data?.signedUrl || null
      } catch {
        return null
      }
    }
    return document.data_url || null
  },

  async deleteDocument(document: TripDocument): Promise<{ error: Error | null }> {
    if (isSupabaseConfigured && isRealTrip(document.trip_id) && !document.storage_path.startsWith('local/')) {
      try {
        await supabase.storage.from(STORAGE_BUCKET).remove([document.storage_path])
        const { error } = await supabase.from('documents').delete().eq('id', document.id)
        return { error: error ? new Error(error.message) : null }
      } catch (err: any) {
        return { error: new Error(err.message) }
      }
    }

    const currentDocuments = getLocalData<TripDocument[]>(mockDocumentsStorageKey, [])
    setLocalData(
      mockDocumentsStorageKey,
      currentDocuments.filter((d) => d.id !== document.id)
    )
    return { error: null }
  },
}
