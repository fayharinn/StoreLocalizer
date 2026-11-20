import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { ASC_LOCALES } from '@/services/appStoreConnectService'
import { RETENTION_LOCALIZATION_LIMITS } from '@/services/appStoreRetentionMessagesService'

// Parent remounts via `key` for a fresh form; props are read once on init.
export default function RetentionLocalizationDialog({
  open,
  locale,
  localization,
  isSaving,
  existingLocales = [],
  onClose,
  onSave,
  onLocaleChange,
}) {
  const [form, setForm] = useState(() => ({
    header: localization?.header || '',
    body: localization?.body || '',
  }))

  const canPickLocale = !localization
  const isExistingLocale = canPickLocale && existingLocales.includes(locale)

  const availableLocales = useMemo(() => (
    canPickLocale
      ? ASC_LOCALES.filter(l => !existingLocales.includes(l.code) || l.code === locale)
      : ASC_LOCALES
  ), [canPickLocale, existingLocales, locale])

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }))
  const overLimit =
    form.header.length > RETENTION_LOCALIZATION_LIMITS.header ||
    form.body.length > RETENTION_LOCALIZATION_LIMITS.body
  const isValid = locale && form.header.trim() && form.body.trim() && !overLimit && !isExistingLocale

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isSaving && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{localization ? `Edit ${locale}` : 'Add language'}</DialogTitle>
          <DialogDescription>
            Shown to people who start to cancel the subscription. Don't mention prices, discounts or offers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {canPickLocale && (
            <div className="space-y-1.5">
              <Label>Language</Label>
              <Select value={locale} onValueChange={onLocaleChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableLocales.map(loc => (
                    <SelectItem key={loc.code} value={loc.code}>
                      {loc.flag} {loc.name} <span className="keycap">{loc.code}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isExistingLocale && (
                <p className="text-xs text-highlight-ink">This language already exists. Choose another.</p>
              )}
            </div>
          )}

          <CountedField
            id="retention-header"
            label="Header"
            value={form.header}
            onChange={(v) => update('header', v)}
            limit={RETENTION_LOCALIZATION_LIMITS.header}
          />
          <CountedField
            id="retention-body"
            label="Body"
            multiline
            value={form.body}
            onChange={(v) => update('body', v)}
            limit={RETENTION_LOCALIZATION_LIMITS.body}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={() => onSave(locale, { header: form.header.trim(), body: form.body.trim() })} disabled={isSaving || !isValid}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CountedField({ id, label, value, onChange, limit, multiline }) {
  const over = value.length > limit
  const Component = multiline ? Textarea : Input
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        <span className={`text-xs tabular-nums ${over ? 'text-destructive font-medium' : 'text-faint'}`}>
          {value.length}/{limit}
        </span>
      </div>
      <Component
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={multiline ? 3 : undefined}
        className={over ? 'border-destructive' : ''}
      />
    </div>
  )
}
