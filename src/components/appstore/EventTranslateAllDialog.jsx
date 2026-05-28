import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Loader2, MessageSquareText } from 'lucide-react'
import { ASC_LOCALES } from '@/services/appStoreConnectService'
import { EVENT_LOCALIZATION_LIMITS } from '@/services/appStoreEventsService'

export default function EventTranslateAllDialog({
  open,
  primaryLocale,
  existingLocales = [],
  isTranslating,
  translationProgress,
  promptIsCustom,
  onEditPrompt,
  onClose,
  onTranslate,
}) {
  // Default selection: every ASC locale that isn't the primary and isn't already present.
  const initialSelection = useMemo(() => (
    ASC_LOCALES
      .map(l => l.code)
      .filter(code => code !== primaryLocale && !existingLocales.includes(code))
  ), [primaryLocale, existingLocales])

  const [selected, setSelected] = useState(initialSelection)

  const targets = useMemo(
    () => ASC_LOCALES.filter(l => l.code !== primaryLocale),
    [primaryLocale]
  )

  const toggle = (code) => {
    setSelected(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code])
  }

  const handleTranslate = async () => {
    if (selected.length === 0) return
    const ok = await onTranslate(selected)
    if (ok !== false) onClose()
  }

  const missingCount = initialSelection.length
  const overwriteCount = selected.filter(c => existingLocales.includes(c)).length

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isTranslating && onClose()}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md gradient-primary">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            AI-translate event to other languages
          </DialogTitle>
          <DialogDescription>
            AI-translates the primary locale ({primaryLocale}) into every selected language and saves each
            localization to App Store Connect. Char limits are enforced strictly
            ({EVENT_LOCALIZATION_LIMITS.name}/{EVENT_LOCALIZATION_LIMITS.shortDescription}/{EVENT_LOCALIZATION_LIMITS.longDescription}).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Prompt status row — pushes user to the dedicated prompt editor */}
          <button
            type="button"
            onClick={onEditPrompt}
            className="flex w-full items-center justify-between gap-3 rounded-lg border border-border/50 px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              <MessageSquareText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Translation prompt</span>
              {promptIsCustom && <Badge variant="secondary" className="text-[10px] h-4">customized</Badge>}
            </div>
            <span className="text-xs text-muted-foreground">Edit →</span>
          </button>

          {/* Locale picker */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Target languages</Label>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => setSelected(targets.map(l => l.code))}>
                  All ({targets.length})
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelected(initialSelection)} disabled={missingCount === 0}>
                  Missing only ({missingCount})
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelected([])}>None</Button>
              </div>
            </div>
            <ScrollArea className="h-56 rounded-lg border border-border/50 bg-background p-2">
              <div className="grid grid-cols-2 gap-1.5">
                {targets.map(loc => {
                  const alreadyPresent = existingLocales.includes(loc.code)
                  return (
                    <label
                      key={loc.code}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted cursor-pointer text-sm"
                    >
                      <Checkbox
                        checked={selected.includes(loc.code)}
                        onCheckedChange={() => toggle(loc.code)}
                      />
                      <span>{loc.flag}</span>
                      <span className="truncate flex-1">{loc.name}</span>
                      {alreadyPresent && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 shrink-0">
                          overwrite
                        </Badge>
                      )}
                    </label>
                  )
                })}
              </div>
            </ScrollArea>
            <p className="text-xs text-muted-foreground">
              {selected.length} selected{overwriteCount > 0 ? ` · ${overwriteCount} will overwrite existing` : ''}
            </p>
          </div>

          {/* Progress */}
          {isTranslating && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/60 border border-border/50">
              <Loader2 className="h-4 w-4 animate-spin text-foreground/70 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground font-medium">
                  {translationProgress.current}/{translationProgress.total} — {translationProgress.locale}
                </p>
                <div className="mt-1.5 h-1 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full gradient-primary transition-all"
                    style={{ width: `${(translationProgress.current / Math.max(1, translationProgress.total)) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isTranslating}>
            {isTranslating ? 'Translating...' : 'Cancel'}
          </Button>
          <Button
            onClick={handleTranslate}
            disabled={selected.length === 0 || isTranslating}
            className="gradient-primary text-white border-0 hover:opacity-90"
          >
            {isTranslating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Sparkles className="h-4 w-4 mr-2" />
            Translate {selected.length} language{selected.length === 1 ? '' : 's'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
