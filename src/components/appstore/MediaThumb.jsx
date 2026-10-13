import { Image, Film, Play, Loader2, AlertCircle } from 'lucide-react'
import {
  assetThumbnailUrl,
  assetDimensions,
  isAssetProcessing,
  isAssetIncomplete,
} from '@/services/appAssetLibraryService'

const PORTRAIT_RATIO = 9 / 19

// Thumbnail for an Asset Library image or video (videos show their preview frame).
// The media is letterboxed inside the tile, so portrait screenshots and wide
// header assets never overflow. `fill` tiles take the size given by className
// (grids); otherwise the tile takes the media's aspect ratio from its height,
// capped in width (strips).
export default function MediaThumb({ asset, className = 'h-32', fill = false, onClick, selected = false }) {
  const dims = assetDimensions(asset)
  const ratio = dims ? dims.width / dims.height : PORTRAIT_RATIO
  // Request a size that matches the orientation so wide assets stay sharp
  const url = ratio > 1
    ? assetThumbnailUrl(asset, 640, Math.round(640 / ratio))
    : assetThumbnailUrl(asset, Math.round(600 * ratio), 600)
  const isVideo = asset?.mediaType === 'VIDEO'
  const processing = isAssetProcessing(asset)
  const incomplete = isAssetIncomplete(asset)
  const failed = asset?.state === 'FAILED'
  const Placeholder = isVideo ? Film : Image

  return (
    <div
      onClick={onClick}
      style={fill ? undefined : { aspectRatio: ratio }}
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/40 ${fill ? '' : 'max-w-[20rem]'} ${className}
        ${onClick ? 'cursor-pointer transition-all hover:border-primary/50' : ''}
        ${selected ? 'border-primary ring-2 ring-primary/40' : 'border-border/50'}`}
    >
      {url ? (
        <img
          src={url}
          alt={asset.referenceName || asset.fileName}
          className="max-h-full max-w-full object-contain"
          loading="lazy"
        />
      ) : (
        <Placeholder className="h-6 w-6 text-muted-foreground/50" />
      )}
      {isVideo && url && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="rounded-full bg-black/55 p-1.5">
            <Play className="h-3.5 w-3.5 fill-white text-white" />
          </span>
        </div>
      )}
      {(processing || failed || incomplete) && (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/60 py-0.5 text-[10px] text-white">
          {processing ? <Loader2 className="h-3 w-3 animate-spin" /> : <AlertCircle className={`h-3 w-3 ${failed ? 'text-red-300' : ''}`} />}
          {processing ? 'Processing' : failed ? 'Failed' : 'Upload not finished'}
        </div>
      )}
    </div>
  )
}
