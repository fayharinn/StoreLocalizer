import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Languages, CheckCircle2, Globe, Loader2, Copy, Edit3 } from 'lucide-react'
import { ASC_LOCALES } from '@/services/appStoreConnectService'

export default function LocalizationsCard({
  selectedVersion,
  versionLocalizations,
  appInfoLocalizations,
  isLoadingLocalizations,
  localesNeedingCopy,
  hasPreviousVersion,
  isCopyingFromPrevious,
  handleCopyFromPreviousVersion,
  handleEditLocalization,
  isCopyingSupportUrl,
  handleCopySupportUrl,
  isCopyingMarketingUrl,
  handleCopyMarketingUrl,
  sourceLocale,
  hasAppInfoChanges,
  isSavingAppInfo,
  handleSaveAllAppInfo,
  editedFieldsCount,
  isTranslatingAppInfo,
  currentAiApiKey,
  appInfoProtectedWords,
  setAppInfoProtectedWords,
  handleTranslateAppInfo,
  handleAppInfoChange,
  getAppInfoValue,
  isFieldEdited,
  editedAppInfo,
}) {
  return (
    <Card id="asc-localizations" className="scroll-mt-44">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-medium">Current localizations</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              View and edit the localizations of v{selectedVersion.versionString}
            </CardDescription>
          </div>
          {hasPreviousVersion && (
            <Button
              onClick={handleCopyFromPreviousVersion}
              disabled={isCopyingFromPrevious}
              variant="outline"
              size="sm"
              className="h-9"
              title="Copy description, keywords, promo text, What's New and URLs from the previous version into every locale. Asks for confirmation before overwriting existing text."
            >
              {isCopyingFromPrevious ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Copying
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy all from previous{localesNeedingCopy.length > 0 ? ` (${localesNeedingCopy.length})` : ''}
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoadingLocalizations ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-3 text-faint" />
            <span>Loading localizations</span>
          </div>
        ) : versionLocalizations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Globe className="h-6 w-6 mb-3 text-faint" />
            <p className="font-medium">No localizations found</p>
            <p className="text-sm">Add translations using the section below</p>
          </div>
        ) : (
          <div className="space-y-6">
            {localesNeedingCopy.length > 0 && (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-highlight/10">
                <Copy className="h-4 w-4 text-highlight-ink shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-highlight-ink">
                    <span className="tabular-nums">{localesNeedingCopy.length}</span> locale(s) have empty fields (description, keywords, What's New…)
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Content from the previous version can fill them — use "Copy all from previous"
                  </p>
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium">Version content</h4>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopySupportUrl}
                    disabled={isCopyingSupportUrl || !versionLocalizations.find(l => l.locale === sourceLocale)?.supportUrl}
                    className="gap-2"
                    title={!versionLocalizations.find(l => l.locale === sourceLocale)?.supportUrl ? `Fill the support URL in the source locale (${sourceLocale}) first` : ""}
                  >
                    {isCopyingSupportUrl ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Copying
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy support URL to all
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyMarketingUrl}
                    disabled={isCopyingMarketingUrl || !versionLocalizations.find(l => l.locale === sourceLocale)?.marketingUrl}
                    className="gap-2"
                    title={!versionLocalizations.find(l => l.locale === sourceLocale)?.marketingUrl ? `Fill the marketing URL in the source locale (${sourceLocale}) first` : ""}
                  >
                    {isCopyingMarketingUrl ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Copying
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy marketing URL to all
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="w-[150px] font-medium">Locale</TableHead>
                      <TableHead className="font-medium">Description</TableHead>
                      <TableHead className="w-[120px] font-medium">What's New</TableHead>
                      <TableHead className="w-[100px] font-medium">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {versionLocalizations.map(loc => {
                      const localeInfo = ASC_LOCALES.find(l => l.code === loc.locale)
                      return (
                        <TableRow key={loc.id} className="group hover:bg-muted/20">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{localeInfo?.flag || '🌐'}</span>
                              <span className="font-medium text-sm">{localeInfo?.name || loc.locale}</span>
                              <span className="keycap">{loc.locale}</span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[300px]">
                            <span className="text-sm text-muted-foreground truncate block">
                              {loc.description ? loc.description.substring(0, 80) + '…' : <span className="text-faint">No description</span>}
                            </span>
                          </TableCell>
                          <TableCell>
                            {loc.whatsNew ? (
                              <div className="flex items-center gap-1.5 text-positive">
                                <CheckCircle2 className="h-4 w-4" />
                                <span className="text-xs font-medium">Added</span>
                              </div>
                            ) : (
                              <span className="text-xs text-faint">Empty</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditLocalization(loc, 'version')}
                              className="h-8 px-3 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                              Edit
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {appInfoLocalizations.localizations.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium">App info (name, subtitle, privacy policy URL)</h4>
                  <div className="flex items-center gap-2">
                    {hasAppInfoChanges && (
                      <Button
                        size="sm"
                        onClick={handleSaveAllAppInfo}
                        disabled={isSavingAppInfo}
                        variant="highlight"
                      >
                        {isSavingAppInfo ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Save all changes (<span className="tabular-nums">{editedFieldsCount}</span>)
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-3 p-3 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center gap-2 flex-1">
                    <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Protected words</Label>
                    <Input
                      placeholder="Chill, Pro, Plus"
                      value={appInfoProtectedWords}
                      onChange={(e) => setAppInfoProtectedWords(e.target.value)}
                      className="h-8 text-sm flex-1 max-w-[200px]"
                    />
                    <span className="text-xs text-faint">Won't be translated</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTranslateAppInfo()}
                    disabled={isTranslatingAppInfo || !currentAiApiKey}
                    className="gap-2"
                  >
                    {isTranslatingAppInfo === 'all' ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Translating
                      </>
                    ) : (
                      <>
                        <Languages className="h-4 w-4" />
                        Translate all
                      </>
                    )}
                  </Button>
                </div>

                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead className="w-[140px] font-medium">Locale</TableHead>
                        <TableHead className="w-[180px] font-medium">Name (30)</TableHead>
                        <TableHead className="w-[200px] font-medium">Subtitle (30)</TableHead>
                        <TableHead className="w-[180px] font-medium">Privacy URL</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {appInfoLocalizations.localizations.map(loc => {
                        const localeInfo = ASC_LOCALES.find(l => l.code === loc.locale)
                        const hasAnyEdit = editedAppInfo.hasOwnProperty(loc.id)
                        const isSource = loc.locale === sourceLocale
                        const isTranslatingThis = isTranslatingAppInfo === loc.locale
                        return (
                          <TableRow key={loc.id} className={hasAnyEdit ? 'bg-highlight/5' : 'hover:bg-muted/20'}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{localeInfo?.flag || '🌐'}</span>
                                <span className="font-medium text-sm">{localeInfo?.name || loc.locale}</span>
                                <span className="keycap">{loc.locale}</span>
                                {isSource && <Badge variant="secondary" className="text-xs px-1.5 py-0 font-normal">Source</Badge>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input
                                placeholder="App name"
                                value={getAppInfoValue(loc, 'name')}
                                onChange={(e) => handleAppInfoChange(loc.id, 'name', e.target.value)}
                                maxLength={30}
                                className={`text-sm h-9 ${isFieldEdited(loc.id, 'name') ? 'border-highlight/60 bg-highlight/5' : ''}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                placeholder="Subtitle"
                                value={getAppInfoValue(loc, 'subtitle')}
                                onChange={(e) => handleAppInfoChange(loc.id, 'subtitle', e.target.value)}
                                maxLength={30}
                                className={`text-sm h-9 ${isFieldEdited(loc.id, 'subtitle') ? 'border-highlight/60 bg-highlight/5' : ''}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="url"
                                placeholder="https://"
                                value={getAppInfoValue(loc, 'privacyPolicyUrl')}
                                onChange={(e) => handleAppInfoChange(loc.id, 'privacyPolicyUrl', e.target.value)}
                                className={`text-sm h-9 ${isFieldEdited(loc.id, 'privacyPolicyUrl') ? 'border-highlight/60 bg-highlight/5' : ''}`}
                              />
                            </TableCell>
                            <TableCell>
                              {!isSource && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleTranslateAppInfo(loc.locale)}
                                  disabled={isTranslatingAppInfo || !currentAiApiKey}
                                  className="h-8 w-8 p-0"
                                  title="Translate this locale"
                                >
                                  {isTranslatingThis ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Languages className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
