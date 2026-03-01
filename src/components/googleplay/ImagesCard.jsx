import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Image, Loader2, RefreshCw, Upload, Trash2 } from 'lucide-react'
import { GP_LOCALES, GP_IMAGE_TYPES } from '@/services/googlePlayService'

export default function ImagesCard({
  existingLocales,
  selectedImageLocale,
  setSelectedImageLocale,
  selectedImageType,
  setSelectedImageType,
  images,
  setImages,
  isLoadingImages,
  isUploadingImage,
  loadImages,
  handleImageUpload,
  handleDeleteImage,
  handleDeleteAllImages,
  setFullscreenImage,
}) {
  return (
    <Card id="gp-images" className="border-border/50 shadow-sm card-hover scroll-mt-6">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/10">
            <Image className="h-5 w-5 text-pink-500" />
          </div>
          <div>
            <CardTitle className="text-lg">Screenshots & Graphics</CardTitle>
            <CardDescription>Manage images for your store listing</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Language</Label>
            <Select
              value={selectedImageLocale}
              onValueChange={(val) => {
                setSelectedImageLocale(val)
                setImages([])
              }}
            >
              <SelectTrigger className="h-9 min-w-[180px]">
                <SelectValue placeholder="Select language..." />
              </SelectTrigger>
              <SelectContent>
                {existingLocales.map(locale => {
                  const info = GP_LOCALES.find(l => l.code === locale)
                  return (
                    <SelectItem key={locale} value={locale}>
                      {info?.flag} {info?.name || locale}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Image Type</Label>
            <Select
              value={selectedImageType}
              onValueChange={(val) => {
                setSelectedImageType(val)
                setImages([])
              }}
            >
              <SelectTrigger className="h-9 min-w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(GP_IMAGE_TYPES).map(([key, info]) => (
                  <SelectItem key={key} value={key}>
                    {info.name} (max {info.max})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadImages}
              disabled={!selectedImageLocale || isLoadingImages}
            >
              {isLoadingImages ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-2">Load</span>
            </Button>
          </div>
        </div>

        {selectedImageLocale && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {images.length} image{images.length !== 1 ? 's' : ''} loaded
              </span>
              <div className="flex gap-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={isUploadingImage || images.length >= (GP_IMAGE_TYPES[selectedImageType]?.max || 8)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isUploadingImage || images.length >= (GP_IMAGE_TYPES[selectedImageType]?.max || 8)}
                    asChild
                  >
                    <span>
                      {isUploadingImage ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                      Upload
                    </span>
                  </Button>
                </label>
                {images.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteAllImages}
                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete All
                  </Button>
                )}
              </div>
            </div>

            {images.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {images.map((img) => (
                  <div key={img.id} className="relative group rounded-lg border border-border/50 overflow-hidden bg-muted/20">
                    <img
                      src={img.url}
                      alt={`Screenshot ${img.id}`}
                      className="max-h-64 w-auto cursor-pointer hover:opacity-80 transition-opacity"
                      crossOrigin="anonymous"
                      referrerPolicy="no-referrer"
                      onClick={() => setFullscreenImage(img.url)}
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDeleteImage(img.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground border border-dashed border-border/50 rounded-lg">
                <Image className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No images loaded</p>
                <p className="text-xs">Select a language and click Load</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
