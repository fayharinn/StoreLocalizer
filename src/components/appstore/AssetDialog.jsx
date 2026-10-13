import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { ASSET_CATEGORIES, ASSET_STATE_LABELS, findSpec, formatSpecDimensions } from '@/services/appAssetLibraryService'
import MediaThumb from './MediaThumb'

const TIME_CODE = /^\d{2}:\d{2}:\d{2}:\d{2}$/

// Edit an asset's reference name and, for videos, the preview frame time code.
// The binary itself is immutable — replace the asset to change the picture.
export default function AssetDialog({ open, asset, refData, isSaving, onClose, onSave }) {
  const isVideo = asset.mediaType === 'VIDEO'
  const [referenceName, setReferenceName] = useState(asset.referenceName || '')
  const [timeCode, setTimeCode] = useState(asset.previewFrameTimeCode || '')
  const spec = findSpec(refData, asset.specId)
  const timeCodeValid = !timeCode || TIME_CODE.test(timeCode)

  const handleSave = () => {
    const attributes = {}
    if (referenceName !== (asset.referenceName || '')) attributes.referenceName = referenceName
    if (isVideo && timeCode && timeCode !== asset.previewFrameTimeCode) attributes.previewFrameTimeCode = timeCode
    if (Object.keys(attributes).length === 0) return onClose()
    onSave(asset, attributes)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isSaving && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Edit asset</DialogTitle>
          <DialogDescription className="truncate">{asset.fileName}</DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 py-2">
          <MediaThumb asset={asset} className="h-44" />
          <div className="flex-1 space-y-4">
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
              <dt className="text-muted-foreground">State</dt>
              <dd>{ASSET_STATE_LABELS[asset.state] || asset.state}</dd>
              <dt className="text-muted-foreground">Category</dt>
              <dd>{ASSET_CATEGORIES[asset.category] || asset.category || '—'}</dd>
              <dt className="text-muted-foreground">Matched spec</dt>
              <dd>{spec ? `${formatSpecDimensions(spec)} (${spec.shortName})` : '—'}</dd>
            </dl>
            {asset.stateDetails?.length > 0 && (
              <p className="text-xs text-red-500">{asset.stateDetails.map(d => d.description || d.code).join(' · ')}</p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="asset-ref-name">Reference name</Label>
              <Input
                id="asset-ref-name"
                value={referenceName}
                onChange={(e) => setReferenceName(e.target.value)}
                placeholder="Internal name, e.g. Onboarding · iPhone 6.9″"
              />
            </div>

            {isVideo && (
              <div className="space-y-1.5">
                <Label htmlFor="asset-timecode">Preview frame (HH:MM:SS:FF)</Label>
                <Input
                  id="asset-timecode"
                  value={timeCode}
                  onChange={(e) => setTimeCode(e.target.value)}
                  placeholder="00:00:05:00"
                  className={timeCodeValid ? '' : 'border-destructive'}
                />
                <p className="text-[11px] text-muted-foreground">
                  The still shown before playback, on every placement of this video.
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving || !timeCodeValid}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
