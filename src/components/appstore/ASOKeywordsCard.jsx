import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CheckCircle2, AlertCircle, Loader2, ChevronDown, Search, TrendingUp, Edit3, Plus, X, ArrowUpDown, Users, ClipboardCheck } from 'lucide-react'
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
  astroEnabled,
  astroSuggestions,
  onAstroSuggestionsClose,
  onApplyAstroSuggestions,
  handleGenerateASOKeywords,
  toggleAsoLocale,
  startEditingKeywords,
  cancelEditingKeywords,
  saveEditedKeywords,
  appCompeteEnabled,
  appCompeteLoadingFor,
  appCompetePicker,
  onCloseCompetitorPicker,
  onPickCompetitor,
  onLoadCompetitors,
  keywordReview,
  onCloseKeywordReview,
  onReviewKeywords,
  onTrackKeywords,
}) {
  return (
  <>
    <Card id="asc-aso-keywords" className="scroll-mt-44">
      <CardHeader className="pb-4">
        <div>
          <CardTitle className="text-base font-medium">ASO keywords</CardTitle>
          <CardDescription className="flex items-center gap-2 text-sm text-muted-foreground">
            Optimize the keywords of each locale
            {appCompeteEnabled && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 font-normal">AppCompete</Badge>
            )}
            {astroEnabled && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 font-normal">Astro</Badge>
            )}
            {!appCompeteEnabled && !astroEnabled && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 font-normal">AI</Badge>
            )}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/40 border border-border">
          <Search className="h-4 w-4 text-faint mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Keyword generation</p>
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
                className="rounded-lg border border-border overflow-hidden"
              >
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => toggleAsoLocale(loc.locale)}
                >
                  <span className="text-xl">{localeInfo?.flag || '🌐'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{localeInfo?.name || loc.locale}</span>
                      <span className="keycap">{loc.locale}</span>
                      {loc.keywords ? (
                        <Badge variant="outline" className="text-xs tabular-nums">
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
                      <span className={`text-xs font-mono tabular-nums ${charCount > 90 ? 'text-highlight-ink' : 'text-faint'}`}>
                        {charCount}/100
                      </span>
                    )}
                    <ChevronDown className={`h-4 w-4 text-faint transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-border bg-muted/20">
                    <div className="space-y-3">
                      {editingKeywordsFor === loc.locale ? (
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-medium text-muted-foreground">Edit keywords</Label>
                              <span className={`text-xs font-mono tabular-nums ${editedKeywords.length > 90 ? 'text-highlight-ink' : editedKeywords.length > 100 ? 'text-destructive' : 'text-faint'}`}>
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
                            <p className="text-xs text-faint">
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
                                  Saving
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-4 w-4 mr-2" />
                                  Save keywords
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
                            <Label className="text-xs font-medium text-muted-foreground">Current keywords</Label>
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
                              className="flex flex-wrap gap-1.5 p-3 rounded-lg bg-background/50 border border-border cursor-pointer hover:border-foreground/30 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation()
                                startEditingKeywords(loc.locale, loc.keywords)
                              }}
                            >
                              {loc.keywords.split(',').map((keyword, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 rounded-md bg-background border border-border text-xs font-medium hover:border-foreground/30 transition-colors"
                                >
                                  {keyword.trim()}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <div
                              className="p-4 rounded-lg bg-background/50 border border-dashed border-border cursor-pointer hover:border-foreground/30 transition-colors text-center"
                              onClick={(e) => {
                                e.stopPropagation()
                                startEditingKeywords(loc.locale, '')
                              }}
                            >
                              <p className="text-sm text-muted-foreground">No keywords set</p>
                              <p className="text-xs text-faint mt-1">Click to add keywords</p>
                            </div>
                          )}
                        </div>
                      )}

                      {editingKeywordsFor !== loc.locale && (
                        <>
                          <div className="flex flex-wrap gap-2 w-full">
                            {appCompeteEnabled && (
                              <>
                                <Button
                                  onClick={(e) => { e.stopPropagation(); handleGenerateASOKeywords(loc.locale, 'appcompete') }}
                                  disabled={isGenerating}
                                  variant="outline"
                                  size="sm"
                                  className="flex-1 h-9 min-w-[110px]"
                                >
                                  {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <TrendingUp className="h-3.5 w-3.5 mr-1.5" />}
                                  Suggest
                                </Button>
                                <Button
                                  onClick={(e) => { e.stopPropagation(); onLoadCompetitors(loc.locale) }}
                                  disabled={appCompeteLoadingFor === `${loc.locale}:competitors`}
                                  variant="outline"
                                  size="sm"
                                  className="flex-1 h-9 min-w-[110px]"
                                >
                                  {appCompeteLoadingFor === `${loc.locale}:competitors` ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Users className="h-3.5 w-3.5 mr-1.5" />}
                                  Competitors
                                </Button>
                                <Button
                                  onClick={(e) => { e.stopPropagation(); onReviewKeywords(loc.locale) }}
                                  disabled={appCompeteLoadingFor === `${loc.locale}:review` || !loc.keywords}
                                  variant="outline"
                                  size="sm"
                                  className="flex-1 h-9 min-w-[110px]"
                                >
                                  {appCompeteLoadingFor === `${loc.locale}:review` ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <ClipboardCheck className="h-3.5 w-3.5 mr-1.5" />}
                                  Review
                                </Button>
                              </>
                            )}
                            {astroEnabled && (
                              <Button
                                onClick={(e) => { e.stopPropagation(); handleGenerateASOKeywords(loc.locale, 'astro') }}
                                disabled={isGenerating}
                                variant="outline"
                                size="sm"
                                className="flex-1 h-9 min-w-[110px]"
                              >
                                {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <TrendingUp className="h-3.5 w-3.5 mr-1.5" />}
                                Astro
                              </Button>
                            )}
                            <Button
                              onClick={(e) => { e.stopPropagation(); handleGenerateASOKeywords(loc.locale, 'ai') }}
                              disabled={isGenerating || !currentAiApiKey}
                              variant="outline"
                              size="sm"
                              className={(astroEnabled || appCompeteEnabled) ? 'flex-1 h-9 min-w-[110px]' : 'w-full h-9'}
                            >
                              {isGenerating && !astroEnabled && !appCompeteEnabled && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                              Generate with AI
                            </Button>
                          </div>

                          {!currentAiApiKey && !astroEnabled && !appCompeteEnabled && (
                            <p className="text-xs text-highlight-ink flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Set an AI API key or AppCompete in the sidebar
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

      </CardContent>
    </Card>

    <AstroSuggestionsDialog
      astroSuggestions={astroSuggestions}
      onClose={onAstroSuggestionsClose}
      onApply={onApplyAstroSuggestions}
      isSaving={isSavingKeywords}
    />

    <CompetitorPickerDialog
      picker={appCompetePicker}
      onClose={onCloseCompetitorPicker}
      onPick={onPickCompetitor}
    />

    <KeywordReviewDialog
      review={keywordReview}
      onClose={onCloseKeywordReview}
      onTrack={onTrackKeywords}
    />
  </>
  )
}

export function CompetitorPickerDialog({ picker, onClose, onPick }) {
  if (!picker) return null
  return (
    <Dialog open={!!picker} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Pick a competitor</DialogTitle>
          <DialogDescription className="text-xs">
            Apps tracked on your AppCompete dashboard
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1 max-h-[50vh] overflow-y-auto">
          {picker.apps.map((app) => (
            <button
              key={app.appleId}
              onClick={() => onPick(app)}
              className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors text-left"
            >
              {app.icon ? (
                <img src={app.icon} alt="" className="h-8 w-8 rounded-lg" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-xs font-medium text-muted-foreground">
                  {app.name.charAt(0)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{app.name}</p>
                <p className="text-xs tabular-nums text-faint">
                  {app.keywordCount != null ? `${app.keywordCount} tracked keywords` : `Apple ID ${app.appleId}`}
                </p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

const VERDICT_STYLES = {
  great: { label: 'Great', className: 'bg-positive/10 text-positive' },
  ok: { label: 'OK', className: 'bg-secondary text-foreground' },
  weak: { label: 'Weak', className: 'bg-highlight/10 text-highlight-ink' },
  hard: { label: 'Hard', className: 'bg-destructive/10 text-destructive' },
  unknown: { label: 'Untracked', className: 'bg-muted text-muted-foreground' },
}

export function KeywordReviewDialog({ review, onClose, onTrack }) {
  const [isTracking, setIsTracking] = useState(false)
  if (!review) return null

  const untracked = review.items.filter(i => !i.tracked).map(i => i.keyword)
  const needAttention = review.items.filter(i => i.verdict === 'weak' || i.verdict === 'hard').length

  return (
    <Dialog open={!!review} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="text-base">Keyword review — {review.localeName}</DialogTitle>
          <DialogDescription className="text-xs">
            <span className="tabular-nums">{review.items.length}</span> keywords analyzed with AppCompete
            {needAttention > 0 && <span className="text-highlight-ink tabular-nums"> — {needAttention} need attention</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[55vh] overflow-y-auto -mx-1 px-1">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background z-10">
              <tr className="border-b border-border text-xs text-faint">
                <th className="py-2 text-left font-medium">Keyword</th>
                <th className="py-2 text-right font-medium w-12">Pos</th>
                <th className="py-2 text-right font-medium w-12">Pop</th>
                <th className="py-2 text-right font-medium w-12">Diff</th>
                <th className="py-2 text-left font-medium pl-3 w-24">Verdict</th>
              </tr>
            </thead>
            <tbody>
              {review.items.map((item) => {
                const v = VERDICT_STYLES[item.verdict] || VERDICT_STYLES.unknown
                return (
                  <tr key={item.keyword} className="border-b border-border align-top">
                    <td className="py-2">
                      <span className="font-medium">{item.keyword}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.advice}</p>
                    </td>
                    <td className="py-2 text-right tabular-nums">{item.position ?? '—'}</td>
                    <td className="py-2 text-right tabular-nums">{item.popularity ?? '—'}</td>
                    <td className="py-2 text-right tabular-nums">{item.difficulty ?? '—'}</td>
                    <td className="py-2 pl-3">
                      <span className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium ${v.className}`}>
                        {v.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <span className="text-xs tabular-nums text-faint">
            {untracked.length > 0 ? `${untracked.length} keyword(s) not tracked yet` : 'All keywords tracked'}
          </span>
          <div className="flex gap-2">
            {untracked.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                disabled={isTracking}
                onClick={async () => {
                  setIsTracking(true)
                  await onTrack(untracked)
                  setIsTracking(false)
                }}
              >
                {isTracking ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
                Track on AppCompete
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onClose}>Close</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function AstroSuggestionsDialog({ astroSuggestions, onClose, onApply, isSaving }) {
  const [selected, setSelected] = useState(new Set())
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('popularity')
  const [sortDir, setSortDir] = useState('desc')

  const suggestions = astroSuggestions?.suggestions || []
  const currentKeywords = astroSuggestions?.currentKeywords || ''

  const previewKeywords = useMemo(() => {
    if (!astroSuggestions) return ''
    const existing = currentKeywords ? currentKeywords.split(',').map(k => k.trim()).filter(Boolean) : []
    const merged = [...existing]
    for (const kw of suggestions.filter(s => selected.has(s.keyword)).map(s => s.keyword)) {
      if (!merged.some(m => m.toLowerCase() === kw.toLowerCase())) merged.push(kw)
    }
    return merged.join(',')
  }, [astroSuggestions, currentKeywords, selected, suggestions])

  const charsUsed = previewKeywords.length
  const charsLeft = 100 - charsUsed

  const wouldFit = (keyword) => {
    if (selected.has(keyword)) return true
    const cost = previewKeywords.length === 0 ? keyword.length : keyword.length + 1
    return charsUsed + cost <= 100
  }

  const filtered = useMemo(() => {
    let items = [...suggestions]
    if (search) {
      const q = search.toLowerCase()
      items = items.filter(s => s.keyword.toLowerCase().includes(q))
    }
    items.sort((a, b) => {
      const av = a[sortBy] ?? 0
      const bv = b[sortBy] ?? 0
      return sortDir === 'desc' ? bv - av : av - bv
    })
    return items
  }, [suggestions, search, sortBy, sortDir])

  const toggleKeyword = (keyword) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(keyword)) next.delete(keyword)
      else if (wouldFit(keyword)) next.add(keyword)
      return next
    })
  }

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const sortArrow = (col) => {
    if (sortBy !== col) return <ArrowUpDown className="h-3 w-3 text-faint" />
    return <ChevronDown className={`h-3 w-3 ${sortDir === 'asc' ? 'rotate-180' : ''}`} />
  }

  // Neutral steps: the strong value reads in foreground, weak ones fade; only hard difficulty is flagged
  const popColor = (v) => v >= 50 ? 'text-foreground' : v >= 20 ? 'text-muted-foreground' : 'text-faint'
  const diffColor = (v) => v <= 20 ? 'text-foreground' : v <= 50 ? 'text-muted-foreground' : 'text-highlight-ink'

  if (!astroSuggestions) return null

  const selectedKeywords = suggestions.filter(s => selected.has(s.keyword)).map(s => s.keyword)

  return (
    <Dialog open={!!astroSuggestions} onOpenChange={(open) => { if (!open) { setSelected(new Set()); setSearch(''); onClose() } }}>
      <DialogContent className="sm:max-w-[700px] gap-0 p-0 overflow-hidden">
        <DialogHeader className="p-5 pb-4 border-b border-border">
          <div>
            <DialogTitle className="text-base">{astroSuggestions.title || 'Astro suggestions'}</DialogTitle>
            <DialogDescription className="text-xs tabular-nums">{astroSuggestions.localeName} — {suggestions.length} keywords</DialogDescription>
          </div>
        </DialogHeader>

        <div className="px-5 pt-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs text-faint">Capacity</span>
            <div className="w-32 h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className={`h-full rounded-full transition-[width] ${charsLeft < 0 ? 'bg-destructive' : charsLeft < 15 ? 'bg-highlight' : 'bg-muted-foreground'}`}
                style={{ width: `${Math.min(100, (charsUsed / 100) * 100)}%` }}
              />
            </div>
          </div>
          <div className={`flex items-baseline gap-1 ${charsLeft < 0 ? 'text-destructive' : charsLeft < 15 ? 'text-highlight-ink' : 'text-muted-foreground'}`}>
            <span className="text-xl font-medium tabular-nums">{charsLeft}</span>
            <span className="text-xs">chars left</span>
          </div>
        </div>

        <div className="px-5 pt-3 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-faint" />
            <input
              type="text"
              placeholder="Filter keywords"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8 pl-9 pr-3 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        <div className="overflow-y-auto max-h-[50vh] px-5">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-background z-10">
              <tr className="border-b border-border">
                <th className="w-8 py-2 text-left" />
                <th className="py-2 text-left font-medium text-faint text-xs">Keyword</th>
                {[['popularity', 'Pop'], ['difficulty', 'Diff'], ['appsCount', 'Apps']].map(([col, label]) => (
                  <th key={col} className="py-2 text-right w-14">
                    <button onClick={() => handleSort(col)} className="inline-flex items-center gap-0.5 font-medium text-faint text-xs hover:text-foreground ml-auto">
                      {label} {sortArrow(col)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const isSelected = selected.has(s.keyword)
                const fits = wouldFit(s.keyword)
                const disabled = s.existing || (!isSelected && !fits)
                return (
                  <tr
                    key={s.keyword}
                    onClick={() => !disabled && toggleKeyword(s.keyword)}
                    className={`border-b border-border ${
                      disabled ? 'opacity-40 cursor-default' :
                      isSelected ? 'bg-muted/50 cursor-pointer' : 'hover:bg-muted/30 cursor-pointer'
                    }`}
                  >
                    <td className="py-1.5">
                      <div className={`flex h-4 w-4 items-center justify-center rounded border ${
                        s.existing ? 'bg-muted border-muted-foreground/20 text-muted-foreground' :
                        isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40'
                      }`}>
                        {(isSelected || s.existing) && (
                          <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </td>
                    <td className="py-1.5">
                      <span className="font-medium">{s.keyword}</span>
                      {s.existing && <span className="ml-1.5 text-xs text-faint">(added)</span>}
                      {!s.existing && !fits && !isSelected && <span className="ml-1.5 text-xs text-destructive">won't fit</span>}
                    </td>
                    <td className={`py-1.5 text-right tabular-nums font-medium ${s.popularity != null ? popColor(s.popularity) : 'text-faint'}`}>
                      {s.popularity ?? '—'}
                    </td>
                    <td className={`py-1.5 text-right tabular-nums font-medium ${s.difficulty != null ? diffColor(s.difficulty) : 'text-faint'}`}>
                      {s.difficulty ?? '—'}
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-muted-foreground">
                      {s.appsCount ?? '—'}
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">No match</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-border space-y-2">
          <div className={`text-xs rounded-lg px-3 py-2 break-all border font-mono ${
            charsLeft < 0 ? 'bg-destructive/10 border-destructive/30' : 'bg-muted/30 border-border'
          }`}>
            {previewKeywords || <span className="text-faint">No keywords yet</span>}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs tabular-nums text-faint">{selected.size} selected — {charsUsed}/100 chars</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setSelected(new Set()); setSearch(''); onClose() }}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => { onApply(selectedKeywords); setSelected(new Set()); setSearch('') }}
                disabled={selected.size === 0 || isSaving}
                variant="highlight"
              >
                {isSaving ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Saving</>
                ) : (
                  <>Apply keywords</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
