import { apiRequest, generateToken, ASC_LOCALES } from './appStoreConnectService'

// Character limits per App Store Connect spec
export const EVENT_LOCALIZATION_LIMITS = {
  name: 30,
  shortDescription: 50,
  longDescription: 120,
}

// Badges Apple lets you attach to an event (PascalCase per the API enum)
export const EVENT_BADGES = [
  { value: 'LIVE_EVENT', label: 'Live event' },
  { value: 'PREMIERE', label: 'Premiere' },
  { value: 'CHALLENGE', label: 'Challenge' },
  { value: 'COMPETITION', label: 'Competition' },
  { value: 'NEW_SEASON', label: 'New season' },
  { value: 'MAJOR_UPDATE', label: 'Major update' },
  { value: 'SPECIAL_EVENT', label: 'Special event' },
]

export const EVENT_PRIORITIES = [
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'High' },
]

export const EVENT_PURPOSES = [
  { value: 'APPROPRIATE_FOR_ALL_USERS', label: 'Appropriate for all users' },
  { value: 'ATTRACT_NEW_USERS', label: 'Attract new users' },
  { value: 'KEEP_ACTIVE_USERS', label: 'Keep active users informed' },
  { value: 'BRING_BACK_LAPSED_USERS', label: 'Bring back lapsed users' },
]

// All states the API returns; only DRAFT is fully editable client-side
export const EVENT_STATES = [
  'DRAFT',
  'READY_FOR_REVIEW',
  'WAITING_FOR_REVIEW',
  'IN_REVIEW',
  'ACCEPTED',
  'REJECTED',
  'PUBLISHED',
  'PAST',
  'ARCHIVED',
]

// In-App Events live under /v1/apps/{id}/appEvents
const EVENT_FIELDS = [
  'referenceName',
  'badge',
  'deepLink',
  'purchaseRequirement',
  'primaryLocale',
  'priority',
  'purpose',
  'eventState',
  'territorySchedules',
].join(',')

const LOCALIZATION_FIELDS = [
  'locale',
  'name',
  'shortDescription',
  'longDescription',
].join(',')

function mapEvent(raw) {
  return {
    id: raw.id,
    referenceName: raw.attributes?.referenceName || '',
    badge: raw.attributes?.badge || null,
    deepLink: raw.attributes?.deepLink || '',
    purchaseRequirement: raw.attributes?.purchaseRequirement || '',
    primaryLocale: raw.attributes?.primaryLocale || 'en-US',
    priority: raw.attributes?.priority || 'NORMAL',
    purpose: raw.attributes?.purpose || null,
    eventState: raw.attributes?.eventState || 'DRAFT',
    territorySchedules: raw.attributes?.territorySchedules || [],
  }
}

function mapLocalization(raw) {
  return {
    id: raw.id,
    locale: raw.attributes?.locale || '',
    name: raw.attributes?.name || '',
    shortDescription: raw.attributes?.shortDescription || '',
    longDescription: raw.attributes?.longDescription || '',
  }
}

export async function listAppEvents(credentials, appId) {
  const { keyId, issuerId, privateKey } = credentials
  const token = await generateToken(keyId, issuerId, privateKey)

  const data = await apiRequest(
    `/apps/${appId}/appEvents?fields[appEvents]=${EVENT_FIELDS}&limit=200`,
    token
  )

  return (data?.data || []).map(mapEvent)
}

export async function getAppEvent(credentials, eventId) {
  const { keyId, issuerId, privateKey } = credentials
  const token = await generateToken(keyId, issuerId, privateKey)

  const data = await apiRequest(
    `/appEvents/${eventId}?fields[appEvents]=${EVENT_FIELDS}`,
    token
  )

  return mapEvent(data.data)
}

export async function createAppEvent(credentials, appId, attributes) {
  const { keyId, issuerId, privateKey } = credentials
  const token = await generateToken(keyId, issuerId, privateKey)

  const cleanAttributes = stripEmpty(attributes)

  const payload = {
    data: {
      type: 'appEvents',
      attributes: cleanAttributes,
      relationships: {
        app: { data: { type: 'apps', id: appId } },
      },
    },
  }

  const data = await apiRequest('/appEvents', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  return mapEvent(data.data)
}

export async function updateAppEvent(credentials, eventId, attributes) {
  const { keyId, issuerId, privateKey } = credentials
  const token = await generateToken(keyId, issuerId, privateKey)

  const payload = {
    data: {
      type: 'appEvents',
      id: eventId,
      attributes: stripEmpty(attributes),
    },
  }

  await apiRequest(`/appEvents/${eventId}`, token, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

  return true
}

export async function deleteAppEvent(credentials, eventId) {
  const { keyId, issuerId, privateKey } = credentials
  const token = await generateToken(keyId, issuerId, privateKey)

  await apiRequest(`/appEvents/${eventId}`, token, { method: 'DELETE' })
  return true
}

export async function getAppEventLocalizations(credentials, eventId) {
  const { keyId, issuerId, privateKey } = credentials
  const token = await generateToken(keyId, issuerId, privateKey)

  const data = await apiRequest(
    `/appEvents/${eventId}/localizations?fields[appEventLocalizations]=${LOCALIZATION_FIELDS}&limit=200`,
    token
  )

  return (data?.data || []).map(mapLocalization)
}

export async function createAppEventLocalization(credentials, eventId, locale, content) {
  const { keyId, issuerId, privateKey } = credentials
  const token = await generateToken(keyId, issuerId, privateKey)

  const attributes = stripEmpty({ locale, ...content })

  const payload = {
    data: {
      type: 'appEventLocalizations',
      attributes,
      relationships: {
        appEvent: { data: { type: 'appEvents', id: eventId } },
      },
    },
  }

  const data = await apiRequest('/appEventLocalizations', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  return mapLocalization(data.data)
}

export async function updateAppEventLocalization(credentials, localizationId, content) {
  const { keyId, issuerId, privateKey } = credentials
  const token = await generateToken(keyId, issuerId, privateKey)

  const payload = {
    data: {
      type: 'appEventLocalizations',
      id: localizationId,
      attributes: stripEmpty(content),
    },
  }

  await apiRequest(`/appEventLocalizations/${localizationId}`, token, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })

  return true
}

export async function deleteAppEventLocalization(credentials, localizationId) {
  const { keyId, issuerId, privateKey } = credentials
  const token = await generateToken(keyId, issuerId, privateKey)

  await apiRequest(`/appEventLocalizations/${localizationId}`, token, { method: 'DELETE' })
  return true
}

// Convenience helpers -------------------------------------------------------

export function getLocaleDisplayName(code) {
  const match = ASC_LOCALES.find(l => l.code === code)
  return match ? `${match.flag} ${match.name}` : code
}

// Upsert localized content for a single locale, creating the localization row if missing
export async function upsertAppEventLocalization(credentials, eventId, locale, content, existing) {
  const match = existing?.find(loc => loc.locale === locale)
  if (match) {
    await updateAppEventLocalization(credentials, match.id, content)
    return { id: match.id, locale, ...content, created: false }
  }
  const created = await createAppEventLocalization(credentials, eventId, locale, content)
  return { ...created, created: true }
}

// JSON:API rejects empty strings for some attributes — strip undefined/null/empty
function stripEmpty(obj) {
  const out = {}
  for (const [k, v] of Object.entries(obj || {})) {
    if (v === undefined || v === null) continue
    if (typeof v === 'string' && v.trim() === '') continue
    out[k] = v
  }
  return out
}
