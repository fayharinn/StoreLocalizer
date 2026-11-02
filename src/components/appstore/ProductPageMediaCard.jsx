import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
    <Card id="asc-media" className="scroll-mt-44">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          Product page media
          <Badge variant="secondary" className="text-xs font-normal">Asset Library</Badge>
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Screenshots, app previews, and the iOS 27 header &amp; search results assets of version {selectedVersion.versionString}
        </CardDescription>
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
