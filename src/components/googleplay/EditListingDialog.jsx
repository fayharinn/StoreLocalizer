import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CheckCircle2 } from 'lucide-react'
import { GP_LOCALES } from '@/services/googlePlayService'

export default function EditListingDialog({
  editDialog,
  setEditDialog,
  handleSaveEdit,
}) {
  return (
    <Dialog open={editDialog.open} onOpenChange={(open) => !open && setEditDialog({ ...editDialog, open: false })}>
      <DialogContent className="sm:max-w-[600px] gap-0 p-0 overflow-hidden max-h-[90vh]">
        <DialogHeader className="p-6 pb-4 border-b border-border/50 bg-muted/30">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{GP_LOCALES.find(l => l.code === editDialog.locale)?.flag || '🌐'}</span>
            <div>
              <DialogTitle className="text-xl">Edit Listing</DialogTitle>
              <DialogDescription>
                {GP_LOCALES.find(l => l.code === editDialog.locale)?.name || editDialog.locale}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium">Title (max 30 chars)</Label>
              <Input
                id="title"
                value={editDialog.listing?.title || ''}
                onChange={(e) => setEditDialog(prev => ({
                  ...prev,
                  listing: { ...prev.listing, title: e.target.value }
                }))}
                maxLength={30}
                className="text-base"
              />
              <p className="text-xs text-muted-foreground text-right">
                {editDialog.listing?.title?.length || 0}/30
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="shortDescription" className="text-sm font-medium">Short Description (max 80 chars)</Label>
              <Textarea
                id="shortDescription"
                value={editDialog.listing?.shortDescription || ''}
                onChange={(e) => setEditDialog(prev => ({
                  ...prev,
                  listing: { ...prev.listing, shortDescription: e.target.value }
                }))}
                maxLength={80}
                rows={2}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {editDialog.listing?.shortDescription?.length || 0}/80
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullDescription" className="text-sm font-medium">Full Description (max 4000 chars)</Label>
              <Textarea
                id="fullDescription"
                value={editDialog.listing?.fullDescription || ''}
                onChange={(e) => setEditDialog(prev => ({
                  ...prev,
                  listing: { ...prev.listing, fullDescription: e.target.value }
                }))}
                maxLength={4000}
                rows={10}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {editDialog.listing?.fullDescription?.length || 0}/4000
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="video" className="text-sm font-medium">Video URL (YouTube)</Label>
              <Input
                id="video"
                value={editDialog.listing?.video || ''}
                onChange={(e) => setEditDialog(prev => ({
                  ...prev,
                  listing: { ...prev.listing, video: e.target.value }
                }))}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="p-6 pt-4 border-t border-border/50 bg-muted/20">
          <Button variant="ghost" onClick={() => setEditDialog({ open: false, locale: '', listing: null })}>
            Cancel
          </Button>
          <Button onClick={handleSaveEdit} className="gradient-primary border-0">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
