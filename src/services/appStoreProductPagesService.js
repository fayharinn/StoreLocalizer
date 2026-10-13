import { apiRequest, generateToken } from './appStoreConnectService'

// Custom Product Pages (CPP) and Product Page Optimization (PPO).
//
// CPP:  app → appCustomProductPages → appCustomProductPageVersions → appCustomProductPageLocalizations
//       (promotional text + screenshot/preview sets per locale)
// PPO:  app → appStoreVersionExperiments (v2) → appStoreVersionExperimentTreatments (max 3)
//       → appStoreVersionExperimentTreatmentLocalizations (locale + screenshot/preview sets only)

export const CPP_PROMOTIONAL_TEXT_LIMIT = 170
export const MAX_CUSTOM_PRODUCT_PAGES = 70
export const MAX_EXPERIMENT_TREATMENTS = 3

export const CPP_VERSION_STATES = {
  PREPARE_FOR_SUBMISSION: 'Prepare for submission',
  READY_FOR_REVIEW: 'Ready for review',
  WAITING_FOR_REVIEW: 'Waiting for review',
  IN_REVIEW: 'In review',
  ACCEPTED: 'Accepted',
  APPROVED: 'Approved',
  REPLACED_WITH_NEW_VERSION: 'Replaced',
  REJECTED: 'Rejected',
}

export const EXPERIMENT_STATES = {
  PREPARE_FOR_SUBMISSION: 'Prepare for submission',
  READY_FOR_REVIEW: 'Ready for review',
  WAITING_FOR_REVIEW: 'Waiting for review',
  IN_REVIEW: 'In review',
  ACCEPTED: 'Accepted',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  COMPLETED: 'Completed',
  STOPPED: 'Stopped',
}

// Content can only be changed while the page/test hasn't been sent to App Review
const EDITABLE_STATES = ['PREPARE_FOR_SUBMISSION', 'READY_FOR_REVIEW', 'REJECTED']

export function isCppVersionEditable(version) {
  return EDITABLE_STATES.includes(version?.state)
}

export function isExperimentEditable(experiment) {
  return EDITABLE_STATES.includes(experiment?.state)
}

export function isExperimentRunning(experiment) {
  return Boolean(experiment?.startDate) && !experiment?.endDate &&
    !['COMPLETED', 'STOPPED'].includes(experiment?.state)
}

// A test can be started once App Review accepted it, or right away when its
// treatments don't need review (e.g. alternate icons already in the binary).
export function canStartExperiment(experiment) {
  if (!experiment || experiment.startDate) return false
  if (['ACCEPTED', 'APPROVED'].includes(experiment.state)) return true
  return experiment.reviewRequired === false && isExperimentEditable(experiment)
}

async function getToken(credentials) {
  const { keyId, issuerId, privateKey } = credentials
  return generateToken(keyId, issuerId, privateKey)
}

// Custom Product Pages --------------------------------------------------------

function mapPage(raw) {
  return {
    id: raw.id,
    name: raw.attributes?.name || '',
    url: raw.attributes?.url || '',
    visible: raw.attributes?.visible ?? false,
  }
}

function mapPageVersion(raw) {
  return {
    id: raw.id,
    version: raw.attributes?.version || '',
    state: raw.attributes?.state || 'PREPARE_FOR_SUBMISSION',
    deepLink: raw.attributes?.deepLink || '',
  }
}

function mapPageLocalization(raw) {
  return {
    id: raw.id,
    locale: raw.attributes?.locale || '',
    promotionalText: raw.attributes?.promotionalText || '',
  }
}

export async function listCustomProductPages(credentials, appId) {
  const token = await getToken(credentials)
  const data = await apiRequest(`/apps/${appId}/appCustomProductPages?limit=200`, token)
  return (data?.data || []).map(mapPage)
}

// Creates the page with its first version and primary-locale localization in one
// request. `template` copies screenshots/metadata from the App Store version
// ({ type: 'appStoreVersions', id }) or another page ({ type: 'appCustomProductPages', id }).
export async function createCustomProductPage(credentials, appId, { name, locale, promotionalText, deepLink, template }) {
  const token = await getToken(credentials)

  const versionRef = { type: 'appCustomProductPageVersions', id: '${new-cpp-version}' }
  const localizationRef = { type: 'appCustomProductPageLocalizations', id: '${new-cpp-localization}' }

  const relationships = {
    app: { data: { type: 'apps', id: appId } },
    appCustomProductPageVersions: { data: [versionRef] },
  }
  if (template?.type === 'appStoreVersions') {
    relationships.appStoreVersionTemplate = { data: template }
  } else if (template?.type === 'appCustomProductPages') {
    relationships.customProductPageTemplate = { data: template }
  }

  const payload = {
    data: {
      type: 'appCustomProductPages',
      attributes: { name },
      relationships,
    },
    included: [
      {
        ...versionRef,
        ...(deepLink?.trim() ? { attributes: { deepLink: deepLink.trim() } } : {}),
        relationships: {
          appCustomProductPageLocalizations: { data: [localizationRef] },
        },
      },
      {
        ...localizationRef,
        attributes: stripEmpty({ locale, promotionalText }),
      },
    ],
  }

  const data = await apiRequest('/appCustomProductPages', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  return mapPage(data.data)
}

export async function updateCustomProductPage(credentials, pageId, { name, visible }) {
  const token = await getToken(credentials)
  const attributes = {}
  if (name !== undefined) attributes.name = name
  if (visible !== undefined) attributes.visible = visible

  await apiRequest(`/appCustomProductPages/${pageId}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ data: { type: 'appCustomProductPages', id: pageId, attributes } }),
  })
  return true
}

export async function deleteCustomProductPage(credentials, pageId) {
  const token = await getToken(credentials)
  await apiRequest(`/appCustomProductPages/${pageId}`, token, { method: 'DELETE' })
  return true
}

// Newest version first ("2" before "1")
export async function listCustomProductPageVersions(credentials, pageId) {
  const token = await getToken(credentials)
  const data = await apiRequest(`/appCustomProductPages/${pageId}/appCustomProductPageVersions?limit=50`, token)
  return (data?.data || [])
    .map(mapPageVersion)
    .sort((a, b) => Number(b.version) - Number(a.version))
}

// Needed to edit a page whose latest version is already approved
export async function createCustomProductPageVersion(credentials, pageId, { deepLink } = {}) {
  const token = await getToken(credentials)
  const payload = {
    data: {
      type: 'appCustomProductPageVersions',
      ...(deepLink?.trim() ? { attributes: { deepLink: deepLink.trim() } } : {}),
      relationships: {
        appCustomProductPage: { data: { type: 'appCustomProductPages', id: pageId } },
      },
    },
  }
  const data = await apiRequest('/appCustomProductPageVersions', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return mapPageVersion(data.data)
}

export async function updateCustomProductPageVersion(credentials, versionId, { deepLink }) {
  const token = await getToken(credentials)
  await apiRequest(`/appCustomProductPageVersions/${versionId}`, token, {
    method: 'PATCH',
    body: JSON.stringify({
      data: {
        type: 'appCustomProductPageVersions',
        id: versionId,
        // null clears the deep link
        attributes: { deepLink: deepLink?.trim() || null },
      },
    }),
  })
  return true
}

export async function getCustomProductPageLocalizations(credentials, versionId) {
  const token = await getToken(credentials)
  const data = await apiRequest(
    `/appCustomProductPageVersions/${versionId}/appCustomProductPageLocalizations?limit=200`,
    token
  )
  return (data?.data || []).map(mapPageLocalization)
}

export async function createCustomProductPageLocalization(credentials, versionId, locale, promotionalText) {
  const token = await getToken(credentials)
  const payload = {
    data: {
      type: 'appCustomProductPageLocalizations',
      attributes: stripEmpty({ locale, promotionalText }),
      relationships: {
        appCustomProductPageVersion: { data: { type: 'appCustomProductPageVersions', id: versionId } },
      },
    },
  }
  const data = await apiRequest('/appCustomProductPageLocalizations', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return mapPageLocalization(data.data)
}

export async function updateCustomProductPageLocalization(credentials, localizationId, promotionalText) {
  const token = await getToken(credentials)
  await apiRequest(`/appCustomProductPageLocalizations/${localizationId}`, token, {
    method: 'PATCH',
    body: JSON.stringify({
      data: {
        type: 'appCustomProductPageLocalizations',
        id: localizationId,
        attributes: { promotionalText },
      },
    }),
  })
  return true
}

export async function deleteCustomProductPageLocalization(credentials, localizationId) {
  const token = await getToken(credentials)
  await apiRequest(`/appCustomProductPageLocalizations/${localizationId}`, token, { method: 'DELETE' })
  return true
}

// Update the locale's promotional text, creating the localization row if missing
export async function upsertCustomProductPageLocalization(credentials, versionId, locale, promotionalText, existing) {
  const match = existing?.find(loc => loc.locale === locale)
  if (match) {
    await updateCustomProductPageLocalization(credentials, match.id, promotionalText)
    return { ...match, promotionalText, created: false }
  }
  const created = await createCustomProductPageLocalization(credentials, versionId, locale, promotionalText)
  return { ...created, created: true }
}

// Product Page Optimization ---------------------------------------------------

function mapExperiment(raw) {
  return {
    id: raw.id,
    name: raw.attributes?.name || '',
    platform: raw.attributes?.platform || 'IOS',
    trafficProportion: raw.attributes?.trafficProportion ?? 0,
    state: raw.attributes?.state || 'PREPARE_FOR_SUBMISSION',
    reviewRequired: raw.attributes?.reviewRequired ?? null,
    startDate: raw.attributes?.startDate || null,
    endDate: raw.attributes?.endDate || null,
  }
}

function mapTreatment(raw) {
  return {
    id: raw.id,
    name: raw.attributes?.name || '',
    appIconName: raw.attributes?.appIconName || '',
    appIcon: raw.attributes?.appIcon || null,
    promotedDate: raw.attributes?.promotedDate || null,
  }
}

function mapTreatmentLocalization(raw) {
  return {
    id: raw.id,
    locale: raw.attributes?.locale || '',
  }
}

export async function listExperiments(credentials, appId) {
  const token = await getToken(credentials)
  const data = await apiRequest(`/apps/${appId}/appStoreVersionExperimentsV2?limit=200`, token)
  return (data?.data || []).map(mapExperiment)
}

// Apple only allows one draft test per app at a time — the API answers 409 otherwise
export async function createExperiment(credentials, appId, { name, platform, trafficProportion }) {
  const token = await getToken(credentials)
  const payload = {
    data: {
      type: 'appStoreVersionExperiments',
      attributes: { name, platform, trafficProportion: Number(trafficProportion) },
      relationships: {
        app: { data: { type: 'apps', id: appId } },
      },
    },
  }
  const data = await apiRequest('/v2/appStoreVersionExperiments', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return mapExperiment(data.data)
}

// attributes: { name?, trafficProportion?, started? }
export async function updateExperiment(credentials, experimentId, attributes) {
  const token = await getToken(credentials)
  const clean = {}
  if (attributes.name !== undefined) clean.name = attributes.name
  if (attributes.trafficProportion !== undefined) clean.trafficProportion = Number(attributes.trafficProportion)
  if (attributes.started !== undefined) clean.started = attributes.started

  const data = await apiRequest(`/v2/appStoreVersionExperiments/${experimentId}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ data: { type: 'appStoreVersionExperiments', id: experimentId, attributes: clean } }),
  })
  return data?.data ? mapExperiment(data.data) : null
}

export async function deleteExperiment(credentials, experimentId) {
  const token = await getToken(credentials)
  await apiRequest(`/v2/appStoreVersionExperiments/${experimentId}`, token, { method: 'DELETE' })
  return true
}

export async function listTreatments(credentials, experimentId) {
  const token = await getToken(credentials)
  const data = await apiRequest(
    `/v2/appStoreVersionExperiments/${experimentId}/appStoreVersionExperimentTreatments?limit=10`,
    token
  )
  return (data?.data || []).map(mapTreatment)
}

export async function createTreatment(credentials, experimentId, { name, appIconName }) {
  const token = await getToken(credentials)
  const payload = {
    data: {
      type: 'appStoreVersionExperimentTreatments',
      attributes: stripEmpty({ name, appIconName }),
      relationships: {
        appStoreVersionExperimentV2: { data: { type: 'appStoreVersionExperiments', id: experimentId } },
      },
    },
  }
  const data = await apiRequest('/appStoreVersionExperimentTreatments', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return mapTreatment(data.data)
}

export async function updateTreatment(credentials, treatmentId, { name, appIconName }) {
  const token = await getToken(credentials)
  const attributes = {}
  if (name !== undefined) attributes.name = name
  // Empty string → null so the alternate icon can be removed
  if (appIconName !== undefined) attributes.appIconName = appIconName?.trim() || null

  await apiRequest(`/appStoreVersionExperimentTreatments/${treatmentId}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ data: { type: 'appStoreVersionExperimentTreatments', id: treatmentId, attributes } }),
  })
  return true
}

export async function deleteTreatment(credentials, treatmentId) {
  const token = await getToken(credentials)
  await apiRequest(`/appStoreVersionExperimentTreatments/${treatmentId}`, token, { method: 'DELETE' })
  return true
}

export async function getTreatmentLocalizations(credentials, treatmentId) {
  const token = await getToken(credentials)
  const data = await apiRequest(
    `/appStoreVersionExperimentTreatments/${treatmentId}/appStoreVersionExperimentTreatmentLocalizations?limit=200`,
    token
  )
  return (data?.data || []).map(mapTreatmentLocalization)
}

export async function createTreatmentLocalization(credentials, treatmentId, locale) {
  const token = await getToken(credentials)
  const payload = {
    data: {
      type: 'appStoreVersionExperimentTreatmentLocalizations',
      attributes: { locale },
      relationships: {
        appStoreVersionExperimentTreatment: { data: { type: 'appStoreVersionExperimentTreatments', id: treatmentId } },
      },
    },
  }
  const data = await apiRequest('/appStoreVersionExperimentTreatmentLocalizations', token, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return mapTreatmentLocalization(data.data)
}

export async function deleteTreatmentLocalization(credentials, localizationId) {
  const token = await getToken(credentials)
  await apiRequest(`/appStoreVersionExperimentTreatmentLocalizations/${localizationId}`, token, { method: 'DELETE' })
  return true
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
