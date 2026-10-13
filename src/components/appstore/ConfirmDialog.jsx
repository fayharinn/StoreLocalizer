import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Loader2 } from 'lucide-react'

export default function ConfirmDialog({ open, title, description, confirmLabel, destructive = true, isBusy, onClose, onConfirm }) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && !isBusy && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isBusy}>Cancel</AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button variant={destructive ? 'destructive' : 'default'} onClick={onConfirm} disabled={isBusy}>
              {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {confirmLabel}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
