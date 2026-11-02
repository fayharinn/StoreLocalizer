import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Edit3, RefreshCw } from 'lucide-react'
import { GP_LOCALES } from '@/services/googlePlayService'

export default function ListingsCard({
  listings,
  isLoadingListings,
  loadListings,
  handleEditListing,
}) {
  return (
    <Card id="gp-listings" className="scroll-mt-6">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-base font-medium">Store listings</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              <span className="tabular-nums">{listings.length}</span> localized listing(s)
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => loadListings()} disabled={isLoadingListings}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingListings ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50">
                <TableHead className="w-[200px]">Language</TableHead>
                <TableHead className="w-[200px]">Title</TableHead>
                <TableHead>Short description</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listings.map(listing => {
                const localeInfo = GP_LOCALES.find(l => l.code === listing.language)
                return (
                  <TableRow key={listing.language} className="hover:bg-secondary/50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-base">{localeInfo?.flag || '🌐'}</span>
                        <span className="text-sm">{localeInfo?.name || listing.language}</span>
                        <span className="keycap">{listing.language}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{listing.title || '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-[300px]">
                      {listing.shortDescription || '-'}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleEditListing(listing)}>
                        <Edit3 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
