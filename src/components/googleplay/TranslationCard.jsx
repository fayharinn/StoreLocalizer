import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sparkles, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { GP_LOCALES } from '@/services/googlePlayService'

const TRANSLATABLE_FIELDS = [
  { key: 'title', label: 'Title', limit: 30 },
  { key: 'shortDescription', label: 'Short Description', limit: 80 },
  { key: 'fullDescription', label: 'Full Description', limit: 4000 },
]

export default function TranslationCard({
  existingLocales,
  sourceLocale,
  setSourceLocale,
  targetLocales,
  setTargetLocales,
  fieldsToTranslate,
  isTranslating,
  translationProgress,
  translationAlert,
  availableTargetLocales,
  currentAiApiKey,
  handleLocaleToggle,
  handleFieldToggle,
  handleTranslate,
}) {
  return (
    <Card id="gp-translation" className="border-border/50 shadow-sm card-hover scroll-mt-6">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shadow-lg">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg">AI Translation</CardTitle>
            <CardDescription>Translate listings to multiple languages</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {translationAlert.show && (
          <Alert className={translationAlert.success ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-amber-500/50 bg-amber-500/10'}>
            {translationAlert.success ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4 text-amber-500" />}
            <AlertTitle className={translationAlert.success ? 'text-emerald-500' : 'text-amber-500'}>
              {translationAlert.success ? 'Translation Complete' : 'Translation Completed with Errors'}
            </AlertTitle>
            <AlertDescription>{translationAlert.message}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label className="text-sm font-medium">Source Language</Label>
          <Select value={sourceLocale} onValueChange={setSourceLocale}>
            <SelectTrigger className="h-10 max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {existingLocales.map(locale => {
                const info = GP_LOCALES.find(l => l.code === locale)
                return (
                  <SelectItem key={locale} value={locale}>
                    {info?.flag} {info?.name || locale}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium">Fields to Translate</Label>
          <div className="flex flex-wrap gap-2">
            {TRANSLATABLE_FIELDS.map(field => (
              <button
                key={field.key}
                onClick={() => handleFieldToggle(field.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                  fieldsToTranslate.includes(field.key)
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className={`h-4 w-4 rounded border-2 flex items-center justify-center ${
                  fieldsToTranslate.includes(field.key) ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                }`}>
                  {fieldsToTranslate.includes(field.key) && (
                    <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                {field.label}
                <Badge variant="secondary" className="text-xs">{field.limit}</Badge>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Target Languages</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (targetLocales.length === availableTargetLocales.length) {
                  setTargetLocales([])
                } else {
                  setTargetLocales(availableTargetLocales.map(l => l.code))
                }
              }}
            >
              {targetLocales.length === availableTargetLocales.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-64 overflow-y-auto p-1">
            {availableTargetLocales.map(locale => {
              const isSelected = targetLocales.includes(locale.code)
              const exists = existingLocales.includes(locale.code)
              return (
                <button
                  key={locale.code}
                  onClick={() => handleLocaleToggle(locale.code)}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-left text-sm transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : exists
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                  }`}>
                    {isSelected && (
                      <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span>{locale.flag}</span>
                  <span className="truncate">{locale.name}</span>
                  {exists && <CheckCircle2 className="h-3 w-3 text-emerald-500 ml-auto shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>

        <div className="pt-4">
          <Button
            onClick={handleTranslate}
            disabled={isTranslating || !currentAiApiKey || targetLocales.length === 0 || fieldsToTranslate.length === 0}
            className="w-full h-12 text-base font-semibold gradient-primary hover:opacity-90 border-0"
            size="lg"
          >
            {isTranslating ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Translating... ({translationProgress.current}/{translationProgress.total})
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Translate {targetLocales.length > 0 && `(${targetLocales.length} languages)`}
              </span>
            )}
          </Button>
          {isTranslating && translationProgress.status && (
            <p className="text-sm text-muted-foreground mt-2 text-center">{translationProgress.status}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
