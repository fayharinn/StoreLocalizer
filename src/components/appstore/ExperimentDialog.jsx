import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { MAX_EXPERIMENT_TREATMENTS } from '@/services/appStoreProductPagesService'

const PLATFORMS = [
  { value: 'IOS', label: 'iOS' },
  { value: 'MAC_OS', label: 'macOS' },
  { value: 'TV_OS', label: 'tvOS' },
  { value: 'VISION_OS', label: 'visionOS' },
]

// Parent remounts via `key` for a fresh form; props are read once on init.
export default function ExperimentDialog({ mode = 'create', open, experiment, defaultPlatform = 'IOS', isSubmitting, onClose, onSubmit }) {
  const [form, setForm] = useState(() => ({
    name: experiment?.name || '',
    platform: experiment?.platform || defaultPlatform,
    trafficProportion: experiment?.trafficProportion || 50,
    treatmentCount: 1,
  }))
  const update = (field, value) => setForm(f => ({ ...f, [field]: value }))
  const perTreatment = Math.floor(form.trafficProportion / (mode === 'create' ? form.treatmentCount : 1))

  const handleSubmit = () => {
    if (mode === 'edit') {
      onSubmit({ name: form.name.trim(), trafficProportion: form.trafficProportion })
    } else {
      onSubmit({ ...form, name: form.name.trim() })
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'New product page test' : 'Edit test'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? `Test up to ${MAX_EXPERIMENT_TREATMENTS} alternative icons, screenshot sets and app previews against your original product page. Apple allows one draft test per app at a time.`
              : 'Rename the test or change how much traffic it gets.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="exp-name">Test name *</Label>
            <Input id="exp-name" value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="e.g. Dark screenshots vs original" />
          </div>

          {mode === 'create' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Platform</Label>
                <Select value={form.platform} onValueChange={(v) => update('platform', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Treatments</Label>
                <Select value={String(form.treatmentCount)} onValueChange={(v) => update('treatmentCount', Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: MAX_EXPERIMENT_TREATMENTS }, (_, i) => i + 1).map(n => (
                      <SelectItem key={n} value={String(n)}>{n} treatment{n > 1 ? 's' : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Traffic in the test</Label>
              <span className="text-sm font-semibold">{form.trafficProportion}%</span>
            </div>
            <Slider
              min={1}
              max={100}
              step={1}
              value={[form.trafficProportion]}
              onValueChange={([v]) => update('trafficProportion', v)}
            />
            <p className="text-xs text-muted-foreground">
              Share of App Store visitors who see a treatment instead of the original
              {mode === 'create' && form.treatmentCount > 1 ? ` — about ${perTreatment}% each` : ''}.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !form.name.trim()}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'create' ? 'Create test' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
