import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { ASC_LOCALES } from '@/services/appStoreConnectService'
import { EVENT_LOCALIZATION_LIMITS } from '@/services/appStoreEventsService'

export default function EventLocalizationDialog({
  open,
  locale,
  localization,
  isSaving,
  primaryLocale,
  existingLocales = [],
  onClose,
  onSave,
  onLocaleChange,
}) {
  const [form, setForm] = useState(() => ({
    name: localization?.name || '',
    shortDescription: localization?.shortDescription || '',
    longDescription: localization?.longDescription || '',
  }))

  const isPrimary = locale === primaryLocale
  const isExistingLocale = existingLocales.includes(locale) && !localization
  const canPickLocale = !localization

  const availableLocales = useMemo(() => {
    if (!canPickLocale) return ASC_LOCALES
    return ASC_LOCALES.filter(l => !existingLocales.includes(l.code) || l.code === locale)
  }, [canPickLocale, existingLocales, locale])

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const counts = {
    name: form.name.length,
    shortDescription: form.shortDescription.length,
    longDescription: form.longDescription.length,
  }
  const overLimit = (
    counts.name > EVENT_LOCALIZATION_LIMITS.name ||
    counts.shortDescription > EVENT_LOCALIZATION_LIMITS.shortDescription ||
    counts.longDescription > EVENT_LOCALIZATION_LIMITS.longDescription
  )

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>
            {localization ? `Edit ${locale}` : 'Add localization'}
          </DialogTitle>
          <DialogDescription>
            {isPrimary
              ? 'Primary locale — the source content used when translating to other languages.'
              : 'Localized content shown on the App Store In-App Event card for this locale.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {canPickLocale && (
            <div className="space-y-1.5">
              <Label>Locale</Label>
              <Select value={locale} onValueChange={onLocaleChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableLocales.map(loc => (
                    <SelectItem key={loc.code} value={loc.code}>
                      {loc.flag} {loc.name} {loc.code === primaryLocale ? '(primary)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isExistingLocale && (
                <p className="text-xs text-amber-500">This locale already exists — choose another.</p>
              )}
            </div>
          )}

          <FieldWithCount
            id="event-name"
            label="Event name"
            value={form.name}
            onChange={(v) => update('name', v)}
            limit={EVENT_LOCALIZATION_LIMITS.name}
            count={counts.name}
          />

          <FieldWithCount
            id="event-short"
            label="Short description"
            multiline
            rows={2}
            value={form.shortDescription}
            onChange={(v) => update('shortDescription', v)}
            limit={EVENT_LOCALIZATION_LIMITS.shortDescription}
            count={counts.shortDescription}
          />

          <FieldWithCount
            id="event-long"
            label="Long description"
            multiline
            rows={4}
            value={form.longDescription}
            onChange={(v) => update('longDescription', v)}
            limit={EVENT_LOCALIZATION_LIMITS.longDescription}
            count={counts.longDescription}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button
            onClick={() => onSave(locale, form)}
            disabled={isSaving || overLimit || isExistingLocale || !form.name.trim()}
          >
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function FieldWithCount({ id, label, value, onChange, limit, count, multiline, rows = 3 }) {
  const over = count > limit
  const Component = multiline ? Textarea : Input
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        <span className={`text-xs ${over ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
          {count}/{limit}
        </span>
      </div>
      <Component
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={multiline ? rows : undefined}
        className={over ? 'border-destructive' : ''}
      />
    </div>
  )
}
