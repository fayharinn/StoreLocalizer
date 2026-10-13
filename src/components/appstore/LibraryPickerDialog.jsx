import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Library, Loader2 } from 'lucide-react'
import { ASSET_STATE_LABELS, assetDimensions, findSpec, formatSpecDimensions } from '@/services/appAssetLibraryService'
import MediaThumb from './MediaThumb'

// Pick already-uploaded library assets to place in one slot. Selection order = display order.
export default function LibraryPickerDialog({ open, assets, refData, slotLabel, localeLabel, maxSelectable, isBusy, onClose, onConfirm }) {
  const [selectedIds, setSelectedIds] = useState([])

  const toggle = (id) => setSelectedIds(prev => {
    if (prev.includes(id)) return prev.filter(x => x !== id)
    if (maxSelectable != null && prev.length >= maxSelectable) return prev
    return [...prev, id]
  })

  const handleConfirm = async () => {
    const chosen = selectedIds.map(id => assets.find(a => a.id === id)).filter(Boolean)
    await onConfirm(chosen)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isBusy && onClose()}>
      <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Library className="h-5 w-5" />
            Add from Asset Library
          </DialogTitle>
          <DialogDescription>
            {slotLabel} · {localeLabel}. Only assets whose category and size fit this slot are listed.
            {maxSelectable != null && ` Up to ${maxSelectable} more can be placed.`}
          </DialogDescription>
        </DialogHeader>

        {assets.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No compatible assets yet — upload them in the Asset Library section, or drop a folder below the locales.
          </div>
        ) : (
          <ScrollArea className="h-[420px] rounded-lg border border-border/50 p-3">
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {assets.map(asset => {
                const order = selectedIds.indexOf(asset.id)
                const dims = assetDimensions(asset)
                const size = dims ? `${dims.width}×${dims.height}` : formatSpecDimensions(findSpec(refData, asset.specId))
                return (
                  <div key={asset.id} className="min-w-0 space-y-1">
                    <div className="relative">
                      <MediaThumb
                        asset={asset}
                        className="h-40 w-full"
                        fill
                        selected={order >= 0}
                        onClick={() => toggle(asset.id)}
                      />
                      {order >= 0 && (
                        <span className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                          {order + 1}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-xs font-medium">{asset.referenceName || asset.fileName}</p>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="h-4 px-1 text-[10px]">{ASSET_STATE_LABELS[asset.state] || asset.state}</Badge>
                      {size && <span className="text-[10px] text-muted-foreground">{size}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isBusy}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={isBusy || selectedIds.length === 0}>
            {isBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Place {selectedIds.length || ''} asset{selectedIds.length === 1 ? '' : 's'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
