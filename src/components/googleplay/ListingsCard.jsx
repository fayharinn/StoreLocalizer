import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Layers, Edit3, RefreshCw } from 'lucide-react'
import { GP_LOCALES } from '@/services/googlePlayService'

export default function ListingsCard({
  listings,
  isLoadingListings,
  loadListings,
  handleEditListing,
}) {
  return (
    <Card id="gp-listings" className="border-border/50 shadow-sm card-hover scroll-mt-6">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <Layers className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Store Listings</CardTitle>
              <CardDescription>{listings.length} localized listing(s)</CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => loadListings()} disabled={isLoadingListings}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingListings ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl border border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-[150px]">Language</TableHead>
                <TableHead className="w-[200px]">Title</TableHead>
                <TableHead>Short Description</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listings.map(listing => {
                const localeInfo = GP_LOCALES.find(l => l.code === listing.language)
                return (
                  <TableRow key={listing.language} className="hover:bg-muted/20">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{localeInfo?.flag || '🌐'}</span>
                        <span className="text-sm font-medium">{localeInfo?.name || listing.language}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{listing.title || '-'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-[300px]">
                      {listing.shortDescription || '-'}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleEditListing(listing)}>
                        <Edit3 className="h-4 w-4" />
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
