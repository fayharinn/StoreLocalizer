import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Images } from 'lucide-react'
import LocalizedMediaPanel from './LocalizedMediaPanel'

// Placements can only be added while the version hasn't been approved
const EDITABLE_VERSION_STATES = [
  'PREPARE_FOR_SUBMISSION',
  'READY_FOR_REVIEW',
  'DEVELOPER_REJECTED',
  'REJECTED',
  'METADATA_REJECTED',
  'INVALID_BINARY',
]

export default function ProductPageMediaCard({ selectedVersion, versionLocalizations, media, library, onPreview }) {
  const editable = !selectedVersion?.state || EDITABLE_VERSION_STATES.includes(selectedVersion.state)

  return (
    <Card id="asc-media" className="scroll-mt-6 border-border/50 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg">
            <Images className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              Product Page Media
              <Badge variant="secondary" className="text-[10px]">Asset Library</Badge>
            </CardTitle>
            <CardDescription>
              Screenshots, app previews, and the iOS 27 header &amp; search results assets of version {selectedVersion.versionString}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <LocalizedMediaPanel
          media={media}
          library={library}
          localizations={versionLocalizations}
          readOnly={!editable}
          readOnlyReason={`Version ${selectedVersion.versionString} is ${selectedVersion.state?.toLowerCase().replace(/_/g, ' ')} — create a new version to change its media.`}
          onPreview={onPreview}
          dropHint="Folder with one subfolder per locale (/en-US, /fr-FR…). Locales must already exist on this version."
        />
      </CardContent>
    </Card>
  )
}
