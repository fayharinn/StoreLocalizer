import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

export default function TreatmentDialog({ mode = 'create', open, treatment, isSubmitting, onClose, onSubmit }) {
  const [name, setName] = useState(treatment?.name || '')
  const [appIconName, setAppIconName] = useState(treatment?.appIconName || '')

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add treatment' : 'Edit treatment'}</DialogTitle>
          <DialogDescription>
            A treatment is one alternative to your original page: a different icon, different media, or both.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="treatment-name">Name *</Label>
            <Input id="treatment-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bold colors" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="treatment-icon">Alternate app icon (optional)</Label>
            <Input
              id="treatment-icon"
              value={appIconName}
              onChange={(e) => setAppIconName(e.target.value)}
              placeholder="AppIcon-Dark"
              className="font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              The name of an alternate icon included in your approved binary. Leave empty to keep the original icon.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={() => onSubmit({ name: name.trim(), appIconName: appIconName.trim() })} disabled={isSubmitting || !name.trim()}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'create' ? 'Add treatment' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
