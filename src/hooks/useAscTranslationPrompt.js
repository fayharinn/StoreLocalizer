import { useCallback, useMemo, useState } from 'react'
import { getDefaultTranslationPrompt } from '@/services/appStoreConnectService'

// Per-field translation prompts. The hook owns one prompt PER field
// (e.g. description, whatsNew, keywords) and each field has its OWN tailored
// default. Only fields the user has customized are stored, as a JSON map
// { field: prompt } in localStorage; everything else falls back to the
// field-specific default at translate time.
//
// Usage:
//   const p = useAscTranslationPrompt('asc-version-translation-prompts', {
//     fields: ['description', 'whatsNew', 'promotionalText', 'keywords'],
//   })
//   p.prompts                       // raw override map (only customized fields)
//   p.getPromptFor('description')   // override OR the field's default
//   p.getDefaultFor('description')  // the field's tailored default
//   p.setPrompt('description', '…') // save one field's override
//   p.reset('description')          // revert one field to its default
//   p.resetAll()                    // revert every field
//   p.isCustom('description')       // true if this field has an override
//   p.anyCustom                     // true if at least one field is customized
export default function useAscTranslationPrompt(storageKey, { fields, legacyKey } = {}) {
  if (!Array.isArray(fields) || fields.length === 0) {
    throw new Error('useAscTranslationPrompt: `fields` array is required')
  }

  const [prompts, setPromptsState] = useState(() => {
    if (typeof window === 'undefined') return {}
    // One-time migration from an older single-string prompt key.
    // The single prompt becomes the override for every field.
    if (legacyKey) {
      const legacy = localStorage.getItem(legacyKey)
      if (legacy && legacy.trim() && !localStorage.getItem(storageKey)) {
        const migrated = Object.fromEntries(fields.map(f => [f, legacy]))
        localStorage.setItem(storageKey, JSON.stringify(migrated))
        localStorage.removeItem(legacyKey)
        return migrated
      }
    }
    const saved = localStorage.getItem(storageKey)
    if (!saved) return {}
    try {
      const parsed = JSON.parse(saved)
      return typeof parsed === 'object' && parsed ? parsed : {}
    } catch {
      return {}
    }
  })

  const persist = useCallback((next) => {
    try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch { /* ignore */ }
  }, [storageKey])

  const getDefaultFor = useCallback((field) => getDefaultTranslationPrompt(field), [])

  const setPrompt = useCallback((field, value) => {
    setPromptsState(prev => {
      const next = { ...prev }
      // Treat "same as default" or empty as not-customized.
      if (value === undefined || value === null || value === getDefaultTranslationPrompt(field)) {
        delete next[field]
      } else {
        next[field] = value
      }
      persist(next)
      return next
    })
  }, [persist])

  const reset = useCallback((field) => {
    setPromptsState(prev => {
      const next = { ...prev }
      delete next[field]
      persist(next)
      return next
    })
  }, [persist])

  const resetAll = useCallback(() => {
    setPromptsState({})
    try { localStorage.removeItem(storageKey) } catch { /* ignore */ }
  }, [storageKey])

  const isCustom = useCallback((field) => Boolean(prompts[field]), [prompts])
  const getPromptFor = useCallback(
    (field) => prompts[field] ?? getDefaultTranslationPrompt(field),
    [prompts]
  )

  const anyCustom = useMemo(() => fields.some(f => prompts[f]), [fields, prompts])

  const [promptDialog, setPromptDialog] = useState({ open: false, field: fields[0] })

  return {
    fields,
    prompts,
    setPrompt,
    reset,
    resetAll,
    isCustom,
    anyCustom,
    getPromptFor,
    getDefaultFor,
    promptDialog,
    setPromptDialog,
  }
}
