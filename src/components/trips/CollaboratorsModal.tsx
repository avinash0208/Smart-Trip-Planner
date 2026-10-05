import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Crown, Eye, Loader2, Mail, Pencil, Trash2, UserPlus, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { tripMemberService } from '@/services/tripMemberService'
import type { MemberRole } from '@/types/database.types'
import type { PresenceUser } from '@/hooks/useTripCollaboration'

interface CollaboratorsModalProps {
  isOpen: boolean
  onClose: () => void
  tripId: string
  isOwner: boolean
  isLocalTrip: boolean
  currentUserId?: string
  activeUsers: PresenceUser[]
}

const ROLE_META: Record<MemberRole, { label: string; icon: React.ReactNode }> = {
  owner: { label: 'Owner', icon: <Crown className="h-3 w-3" /> },
  editor: { label: 'Editor', icon: <Pencil className="h-3 w-3" /> },
  viewer: { label: 'Viewer', icon: <Eye className="h-3 w-3" /> },
}

export const CollaboratorsModal: React.FC<CollaboratorsModalProps> = ({
  isOpen,
  onClose,
  tripId,
  isOwner,
  isLocalTrip,
  currentUserId,
  activeUsers,
}) => {
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<MemberRole>('editor')
  const [error, setError] = useState<string | null>(null)

  const { data: members = [], isLoading, error: membersError } = useQuery({
    queryKey: ['trip-members', tripId],
    queryFn: () => tripMemberService.getMembers(tripId),
    enabled: isOpen && Boolean(tripId),
  })

  const inviteMutation = useMutation({
    mutationFn: () => tripMemberService.inviteByEmail(tripId, email, role),
    onSuccess: ({ error: inviteError }) => {
      if (inviteError) {
        setError(inviteError.message)
        return
      }
      setEmail('')
      setError(null)
      queryClient.invalidateQueries({ queryKey: ['trip-members', tripId] })
    },
  })

  const roleMutation = useMutation({
    mutationFn: ({ id, newRole }: { id: string; newRole: MemberRole }) => tripMemberService.updateRole(id, newRole),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trip-members', tripId] }),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => tripMemberService.removeMember(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trip-members', tripId] }),
  })

  if (!isOpen) return null

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setError('Please enter an email address')
      return
    }
    setError(null)
    inviteMutation.mutate()
  }

  const isOnline = (userId: string) => activeUsers.some((u) => u.id === userId)

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div className="bg-card border border-border rounded-3xl max-w-md w-full max-h-[92vh] flex flex-col shadow-2xl animate-in zoom-in-95 overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/70 p-4 sm:p-5 shrink-0 bg-card">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-foreground">Collaborators</h3>
              <p className="text-xs text-muted-foreground">Invite others to co-plan this trip</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {membersError && (
            <div className="p-2.5 text-xs text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl">
              Could not load collaborators: {(membersError as Error).message}
            </div>
          )}
          {isOwner && (
            <form onSubmit={handleInvite} className="space-y-2.5">
              <label className="font-bold text-foreground text-xs flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" /> Invite by Email
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="email"
                  placeholder="traveler@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-xl flex-1"
                />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as MemberRole)}
                  className="flex h-10 rounded-xl border border-input bg-card text-foreground px-3 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 cursor-pointer sm:w-32"
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
                <Button type="submit" disabled={inviteMutation.isPending} className="gap-1.5 shrink-0">
                  {inviteMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <UserPlus className="h-3.5 w-3.5" />
                  )}
                  Invite
                </Button>
              </div>
              {error && (
                <div className="p-2.5 text-xs text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl">
                  {error}
                </div>
              )}
            </form>
          )}
          {isLocalTrip && (
            <div className="p-2.5 text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              This is a browser-local trip. Collaborators added here are stored only on this device; email invitations and live sharing require a Supabase-backed trip.
            </div>
          )}
          {!isOwner && (
            <div className="p-2.5 text-xs text-muted-foreground bg-secondary/50 border border-border rounded-xl">
              Only the trip owner can invite collaborators or manage their roles.
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
              {members.length} Collaborator{members.length === 1 ? '' : 's'}
            </p>

            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : members.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No collaborators yet — invite someone to co-plan with you.
              </p>
            ) : (
              members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-secondary/40 border border-border/60"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative h-8 w-8 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
                      {member.profile?.avatar_url ? (
                        <img
                          src={member.profile.avatar_url}
                          alt={member.profile.full_name || member.profile.email}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        (member.profile?.full_name || member.profile?.email || '?').charAt(0).toUpperCase()
                      )}
                      {isOnline(member.user_id) && (
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-card" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {member.profile?.full_name || member.profile?.email}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">{member.profile?.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isOwner ? (
                      <select
                        value={member.role}
                        onChange={(e) =>
                          roleMutation.mutate({ id: member.id, newRole: e.target.value as MemberRole })
                        }
                        className="h-8 rounded-lg border border-input bg-card text-foreground px-2 text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 cursor-pointer"
                      >
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    ) : (
                      <span className="px-2 py-1 rounded-lg bg-card border border-border text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                        {ROLE_META[member.role].icon} {ROLE_META[member.role].label}
                      </span>
                    )}
                    {(isOwner || member.user_id === currentUserId) && (
                      <button
                        onClick={() => removeMutation.mutate(member.id)}
                        className="text-muted-foreground hover:text-red-500 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                        title={member.user_id === currentUserId ? 'Leave trip' : 'Remove collaborator'}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
