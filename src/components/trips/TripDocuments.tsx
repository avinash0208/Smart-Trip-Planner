import React, { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, File, FileImage, FileText, Loader2, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { documentService } from '@/services/documentService'
import type { TripDocument } from '@/types/database.types'

interface TripDocumentsProps {
  tripId: string
  userId: string
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith('image/')) return <FileImage className="h-5 w-5" />
  if (fileType === 'application/pdf') return <FileText className="h-5 w-5" />
  return <File className="h-5 w-5" />
}

export const TripDocuments: React.FC<TripDocumentsProps> = ({ tripId, userId }) => {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [openingId, setOpeningId] = useState<string | null>(null)

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', tripId],
    queryFn: () => documentService.getDocuments(tripId),
    enabled: Boolean(tripId),
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => documentService.uploadDocument(tripId, userId, file),
    onSuccess: ({ error: uploadError }) => {
      if (uploadError) {
        setError(uploadError.message)
      } else {
        setError(null)
        queryClient.invalidateQueries({ queryKey: ['documents', tripId] })
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (document: TripDocument) => documentService.deleteDocument(document),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents', tripId] }),
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadMutation.mutate(file)
    e.target.value = ''
  }

  const handleView = async (document: TripDocument) => {
    setOpeningId(document.id)
    try {
      const url = await documentService.getFileUrl(document)
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer')
      } else {
        setError('Unable to open this file right now.')
      }
    } finally {
      setOpeningId(null)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-5 rounded-2xl border-border/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-foreground">Booking & Ticket Vault</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Store flight tickets, hotel vouchers, and insurance documents (PDF or image, up to 8MB in demo mode).
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
            className="gap-1.5 shrink-0"
          >
            {uploadMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            Upload Document
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {error && (
          <div className="mt-3 p-3 text-xs text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl">
            {error}
          </div>
        )}
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : documents.length === 0 ? (
        <Card className="p-10 text-center space-y-2 border-dashed rounded-2xl bg-card/50">
          <File className="h-8 w-8 mx-auto text-muted-foreground/60" />
          <p className="text-xs text-muted-foreground">No documents uploaded yet for this trip.</p>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {documents.map((document) => (
            <Card key={document.id} className="rounded-2xl border-border/80 shadow-xs">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                    {getFileIcon(document.file_type)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{document.file_name}</p>
                    <p className="text-[11px] text-muted-foreground">{formatFileSize(document.file_size)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleView(document)}
                    disabled={openingId === document.id}
                    className="text-muted-foreground hover:text-teal-600 p-2 rounded-xl hover:bg-secondary transition-colors cursor-pointer"
                    title="View / Download"
                  >
                    {openingId === document.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate(document)}
                    className="text-muted-foreground hover:text-red-500 p-2 rounded-xl hover:bg-red-500/10 transition-colors cursor-pointer"
                    title="Delete Document"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
