import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { ASC_LOCALES } from '@/services/appStoreConnectService'
import { CPP_PROMOTIONAL_TEXT_LIMIT } from '@/services/appStoreProductPagesService'

// Add or edit one Custom Product Page locale (its only text field is the promotional text)
export default function PromotionalTextDialog({ open, locale, localization, existingLocales = [], isSaving, onClose, onSave, onLocaleChange }) {
  const [text, setText] = useState(localization?.promotionalText || '')
  const canPickLocale = !localization
  const isDuplicate = canPickLocale && existingLocales.includes(locale)
  const over = text.length > CPP_PROMOTIONAL_TEXT_LIMIT

  const availableLocales = useMemo(
    () => ASC_LOCALES.filter(l => !existingLocales.includes(l.code) || l.code === locale),
    [existingLocales, locale]
  )

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isSaving && onClose()}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{localization ? `Edit ${locale}` : 'Add locale'}</DialogTitle>
          <DialogDescription>
            Promotional text shown at the top of this custom product page. Media is managed below the locales.
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
                    <SelectItem key={loc.code} value={loc.code}>{loc.flag} {loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isDuplicate && <p className="text-xs text-amber-500">This locale already exists — choose another.</p>}
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="cpp-loc-promo">Promotional text</Label>
              <span className={`text-xs ${over ? 'font-medium text-destructive' : 'text-muted-foreground'}`}>
                {text.length}/{CPP_PROMOTIONAL_TEXT_LIMIT}
              </span>
            </div>
            <Textarea
              id="cpp-loc-promo"
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className={over ? 'border-destructive' : ''}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={() => onSave(locale, text.trim())} disabled={isSaving || over || isDuplicate}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
