export const PROVIDER_CONFIG_KEY = 'xcstrings-localizer-provider-config'
export const ASC_CONFIG_KEY = 'asc-localizer-config'
export const GP_CONFIG_KEY = 'gp-localizer-config'
export const PROTECTED_WORDS_KEY = 'xcstrings-localizer-protected-words'
export const ACTIVE_PAGE_KEY = 'xcstrings-localizer-active-page'
export const WELCOME_SHOWN_KEY = 'xcstrings-localizer-welcome-shown'
export const ASTRO_CONFIG_KEY = 'xcstrings-localizer-astro-config'
export const APPCOMPETE_CONFIG_KEY = 'xcstrings-localizer-appcompete-config'

// Astro ASO talks to a local MCP server (127.0.0.1:8089) — it only works when the
// app itself runs on the same machine (dev server or Tauri desktop), not on the web.
export function isLocalEnvironment() {
  if (typeof window === 'undefined') return false
  if ('__TAURI__' in window) return true
  return ['localhost', '127.0.0.1'].includes(window.location.hostname)
}
// Per-section JSON maps of { field: prompt }
export const EVENT_TRANSLATION_PROMPTS_KEY = 'asc-events-translation-prompts'
export const VERSION_TRANSLATION_PROMPTS_KEY = 'asc-version-translation-prompts'
export const CPP_TRANSLATION_PROMPTS_KEY = 'asc-cpp-translation-prompts'
// Legacy keys (single string) migrated by useAscTranslationPrompt
export const LEGACY_EVENT_PROMPT_KEY = 'asc-events-translation-prompt'
export const LEGACY_SHARED_PROMPT_KEY = 'asc-translation-prompt'
export const ITEMS_PER_PAGE = 50
