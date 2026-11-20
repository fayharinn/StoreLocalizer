import { apiRequest, generateToken } from './appStoreConnectService'

// Retention messages for auto-renewable subscriptions (App Store Connect API).
//
// app → retentionMessages (max 10, referenceName) → retentionMessageVersions
//     → retentionMessageLocalizations (header + body per locale)
//
// A version can't be modified or deleted once created, and localizations can't
// be added to an APPROVED version: changing live text means creating a new
// version. Assigning messages to subscriptions, retention offers and the review
// submission stay in App Store Connect.

export const RETENTION_LOCALIZATION_LIMITS = {
  header: 66,
  body: 144,
}

export const RETENTION_REFERENCE_NAME_LIMIT = 64
export const MAX_RETENTION_MESSAGES = 10

export const RETENTION_VERSION_STATES = {
  PREPARE_FOR_SUBMISSION: 'Prepare for submission',
  READY_FOR_REVIEW: 'Ready for review',
  WAITING_FOR_REVIEW: 'Waiting for review',
  IN_REVIEW: 'In review',
  DEVELOPER_REJECTED: 'Removed from review',
  REJECTED: 'Rejected',
  ACCEPTED: 'Accepted',
  APPROVED: 'Approved',
}

// Text can change only while the version isn't with App Review
const EDITABLE_STATES = ['PREPARE_FOR_SUBMISSION', 'READY_FOR_REVIEW', 'DEVELOPER_REJECTED', 'REJECTED']
const IN_REVIEW_STATES = ['WAITING_FOR_REVIEW', 'IN_REVIEW', 'ACCEPTED']

export function isRetentionVersionEditable(version) {
  return EDITABLE_STATES.includes(version?.state)
}

// Versions have no date or number, so the version to work on is chosen by state:
// a draft first, then one with App Review, then the approved (live) one.
// Within a state, the API's last listed version wins.
export function pickWorkingVersion(versions = []) {
  for (const states of [EDITABLE_STATES, IN_REVIEW_STATES, ['APPROVED']]) {
    const match = versions.filter(v => states.includes(v.state)).at(-1)
    if (match) return match
  }
  return versions.at(-1) || null
}

// A new version is allowed once nothing is pending: no draft and nothing in review
export function canCreateRetentionVersion(versions = []) {
  return !versions.some(v => EDITABLE_STATES.includes(v.state) || IN_REVIEW_STATES.includes(v.state))
}

async function getToken(credentials) {
  const { keyId, issuerId, privateKey } = credentials
  return generateToken(keyId, issuerId, privateKey)
}

function mapVersion(raw) {
  return {
    id: raw.id,
    state: raw.attributes?.state || 'PREPARE_FOR_SUBMISSION',
  }
}

function mapLocalization(raw) {
  return {
    id: raw.id,
    locale: raw.attributes?.locale || '',
    header: raw.attributes?.header || '',
    body: raw.attributes?.body || '',
  }
}

function mapSubscription(raw) {
  return {
    id: raw.id,
    name: raw.attributes?.name || '',
    productId: raw.attributes?.productId || '',
  }
}

// Messages with their versions and the subscriptions that use them
export async function listRetentionMessages(credentials, appId) {
  const token = await getToken(credentials)
  const data = await apiRequest(
    `/apps/${appId}/retentionMessages?include=versions,subscriptions` +
      '&fields[retentionMessages]=referenceName,versions,subscriptions' +
      '&fields[retentionMessageVersions]=state' +
      '&fields[subscriptions]=name,productId' +
      '&limit[versions]=50&limit[subscriptions]=50&limit=50',
    token
  )

  const included = data?.included || []
  const byKey = new Map(included.map(r => [`${r.type}:${r.id}`, r]))
  const resolve = (refs, type, map) => (refs || [])
    .filter(ref => ref.type === type)
    .map(ref => byKey.get(`${ref.type}:${ref.id}`))
    .filter(Boolean)
    .map(map)

  return (data?.data || []).map(raw => ({
    id: raw.id,
    referenceName: raw.attributes?.referenceName || '',
    versions: resolve(raw.relationships?.versions?.data, 'retentionMessageVersions', mapVersion),
    subscriptions: resolve(raw.relationships?.subscriptions?.data, 'subscriptions', mapSubscription),
  }))
}

export async function createRetentionMessage(credentials, appId, referenceName) {
  const token = await getToken(credentials)
  const data = await apiRequest('/retentionMessages', token, {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'retentionMessages',
        attributes: { referenceName },
        relationships: { app: { data: { type: 'apps', id: appId } } },
      },
    }),
  })
  return {
    id: data.data.id,
    referenceName: data.data.attributes?.referenceName || referenceName,
    versions: [],
    subscriptions: [],
  }
}

// Text-only version: an image placement has to be picked again in App Store Connect
export async function createRetentionMessageVersion(credentials, messageId) {
  const token = await getToken(credentials)
  const data = await apiRequest('/retentionMessageVersions', token, {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'retentionMessageVersions',
        relationships: {
          retentionMessage: { data: { type: 'retentionMessages', id: messageId } },
        },
      },
    }),
  })
  return mapVersion(data.data)
}

export async function getRetentionMessageLocalizations(credentials, versionId) {
  const token = await getToken(credentials)
  const data = await apiRequest(
    `/retentionMessageVersions/${versionId}/localizations?fields[retentionMessageLocalizations]=locale,header,body&limit=200`,
    token
  )
  return (data?.data || []).map(mapLocalization)
}

export async function createRetentionMessageLocalization(credentials, versionId, locale, { header, body }) {
  const token = await getToken(credentials)
  const data = await apiRequest('/retentionMessageLocalizations', token, {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'retentionMessageLocalizations',
        attributes: stripEmpty({ locale, header, body }),
        relationships: {
          retentionMessageVersion: { data: { type: 'retentionMessageVersions', id: versionId } },
        },
      },
    }),
  })
  return mapLocalization(data.data)
}

export async function updateRetentionMessageLocalization(credentials, localizationId, { header, body }) {
  const token = await getToken(credentials)
  await apiRequest(`/retentionMessageLocalizations/${localizationId}`, token, {
    method: 'PATCH',
    body: JSON.stringify({
      data: {
        type: 'retentionMessageLocalizations',
        id: localizationId,
        attributes: stripEmpty({ header, body }),
      },
    }),
  })
  return true
}

export async function deleteRetentionMessageLocalization(credentials, localizationId) {
  const token = await getToken(credentials)
  await apiRequest(`/retentionMessageLocalizations/${localizationId}`, token, { method: 'DELETE' })
  return true
}

export async function upsertRetentionMessageLocalization(credentials, versionId, locale, content, existing) {
  const match = existing?.find(loc => loc.locale === locale)
  if (match) {
    await updateRetentionMessageLocalization(credentials, match.id, content)
    return { ...match, ...content, created: false }
  }
  const created = await createRetentionMessageLocalization(credentials, versionId, locale, content)
  return { ...created, created: true }
}

function stripEmpty(obj) {
  const out = {}
  for (const [k, v] of Object.entries(obj || {})) {
    if (v === undefined || v === null) continue
    if (typeof v === 'string' && v.trim() === '') continue
    out[k] = v
  }
  return out
}
