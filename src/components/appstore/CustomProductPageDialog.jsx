import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { ASC_LOCALES } from '@/services/appStoreConnectService'
import { CPP_PROMOTIONAL_TEXT_LIMIT } from '@/services/appStoreProductPagesService'

// Parent remounts via `key` for a fresh form; props are read once on init.
export default function CustomProductPageDialog({
  mode = 'create',
  open,
  page,
  latestVersion,
  deepLinkEditable = true,
  pages = [],
  selectedVersion,
  defaultLocale = 'en-US',
  isSubmitting,
  onClose,
  onSubmit,
}) {
  const [form, setForm] = useState(() => ({
    name: page?.name || '',
    visible: page?.visible ?? false,
    locale: defaultLocale,
    promotionalText: '',
    deepLink: latestVersion?.deepLink || '',
    template: selectedVersion ? `appStoreVersions:${selectedVersion.id}` : 'none',
  }))

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }))
  const promoOver = form.promotionalText.length > CPP_PROMOTIONAL_TEXT_LIMIT
  const deepLinkValid = !form.deepLink.trim() || /^[a-z][a-z0-9+.-]*:\/\/\S+$/i.test(form.deepLink.trim())
  const isValid = form.name.trim().length > 0 && !promoOver && deepLinkValid

  const handleSubmit = () => {
    if (mode === 'edit') {
      onSubmit({
        name: form.name.trim(),
        visible: form.visible,
        ...(deepLinkEditable ? { deepLink: form.deepLink.trim() } : {}),
      })
      return
    }
    const [type, id] = form.template === 'none' ? [] : form.template.split(':')
    onSubmit({
      name: form.name.trim(),
      locale: form.locale,
      promotionalText: form.promotionalText.trim(),
      deepLink: form.deepLink.trim(),
      template: type ? { type, id } : null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'New custom product page' : 'Edit custom product page'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'A variant of your product page with its own screenshots, previews and promotional text, reachable through its own URL for ads and campaigns.'
              : 'Rename the page, publish or hide it, and set where its deep link opens your app.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="cpp-name">Reference name *</Label>
            <Input
              id="cpp-name"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="e.g. Fall campaign — runners"
            />
          </div>

          {mode === 'create' ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>First locale</Label>
                  <Select value={form.locale} onValueChange={(v) => update('locale', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ASC_LOCALES.map(loc => (
                        <SelectItem key={loc.code} value={loc.code}>{loc.flag} {loc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Start from</Label>
                  <Select value={form.template} onValueChange={(v) => update('template', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Blank page</SelectItem>
                      {selectedVersion && (
                        <SelectItem value={`appStoreVersions:${selectedVersion.id}`}>
                          Version {selectedVersion.versionString} product page
                        </SelectItem>
                      )}
                      {pages.map(p => (
                        <SelectItem key={p.id} value={`appCustomProductPages:${p.id}`}>Copy of “{p.name}”</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="cpp-promo">Promotional text</Label>
                  <span className={`text-xs ${promoOver ? 'font-medium text-destructive' : 'text-muted-foreground'}`}>
                    {form.promotionalText.length}/{CPP_PROMOTIONAL_TEXT_LIMIT}
                  </span>
                </div>
                <Textarea
                  id="cpp-promo"
                  rows={3}
                  value={form.promotionalText}
                  onChange={(e) => update('promotionalText', e.target.value)}
                  className={promoOver ? 'border-destructive' : ''}
                  placeholder="The hook shown at the top of this page — you can AI-translate it afterwards"
                />
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
              <div>
                <p className="text-sm font-medium">Visible on the App Store</p>
                <p className="text-xs text-muted-foreground">Hidden pages keep their URL but aren't shown to users.</p>
              </div>
              <Switch checked={form.visible} onCheckedChange={(v) => update('visible', v)} />
            </div>
          )}

          {(mode === 'create' || deepLinkEditable) && (
            <div className="space-y-1.5">
              <Label htmlFor="cpp-deeplink">Deep link (optional)</Label>
              <Input
                id="cpp-deeplink"
                value={form.deepLink}
                onChange={(e) => update('deepLink', e.target.value)}
                placeholder="myapp://campaign/fall"
                className={deepLinkValid ? '' : 'border-destructive'}
              />
              <p className="text-[11px] text-muted-foreground">Where users who already have the app land when they open this page.</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !isValid}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'create' ? 'Create page' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
