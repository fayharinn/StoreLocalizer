import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Sparkles, CheckCircle2, AlertCircle, Loader2, ChevronDown, Search, TrendingUp, Edit3 } from 'lucide-react'
import { ASC_LOCALES } from '@/services/appStoreConnectService'

export default function ASOKeywordsCard({
  versionLocalizations,
  generatingKeywordsFor,
  asoExpandedLocales,
  editingKeywordsFor,
  editedKeywords,
  setEditedKeywords,
  isSavingKeywords,
  currentAiApiKey,
  handleGenerateASOKeywords,
  toggleAsoLocale,
  startEditingKeywords,
  cancelEditingKeywords,
  saveEditedKeywords,
}) {
  return (
    <Card id="asc-aso-keywords" className="border-border/50 shadow-sm scroll-mt-6">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg">ASO Keywords</CardTitle>
            <CardDescription>Optimize keywords for each locale using AI</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20">
          <Search className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Smart Keyword Generation</p>
            <p className="text-xs text-muted-foreground mt-1">
              Generate optimized, country-specific keywords based on your app description.
              Keywords are tailored for each market, not just translated.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {versionLocalizations.map(loc => {
            const localeInfo = ASC_LOCALES.find(l => l.code === loc.locale)
            const isExpanded = asoExpandedLocales.includes(loc.locale)
            const isGenerating = generatingKeywordsFor === loc.locale
            const keywordCount = loc.keywords ? loc.keywords.split(',').length : 0
            const charCount = loc.keywords?.length || 0

            return (
              <div
                key={loc.id}
                className="rounded-xl border border-border/50 overflow-hidden transition-all duration-200 hover:border-border"
              >
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => toggleAsoLocale(loc.locale)}
                >
                  <span className="text-xl">{localeInfo?.flag || '🌐'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{localeInfo?.name || loc.locale}</span>
                      {loc.keywords ? (
                        <Badge variant="outline" className="text-xs">
                          {keywordCount} keywords
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs text-muted-foreground">
                          No keywords
                        </Badge>
                      )}
                    </div>
                    {loc.keywords && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {loc.keywords}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {loc.keywords && (
                      <span className={`text-xs font-mono ${charCount > 90 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                        {charCount}/100
                      </span>
                    )}
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-border/50 bg-muted/20">
                    <div className="space-y-3">
                      {editingKeywordsFor === loc.locale ? (
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-medium text-muted-foreground">Edit Keywords</Label>
                              <span className={`text-xs font-mono ${editedKeywords.length > 90 ? 'text-amber-500' : editedKeywords.length > 100 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                {editedKeywords.length}/100
                              </span>
                            </div>
                            <Textarea
                              value={editedKeywords}
                              onChange={(e) => setEditedKeywords(e.target.value)}
                              placeholder="keyword1,keyword2,keyword3"
                              className="min-h-[80px] text-sm font-mono resize-none"
                              maxLength={100}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <p className="text-xs text-muted-foreground">
                              Separate keywords with commas. No spaces after commas.
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                saveEditedKeywords(loc.locale)
                              }}
                              disabled={isSavingKeywords || editedKeywords.length > 100}
                              size="sm"
                              className="flex-1 h-9"
                            >
                              {isSavingKeywords ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Save Keywords
                                </>
                              )}
                            </Button>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                cancelEditingKeywords()
                              }}
                              variant="outline"
                              size="sm"
                              className="h-9"
                              disabled={isSavingKeywords}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-medium text-muted-foreground">Current Keywords</Label>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                startEditingKeywords(loc.locale, loc.keywords)
                              }}
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                            >
                              <Edit3 className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                          </div>
                          {loc.keywords ? (
                            <div
                              className="flex flex-wrap gap-1.5 p-3 rounded-lg bg-background/50 border border-border/30 cursor-pointer hover:border-primary/30 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation()
                                startEditingKeywords(loc.locale, loc.keywords)
                              }}
                            >
                              {loc.keywords.split(',').map((keyword, idx) => (
                                <span
                                  key={idx}
                                  className="px-2.5 py-1 rounded-lg bg-background border border-border/50 text-xs font-medium hover:border-primary/50 hover:bg-primary/5 transition-colors"
                                >
                                  {keyword.trim()}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div
                              className="p-4 rounded-lg bg-background/50 border border-dashed border-border/50 cursor-pointer hover:border-primary/30 transition-colors text-center"
                              onClick={(e) => {
                                e.stopPropagation()
                                startEditingKeywords(loc.locale, '')
                              }}
                            >
                              <p className="text-sm text-muted-foreground">No keywords set</p>
                              <p className="text-xs text-muted-foreground/70 mt-1">Click to add keywords</p>
                            </div>
                          )}
                        </div>
                      )}

                      {editingKeywordsFor !== loc.locale && (
                        <>
                          <Button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleGenerateASOKeywords(loc.locale)
                            }}
                            disabled={isGenerating || !currentAiApiKey}
                            variant="outline"
                            size="sm"
                            className="w-full h-9"
                          >
                            {isGenerating ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Generating optimized keywords...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-4 w-4 mr-2" />
                                {loc.keywords ? 'AI Regenerate Keywords' : 'AI Generate Keywords'}
                              </>
                            )}
                          </Button>

                          {!currentAiApiKey && (
                            <p className="text-xs text-amber-500 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Configure AI API key in sidebar
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="pt-2">
          <Button
            onClick={async () => {
              for (const loc of versionLocalizations) {
                await handleGenerateASOKeywords(loc.locale)
              }
            }}
            disabled={generatingKeywordsFor !== null || !currentAiApiKey}
            className="w-full h-11 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 border-0"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Generate Keywords for All Locales ({versionLocalizations.length})
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
