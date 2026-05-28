import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { ASC_LOCALES } from '@/services/appStoreConnectService'
import { EVENT_BADGES, EVENT_PRIORITIES, EVENT_PURPOSES } from '@/services/appStoreEventsService'

const DEFAULTS = {
  referenceName: '',
  badge: 'SPECIAL_EVENT',
  primaryLocale: 'en-US',
  priority: 'NORMAL',
  purpose: 'APPROPRIATE_FOR_ALL_USERS',
  deepLink: '',
  purchaseRequirement: '',
}

// Parent remounts via `key` whenever it wants a fresh form; we read props once on init.
export default function EventDialog({ mode = 'create', open, event, isSubmitting, onClose, onSubmit }) {
  const [form, setForm] = useState(() => {
    if (mode === 'edit' && event) {
      return {
        referenceName: event.referenceName || '',
        badge: event.badge || 'SPECIAL_EVENT',
        primaryLocale: event.primaryLocale || 'en-US',
        priority: event.priority || 'NORMAL',
        purpose: event.purpose || 'APPROPRIATE_FOR_ALL_USERS',
        deepLink: event.deepLink || '',
        purchaseRequirement: event.purchaseRequirement || '',
      }
    }
    return DEFAULTS
  })

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const handleSubmit = () => {
    const attributes = { ...form }
    // referenceName + primaryLocale are immutable after creation
    if (mode === 'edit') {
      delete attributes.referenceName
      delete attributes.primaryLocale
    }
    onSubmit(attributes)
  }

  const isValid = form.referenceName.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create In-App Event' : 'Edit event'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Reference name and primary locale cannot be changed later. Localized name, descriptions, schedule, and images are added afterwards.'
              : 'Update event-level attributes. Reference name and primary locale are read-only.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="referenceName">Reference name *</Label>
            <Input
              id="referenceName"
              value={form.referenceName}
              onChange={(e) => update('referenceName', e.target.value)}
              placeholder="Internal name (not shown to users)"
              disabled={mode === 'edit'}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Primary locale</Label>
              <Select
                value={form.primaryLocale}
                onValueChange={(v) => update('primaryLocale', v)}
                disabled={mode === 'edit'}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASC_LOCALES.map(loc => (
                    <SelectItem key={loc.code} value={loc.code}>
                      {loc.flag} {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Badge</Label>
              <Select value={form.badge} onValueChange={(v) => update('badge', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENT_BADGES.map(b => (
                    <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => update('priority', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENT_PRIORITIES.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Purpose</Label>
              <Select value={form.purpose} onValueChange={(v) => update('purpose', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENT_PURPOSES.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deepLink">Deep link (optional)</Label>
            <Input
              id="deepLink"
              value={form.deepLink}
              onChange={(e) => update('deepLink', e.target.value)}
              placeholder="myapp://events/promo"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="purchaseRequirement">Purchase requirement (optional)</Label>
            <Input
              id="purchaseRequirement"
              value={form.purchaseRequirement}
              onChange={(e) => update('purchaseRequirement', e.target.value)}
              placeholder="e.g. requires Pro subscription"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!isValid || isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {mode === 'create' ? 'Create event' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
