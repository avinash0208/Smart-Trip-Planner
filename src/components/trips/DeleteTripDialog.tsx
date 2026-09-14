import React from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DeleteTripDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>;
  tripTitle: string
  isLoading?: boolean
}

export const DeleteTripDialog: React.FC<DeleteTripDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  tripTitle,
  isLoading = false,
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-card/95 backdrop-blur-xl border border-border rounded-3xl max-w-sm w-full p-6 shadow-2xl animate-in zoom-in-95 space-y-4 text-center">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center">
          <AlertTriangle className="h-6 w-6" />
        </div>

        <div className="space-y-1.5">
          <h3 className="font-extrabold text-base text-foreground">Delete Trip Itinerary?</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Are you sure you want to delete <strong className="text-foreground">"{tripTitle}"</strong>? All associated day schedules and scheduled activities will be permanently removed.
          </p>
        </div>

        <div className="flex gap-2.5 pt-2">
          <Button
            type="button"
            variant="outline"
            className="w-1/2 text-xs rounded-xl"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="w-1/2 text-xs rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
            ) : (
              'Delete Forever'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
