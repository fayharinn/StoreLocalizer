import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { MessageSquareText, RotateCcw, AlertTriangle, Check } from 'lucide-react'

// Per-field prompt editor. The user picks a field via the top tab bar,
// edits its prompt, then Save persists that field's override. Reset reverts
// only the currently-viewed field; Reset all reverts every field at once.
//
// Props:
//   fields:        Array<{ key, label }>
//   initialField:  which field to open on first render
//   getPrompt:     (field) => string  // current prompt for that field (override or default)
//   getDefault:    (field) => string  // the field's tailored default prompt
//   isCustom:      (field) => boolean
//   onSave:        (field, value) => void
//   onReset:       (field) => void    // revert one field
//   onResetAll:    () => void
export default function TranslationPromptDialog({
  open,
  fields,
  initialField,
  getPrompt,
  getDefault,
  isCustom,
  onSave,
  onReset,
  onResetAll,
  onClose,
  title = 'Translation prompts',
  description = 'One AI prompt per field. Saved across sessions.',
}) {
  const [activeField, setActiveField] = useState(initialField || fields[0]?.key)
  const [drafts, setDrafts] = useState(() => {
    const initial = {}
    for (const f of fields) initial[f.key] = getPrompt(f.key)
    return initial
  })
  const [justSavedField, setJustSavedField] = useState(null)

  const currentDraft = drafts[activeField] ?? ''
  const currentSaved = getPrompt(activeField)
  const fieldIsDirty = currentDraft !== currentSaved
  const fieldIsCustom = currentDraft !== getDefault(activeField)
  const fieldOriginallyCustom = isCustom(activeField)

  const updateDraft = (value) => {
    setDrafts(prev => ({ ...prev, [activeField]: value }))
  }

  const handleSave = () => {
    onSave(activeField, currentDraft)
    setJustSavedField(activeField)
    setTimeout(() => setJustSavedField(prev => (prev === activeField ? null : prev)), 1500)
  }

  const handleResetField = () => {
    onReset(activeField)
    setDrafts(prev => ({ ...prev, [activeField]: getDefault(activeField) }))
  }

  const handleResetAll = () => {
    onResetAll()
    const fresh = {}
    for (const f of fields) fresh[f.key] = getDefault(f.key)
    setDrafts(fresh)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareText className="h-5 w-5 text-muted-foreground" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Field tab bar */}
          <div className="flex flex-wrap gap-1.5 p-1 rounded-lg bg-muted/40 border border-border/50">
            {fields.map(f => {
              const active = f.key === activeField
              const customized = isCustom(f.key)
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setActiveField(f.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors
                    ${active
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/60'}`}
                >
                  {f.label}
                  {customized && <span className="h-1.5 w-1.5 rounded-full bg-foreground" />}
                </button>
              )
            })}
          </div>

          {/* Placeholder doc */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-amber-500 font-medium">Available placeholders</p>
              <p className="text-amber-500/80">
                <code className="bg-amber-500/20 px-1 rounded">{'{localeName}'}</code> — target language,
                {' '}<code className="bg-amber-500/20 px-1 rounded">{'{limit}'}</code> — char limit for this field,
                {' '}<code className="bg-amber-500/20 px-1 rounded">{'{fieldType}'}</code> — the current field key.
                Always keep the char-limit rule, or Apple will reject the translation.
              </p>
            </div>
          </div>

          {/* Active prompt editor */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="asc-prompt" className="text-sm font-semibold">
                System prompt — {fields.find(f => f.key === activeField)?.label}
              </Label>
              <div className="flex items-center gap-2">
                {fieldIsCustom && <Badge variant="secondary" className="text-[10px] h-4">customized</Badge>}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleResetField}
                  disabled={!fieldOriginallyCustom && !fieldIsDirty}
                  className="h-7 gap-1.5 px-2"
                  title="Revert this field to default"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset field
                </Button>
              </div>
            </div>
            <Textarea
              id="asc-prompt"
              value={currentDraft}
              onChange={(e) => updateDraft(e.target.value)}
              rows={14}
              className="font-mono text-xs leading-relaxed"
              placeholder="System prompt for this field..."
            />
            <p className="text-xs text-muted-foreground">{currentDraft.length} characters</p>
          </div>
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button variant="ghost" onClick={handleResetAll} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset all fields
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button onClick={handleSave} disabled={!fieldIsDirty && justSavedField !== activeField}>
              {justSavedField === activeField ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Saved
                </>
              ) : 'Save this field'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
