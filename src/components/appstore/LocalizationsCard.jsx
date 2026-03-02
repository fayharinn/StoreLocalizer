import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Layers, Sparkles, CheckCircle2, Globe, Loader2, Copy, Edit3, AppWindow } from 'lucide-react'
import { ASC_LOCALES } from '@/services/appStoreConnectService'

export default function LocalizationsCard({
  selectedVersion,
  versionLocalizations,
  appInfoLocalizations,
  isLoadingLocalizations,
  localesNeedingCopy,
  isCopyingFromPrevious,
  handleCopyFromPreviousVersion,
  handleEditLocalization,
  isCopyingSupportUrl,
  handleCopySupportUrl,
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
    <Card id="asc-localizations" className="border-border/50 shadow-sm scroll-mt-6">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <Layers className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Current Localizations</CardTitle>
              <CardDescription>
                View and edit existing localizations for v{selectedVersion.versionString}
              </CardDescription>
            </div>
          </div>
          {localesNeedingCopy.length > 0 && (
            <Button
              onClick={handleCopyFromPreviousVersion}
              disabled={isCopyingFromPrevious}
              variant="outline"
              size="sm"
              className="h-9"
            >
              {isCopyingFromPrevious ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Copying...
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy from Previous ({localesNeedingCopy.length})
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoadingLocalizations ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-3" />
            <span>Loading localizations...</span>
          </div>
        ) : versionLocalizations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Globe className="h-10 w-10 mb-3 opacity-30" />
            <p className="font-medium">No localizations found</p>
            <p className="text-sm">Add translations using the section below</p>
          </div>
        ) : (
          <div className="space-y-6">
            {localesNeedingCopy.length > 0 && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <Copy className="h-5 w-5 text-amber-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-500">
                    {localesNeedingCopy.length} locale(s) have empty What's New or Promo Text
                  </p>
                  <p className="text-xs text-amber-500/70 mt-0.5">
                    Content available from previous version can be copied
                  </p>
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  Version Content
                </h4>
                {versionLocalizations.find(l => l.locale === sourceLocale)?.supportUrl && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopySupportUrl}
                    disabled={isCopyingSupportUrl}
                    className="gap-2"
                  >
                    {isCopyingSupportUrl ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Copying...
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy Support URL to all
                      </>
                    )}
                  </Button>
                )}
              </div>
              <div className="rounded-xl border border-border/50 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="w-[150px] font-semibold">Locale</TableHead>
                      <TableHead className="font-semibold">Description</TableHead>
                      <TableHead className="w-[120px] font-semibold">What's New</TableHead>
                      <TableHead className="w-[100px] font-semibold">Actions</TableHead>
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
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[300px]">
                            <span className="text-sm text-muted-foreground truncate block">
                              {loc.description ? loc.description.substring(0, 80) + '...' : <span className="italic text-muted-foreground/50">No description</span>}
                            </span>
                          </TableCell>
                          <TableCell>
                            {loc.whatsNew ? (
                              <div className="flex items-center gap-1.5 text-emerald-500">
                                <CheckCircle2 className="h-4 w-4" />
                                <span className="text-xs font-medium">Added</span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground/50 italic">Empty</span>
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
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <AppWindow className="h-4 w-4 text-muted-foreground" />
                    App Info (Name, Subtitle, Privacy Policy URL)
                  </h4>
                  <div className="flex items-center gap-2">
                    {hasAppInfoChanges && (
                      <Button
                        size="sm"
                        onClick={handleSaveAllAppInfo}
                        disabled={isSavingAppInfo}
                        className="gradient-primary border-0"
                      >
                        {isSavingAppInfo ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Save All Changes ({editedFieldsCount})
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-2 flex-1">
                    <Label className="text-xs font-medium text-muted-foreground whitespace-nowrap">Protected words:</Label>
                    <Input
                      placeholder="Chill, Pro, Plus..."
                      value={appInfoProtectedWords}
                      onChange={(e) => setAppInfoProtectedWords(e.target.value)}
                      className="h-8 text-sm flex-1 max-w-[200px]"
                    />
                    <span className="text-xs text-muted-foreground">Won't be translated</span>
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
                        Translating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Translate All
                      </>
                    )}
                  </Button>
                </div>

                <div className="rounded-xl border border-border/50 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead className="w-[140px] font-semibold">Locale</TableHead>
                        <TableHead className="w-[180px] font-semibold">Name (30)</TableHead>
                        <TableHead className="w-[200px] font-semibold">Subtitle (30)</TableHead>
                        <TableHead className="w-[180px] font-semibold">Privacy URL</TableHead>
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
                          <TableRow key={loc.id} className={hasAnyEdit ? 'bg-amber-500/5' : 'hover:bg-muted/20'}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{localeInfo?.flag || '🌐'}</span>
                                <span className="font-medium text-sm">{localeInfo?.name || loc.locale}</span>
                                {isSource && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Source</Badge>}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input
                                placeholder="App Name"
                                value={getAppInfoValue(loc, 'name')}
                                onChange={(e) => handleAppInfoChange(loc.id, 'name', e.target.value)}
                                maxLength={30}
                                className={`text-sm h-9 ${isFieldEdited(loc.id, 'name') ? 'border-amber-500 bg-amber-500/5' : ''}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                placeholder="Subtitle"
                                value={getAppInfoValue(loc, 'subtitle')}
                                onChange={(e) => handleAppInfoChange(loc.id, 'subtitle', e.target.value)}
                                maxLength={30}
                                className={`text-sm h-9 ${isFieldEdited(loc.id, 'subtitle') ? 'border-amber-500 bg-amber-500/5' : ''}`}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="url"
                                placeholder="https://..."
                                value={getAppInfoValue(loc, 'privacyPolicyUrl')}
                                onChange={(e) => handleAppInfoChange(loc.id, 'privacyPolicyUrl', e.target.value)}
                                className={`text-sm h-9 ${isFieldEdited(loc.id, 'privacyPolicyUrl') ? 'border-amber-500 bg-amber-500/5' : ''}`}
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
                                    <Sparkles className="h-4 w-4" />
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
