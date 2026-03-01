import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

export default function FullscreenImageViewer({ fullscreenImage, setFullscreenImage }) {
  if (!fullscreenImage) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center cursor-pointer"
      onClick={() => setFullscreenImage(null)}
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 text-white hover:bg-white/20"
        onClick={() => setFullscreenImage(null)}
      >
        <X className="h-6 w-6" />
      </Button>
      <img
        src={fullscreenImage}
        alt="Full size screenshot"
        className="max-w-[90vw] max-h-[90vh] object-contain"
        crossOrigin="anonymous"
        referrerPolicy="no-referrer"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}
