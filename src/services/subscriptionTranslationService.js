import { translateText } from './translationService'

// Common subscription field templates
export const SUBSCRIPTION_FIELDS = {
  displayName: {
    label: 'Display Name',
    description: 'The name shown to users in the App Store',
    maxLength: 30,
    required: true
  },
  description: {
    label: 'Description',
    description: 'Detailed description of what the subscription includes',
    maxLength: 45,
    required: true
  },
  groupDisplayName: {
    label: 'Group Display Name',
    description: 'Name of the subscription group',
    maxLength: 30,
    required: false
  }
}

// Subscription templates for common use cases
export const SUBSCRIPTION_TEMPLATES = {
  premium: {
    displayName: 'Premium',
    description: 'Unlock all premium features',
    groupDisplayName: 'Premium Access'
  },
  pro: {
    displayName: 'Pro',
    description: 'Professional tools and features',
    groupDisplayName: 'Pro Subscription'
  },
  plus: {
    displayName: 'Plus',
    description: 'Enhanced experience with extra features',
    groupDisplayName: 'Plus Membership'
  },
  unlimited: {
    displayName: 'Unlimited',
    description: 'No limits, full access to everything',
    groupDisplayName: 'Unlimited Access'
  }
}

// Period-specific display names
export const PERIOD_DISPLAY_NAMES = {
  weekly: { en: 'Weekly', suffix: '/ week' },
  monthly: { en: 'Monthly', suffix: '/ month' },
  quarterly: { en: '3 Months', suffix: '/ 3 months' },
  biannual: { en: '6 Months', suffix: '/ 6 months' },
  annual: { en: 'Yearly', suffix: '/ year' },
  lifetime: { en: 'Lifetime', suffix: '' }
}

/**
 * Generate subscription display name with period
 */
export function generateSubscriptionDisplayName(baseName, period, locale = 'en') {
  const periodInfo = PERIOD_DISPLAY_NAMES[period]
  if (!periodInfo) return baseName
  
  if (period === 'lifetime') {
    return `${baseName} - Lifetime`
  }
  
  return `${baseName} ${periodInfo.suffix}`.trim()
}

/**
 * Translate subscription metadata using AI
 */
export async function translateSubscriptionMetadata(metadata, targetLocales, aiConfig, onProgress) {
  const results = {}
  const total = targetLocales.length * Object.keys(metadata).length
  let current = 0

  for (const locale of targetLocales) {
    results[locale] = {}
    
    for (const [field, value] of Object.entries(metadata)) {
      if (!value) continue
      
      current++
      onProgress?.({
        current,
        total,
        currentText: `Translating ${field} to ${locale}...`
      })

      const fieldConfig = SUBSCRIPTION_FIELDS[field]
      const maxLength = fieldConfig?.maxLength || 100

      const prompt = buildSubscriptionTranslationPrompt(field, value, locale, maxLength)
      
      try {
        const translation = await translateText(prompt, 'en', locale, aiConfig)
        results[locale][field] = cleanTranslation(translation, maxLength)
      } catch (error) {
        console.error(`Error translating ${field} to ${locale}:`, error)
        results[locale][field] = value // Fallback to original
      }
    }
  }

  return results
}

/**
 * Build prompt for subscription field translation
 */
function buildSubscriptionTranslationPrompt(field, value, targetLocale, maxLength) {
  const fieldDescriptions = {
    displayName: 'subscription product name shown in the App Store',
    description: 'short description of subscription benefits',
    groupDisplayName: 'subscription group name'
  }

  const fieldDesc = fieldDescriptions[field] || 'subscription text'
  
  return `Translate this ${fieldDesc} from English to ${getLocaleName(targetLocale)}.

Original (English): "${value}"

Requirements:
- Keep it concise (max ${maxLength} characters)
- Maintain the marketing tone
- Do not add quotes around the translation
- Preserve any brand names or technical terms
- Make it sound natural in ${getLocaleName(targetLocale)}

Respond with ONLY the translated text, nothing else.`
}

/**
 * Clean and truncate translation
 */
function cleanTranslation(text, maxLength) {
  let cleaned = text.trim()
  
  // Remove surrounding quotes if present
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1)
  }
  
  // Truncate if needed
  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength - 3) + '...'
  }
  
  return cleaned
}

/**
 * Get human-readable locale name
 */
function getLocaleName(locale) {
  const names = {
    'fr': 'French', 'es': 'Spanish', 'de': 'German', 'ja': 'Japanese',
    'ko': 'Korean', 'zh-Hans': 'Simplified Chinese', 'zh-Hant': 'Traditional Chinese',
    'zh-HK': 'Chinese (Hong Kong)', 'ar': 'Arabic', 'tr': 'Turkish',
    'id': 'Indonesian', 'pt-BR': 'Brazilian Portuguese', 'pt-PT': 'Portuguese',
    'it': 'Italian', 'ru': 'Russian', 'nl': 'Dutch', 'pl': 'Polish',
    'th': 'Thai', 'vi': 'Vietnamese', 'hi': 'Hindi', 'sv': 'Swedish',
    'da': 'Danish', 'no': 'Norwegian', 'fi': 'Finnish', 'el': 'Greek',
    'cs': 'Czech', 'hu': 'Hungarian', 'ro': 'Romanian', 'uk': 'Ukrainian',
    'he': 'Hebrew', 'ms': 'Malay'
  }
  return names[locale] || locale
}

/**
 * Generate all subscription localizations
 */
export async function generateSubscriptionLocalizations(config, aiConfig, onProgress) {
  const {
    baseName,
    baseDescription,
    periods,
    targetLocales
  } = config

  const results = {
    subscriptions: {},
    group: {}
  }

  // Generate for each period
  for (const period of periods) {
    const displayName = generateSubscriptionDisplayName(baseName, period)
    
    const metadata = {
      displayName,
      description: baseDescription
    }

    const translations = await translateSubscriptionMetadata(
      metadata,
      targetLocales,
      aiConfig,
      onProgress
    )

    results.subscriptions[period] = {
      en: metadata,
      ...translations
    }
  }

  // Generate group name translations
  const groupMetadata = {
    groupDisplayName: `${baseName} Subscription`
  }

  const groupTranslations = await translateSubscriptionMetadata(
    groupMetadata,
    targetLocales,
    aiConfig,
    onProgress
  )

  results.group = {
    en: groupMetadata,
    ...groupTranslations
  }

  return results
}

/**
 * Export subscription localizations as JSON
 */
export function exportSubscriptionLocalizations(localizations) {
  return JSON.stringify(localizations, null, 2)
}

/**
 * Export as App Store Connect compatible format
 */
export function exportForAppStoreConnect(localizations) {
  const output = {
    subscriptions: [],
    subscriptionGroups: []
  }

  // Format subscriptions
  for (const [period, data] of Object.entries(localizations.subscriptions)) {
    const subscription = {
      productId: `subscription_${period}`,
      localizations: []
    }

    for (const [locale, fields] of Object.entries(data)) {
      subscription.localizations.push({
        locale,
        displayName: fields.displayName,
        description: fields.description
      })
    }

    output.subscriptions.push(subscription)
  }

  // Format group
  const group = {
    localizations: []
  }

  for (const [locale, fields] of Object.entries(localizations.group)) {
    group.localizations.push({
      locale,
      displayName: fields.groupDisplayName
    })
  }

  output.subscriptionGroups.push(group)

  return output
}
