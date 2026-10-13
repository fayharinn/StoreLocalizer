import { apiRequest, generateToken } from './appStoreConnectService'

// App Asset Library (App Store Connect API 4.5.1, iOS 27 era).
//
// Each app has ONE library. You upload an image/video into it once
// (reserve → upload parts → commit), then create *placements* that put the asset
// on a surface: an App Store version, custom product page, PPO treatment or
// In-App Event localization. This replaces the deprecated appScreenshotSets /
// appPreviewSets / appEventScreenshots resources.
//
// Placement groups, specs and limits come from `appAssetLibraryRefData` at
// runtime — Apple adds device families (e.g. iPhone Duo) without an API change,
// so nothing here hard-codes a device list.

export const ASSET_CATEGORIES = {
  APP_SCREENSHOTS_AND_PREVIEWS: 'Screenshots & previews',
  CREATIVE_ASSETS: 'Creative assets',
}

export const PLACEMENT_TYPE_LABELS = {
  APP_SCREENSHOT: 'Screenshots',
  APP_PREVIEW: 'App previews',
  IMESSAGE_APP_SCREENSHOT: 'iMessage screenshots',
  PRODUCT_PAGE_HEADER_ASSET: 'Product page header',
  APP_STORE_SEARCH_RESULTS_ASSET: 'Search results asset',
  SEARCH_RESULTS_ADS_ASSET: 'Search results ad',
  TODAY_TAB_ADS_ASSET: 'Today tab ad',
  EVENT_CARD_ASSET: 'Event card',
  EVENT_DETAILS_PAGE_ASSET: 'Event details page',
  RETENTION_MESSAGE_ASSET: 'Retention message',
}

// Creative placements are new on iOS 27 / iPadOS 27 and later
export const CREATIVE_PLACEMENT_TYPES = [
  'PRODUCT_PAGE_HEADER_ASSET',
  'APP_STORE_SEARCH_RESULTS_ASSET',
  'EVENT_CARD_ASSET',
  'EVENT_DETAILS_PAGE_ASSET',
]

export const ASSET_STATE_LABELS = {
  AWAITING_UPLOAD: 'Awaiting upload',
  UPLOAD_COMPLETE: 'Processing',
  FAILED: 'Failed',
  COMPLETE: 'Complete',
  PREPARE_FOR_SUBMISSION: 'Ready to place',
  READY_FOR_REVIEW: 'Ready for review',
  WAITING_FOR_REVIEW: 'Waiting for review',
  IN_REVIEW: 'In review',
  ACCEPTED: 'Accepted',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  ARCHIVED: 'Archived',
}

export const PLACEMENT_STATE_LABELS = {
  ASSET_PROCESSING: 'Processing',
  FAILED: 'Failed',
  PARENT_PREPARE_FOR_SUBMISSION: 'Draft',
  PARENT_READY_FOR_REVIEW: 'Ready for review',
  PARENT_WAITING_FOR_REVIEW: 'Waiting for review',
  PARENT_IN_REVIEW: 'In review',
  PARENT_APPROVED: 'Live',
}

// Surface (localization resource type) → relationship key + ref-data feature
export const MEDIA_SURFACES = {
  appStoreVersionLocalizations: { relationship: 'appStoreVersionLocalization', feature: 'APP_STORE_VERSIONS', orderable: true },
  appCustomProductPageLocalizations: { relationship: 'appCustomProductPageLocalization', feature: 'CUSTOM_PRODUCT_PAGES', orderable: true },
  appStoreVersionExperimentTreatmentLocalizations: { relationship: 'appStoreVersionExperimentTreatmentLocalization', feature: 'PRODUCT_PAGE_OPTIMIZATIONS', orderable: true },
  // Each In-App Event placement type holds a single asset, so there's nothing to order
  appEventLocalizations: { relationship: 'appEventLocalization', feature: 'IN_APP_EVENTS', orderable: false },
}

// AWAITING_UPLOAD is a reservation whose bytes never arrived (abandoned upload),
// not something Apple is working on — only UPLOAD_COMPLETE is worth polling
const PROCESSING_STATES = ['UPLOAD_COMPLETE']
const UPLOAD_CONCURRENCY = 4

async function getToken(credentials) {
  const { keyId, issuerId, privateKey } = credentials
  return generateToken(keyId, issuerId, privateKey)
}

const resourceFor = (mediaType) => mediaType === 'VIDEO' ? 'appAssetLibraryVideos' : 'appAssetLibraryImages'

export function isAssetProcessing(asset) {
  return PROCESSING_STATES.includes(asset?.state)
}

export function isAssetIncomplete(asset) {
  return asset?.state === 'AWAITING_UPLOAD'
}

function assetImage(asset) {
  return asset?.mediaType === 'VIDEO' ? asset?.previewFrameImage?.image : asset?.imageAsset
}

// Pixel size of the processed file (videos: their preview frame), or null
export function assetDimensions(asset) {
  const image = assetImage(asset)
  return image?.width && image?.height ? { width: image.width, height: image.height } : null
}

// Fill an ASC templateUrl ("…/{w}x{h}bb.{f}" — a bounding box, aspect ratio kept)
export function assetThumbnailUrl(asset, width = 200, height = 400, format = 'png') {
  const template = assetImage(asset)?.templateUrl
  if (!template) return null
  return template.replace('{w}', width).replace('{h}', height).replace('{f}', format)
}

function mapAsset(raw) {
  const a = raw.attributes || {}
  return {
    id: raw.id,
    mediaType: raw.type === 'appAssetLibraryVideos' ? 'VIDEO' : 'IMAGE',
    category: a.category || null,
    fileName: a.fileName || '',
    fileSize: a.fileSize || 0,
    referenceName: a.referenceName || '',
    specId: a.specId || null,
    state: a.state || 'AWAITING_UPLOAD',
    stateDetails: a.stateDetails || null,
    imageAsset: a.imageAsset || null,
    videoAsset: a.videoAsset || null,
    previewFrameImage: a.previewFrameImage || null,
    previewFrameTimeCode: a.previewFrameTimeCode || '',
    createdDate: a.createdDate || null,
  }
}

function mapPlacement(raw, includedById = {}) {
  const a = raw.attributes || {}
  const assetRef = raw.relationships?.image?.data || raw.relationships?.video?.data
  const included = assetRef ? includedById[`${assetRef.type}:${assetRef.id}`] : null
  return {
    id: raw.id,
    mediaType: a.mediaType || (assetRef?.type === 'appAssetLibraryVideos' ? 'VIDEO' : 'IMAGE'),
    placementType: a.placementType,
    placementGroup: a.placementGroup,
    state: a.state || null,
    stateDetails: a.stateDetails || null,
    assetId: assetRef?.id || null,
    asset: included ? mapAsset(included) : null,
  }
}

// Library -----------------------------------------------------------------------

export async function getAssetLibrary(credentials, appId) {
  const token = await getToken(credentials)
  const data = await apiRequest(`/apps/${appId}/assetLibrary`, token)
  return { id: data.data.id }
}

// The catalog is the same for every app — cache it for the session
let refDataPromise = null
export function getAssetLibraryRefData(credentials) {
  if (!refDataPromise) {
    refDataPromise = getToken(credentials)
      .then(token => apiRequest('/appAssetLibraryRefData', token))
      .then(data => data?.data?.[0]?.attributes || {})
      .catch(error => {
        refDataPromise = null
        throw error
      })
  }
  return refDataPromise
}

export async function listLibraryAssets(credentials, libraryId) {
  const token = await getToken(credentials)
  const [images, videos] = await Promise.all([
    apiRequest(`/appAssetLibraries/${libraryId}/images?sort=-createdDate&limit=200`, token),
    apiRequest(`/appAssetLibraries/${libraryId}/videos?sort=-createdDate&limit=200`, token),
  ])
  return [...(images?.data || []), ...(videos?.data || [])]
    .map(mapAsset)
    .sort((a, b) => (b.createdDate || '').localeCompare(a.createdDate || ''))
}

export async function getLibraryAsset(credentials, asset) {
  const token = await getToken(credentials)
  const data = await apiRequest(`/${resourceFor(asset.mediaType)}/${asset.id}`, token)
  return mapAsset(data.data)
}

// Upload the reserved byte ranges straight to Apple's (unauthenticated) upload URLs
async function uploadParts(uploadOperations, file, onPart) {
  let done = 0
  const queue = [...uploadOperations]
  const worker = async () => {
    while (queue.length) {
      const { method, url, offset, length, requestHeaders } = queue.shift()
      const headers = Object.fromEntries((requestHeaders || []).map(h => [h.name, h.value]))
      const response = await fetch(url, { method, headers, body: file.slice(offset, offset + length) })
      if (!response.ok) throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
      onPart?.(++done, uploadOperations.length)
    }
  }
  await Promise.all(Array.from({ length: Math.min(UPLOAD_CONCURRENCY, uploadOperations.length) }, worker))
}

// Reserve → upload → commit. Returns the asset (still processing on Apple's side).
export async function uploadLibraryAsset(credentials, libraryId, file, { category, referenceName, previewFrameTimeCode, onProgress } = {}) {
  const mediaType = file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE'
  const resource = resourceFor(mediaType)
  const token = await getToken(credentials)

  const attributes = {
    fileName: file.name,
    fileSize: file.size,
    category,
    ...(referenceName ? { referenceName } : {}),
    ...(mediaType === 'VIDEO' && previewFrameTimeCode ? { previewFrameTimeCode } : {}),
  }

  const reserved = await apiRequest(`/${resource}`, token, {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: resource,
        attributes,
        relationships: { assetLibrary: { data: { type: 'appAssetLibraries', id: libraryId } } },
      },
    }),
  })

  const { id } = reserved.data
  await uploadParts(reserved.data.attributes?.uploadOperations || [], file, (done, total) => onProgress?.({ done, total }))

  // Commits take `uploaded` alone — no checksum with the asset library
  const committed = await apiRequest(`/${resource}/${id}`, await getToken(credentials), {
    method: 'PATCH',
    body: JSON.stringify({ data: { type: resource, id, attributes: { uploaded: true } } }),
  })
  return mapAsset(committed?.data || { ...reserved.data, attributes: { ...reserved.data.attributes, state: 'UPLOAD_COMPLETE' } })
}

// attributes: { referenceName?, archived?, previewFrameTimeCode? (videos) }
export async function updateLibraryAsset(credentials, asset, attributes) {
  const token = await getToken(credentials)
  const resource = resourceFor(asset.mediaType)
  const data = await apiRequest(`/${resource}/${asset.id}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ data: { type: resource, id: asset.id, attributes } }),
  })
  return data?.data ? mapAsset(data.data) : { ...asset, ...attributes }
}

// Fails with STATE_ERROR.ASSET_HAS_PLACEMENTS while placements still use the asset
export async function deleteLibraryAsset(credentials, asset) {
  const token = await getToken(credentials)
  await apiRequest(`/${resourceFor(asset.mediaType)}/${asset.id}`, token, { method: 'DELETE' })
  return true
}

export async function listAssetPlacements(credentials, asset) {
  const token = await getToken(credentials)
  const data = await apiRequest(`/${resourceFor(asset.mediaType)}/${asset.id}/placements?limit=200`, token)
  return (data?.data || []).map(p => mapPlacement(p))
}

// Placements --------------------------------------------------------------------

// Every placement on one localization, in display order, with its asset included
export async function listPlacements(credentials, surfaceType, localizationId) {
  const token = await getToken(credentials)
  const data = await apiRequest(
    `/${surfaceType}/${localizationId}/placements?include=image,video&sort=placementGroupPosition&limit=200`,
    token
  )
  const includedById = Object.fromEntries((data?.included || []).map(i => [`${i.type}:${i.id}`, i]))
  return (data?.data || []).map(p => mapPlacement(p, includedById))
}

export async function createPlacement(credentials, { surfaceType, localizationId, placementType, placementGroup, asset }) {
  const token = await getToken(credentials)
  const assetKey = asset.mediaType === 'VIDEO' ? 'video' : 'image'
  const data = await apiRequest('/appAssetLibraryPlacements', token, {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'appAssetLibraryPlacements',
        attributes: { placementType, placementGroup },
        relationships: {
          [assetKey]: { data: { type: resourceFor(asset.mediaType), id: asset.id } },
          [MEDIA_SURFACES[surfaceType].relationship]: { data: { type: surfaceType, id: localizationId } },
        },
      },
    }),
  })
  return { ...mapPlacement(data.data), asset }
}

export async function deletePlacement(credentials, placementId) {
  const token = await getToken(credentials)
  await apiRequest(`/appAssetLibraryPlacements/${placementId}`, token, { method: 'DELETE' })
  return true
}

// Display order of one placement group on one localization (not for In-App Events)
export async function orderPlacements(credentials, { surfaceType, localizationId, placementGroup, placementIds }) {
  const token = await getToken(credentials)
  await apiRequest('/appAssetLibraryPlacementOrderingRequests', token, {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'appAssetLibraryPlacementOrderingRequests',
        attributes: { placementGroup },
        relationships: {
          orderedPlacements: { data: placementIds.map(id => ({ type: 'appAssetLibraryPlacements', id })) },
          [MEDIA_SURFACES[surfaceType].relationship]: { data: { type: surfaceType, id: localizationId } },
        },
      },
    }),
  })
  return true
}

// Reference-data lookups (pure) -----------------------------------------------------

// Placement types a feature supports, e.g. APP_STORE_VERSIONS → screenshots, previews, header…
export function getFeaturePlacementTypes(refData, feature) {
  const policies = refData?.features?.find(f => f.featureId === feature)?.placementPolicies || []
  return policies.map(p => p.placementType).filter(Boolean)
}

// Placement groups available for (feature, placementType), with their per-group limit
export function getPlacementGroups(refData, feature, placementType) {
  const policy = refData?.features
    ?.find(f => f.featureId === feature)
    ?.placementPolicies?.find(p => p.placementType === placementType)
  // The feature's own limits say which groups it accepts; fall back to every
  // group the placement type maps to specs for
  const typeInfo = refData?.placementTypes?.find(t => t.placementTypeId === placementType)
  const policyGroupIds = policy?.groupLimits?.flatMap(l => l.groupIds || []) || []
  const groupIds = policyGroupIds.length > 0
    ? policyGroupIds
    : typeInfo?.specMappings?.map(m => m.placementGroupId) || []

  return [...new Set(groupIds)].map(groupId => {
    const profile = refData?.placementProfileGroups?.find(g => g.placementProfileGroupId === groupId)
    const limit = policy?.groupLimits?.find(l => l.groupIds?.includes(groupId))?.maxCount ?? null
    return {
      groupId,
      platform: profile?.platform || null,
      displayClassId: profile?.displayClassId || null,
      maxCount: limit,
      specs: getGroupSpecs(refData, placementType, groupId),
    }
  }).filter(g => g.maxCount === null || g.maxCount > 0)
}

export function getGroupSpecs(refData, placementType, groupId) {
  const specIds = refData?.placementTypes
    ?.find(t => t.placementTypeId === placementType)
    ?.specMappings?.find(m => m.placementGroupId === groupId)?.specs || []
  const all = [...(refData?.imageSpecs || []), ...(refData?.videoSpecs || [])]
  return specIds.map(id => all.find(s => s.specId === id)).filter(Boolean)
}

export function getAcceptedCategories(refData, placementType) {
  return refData?.placementTypes?.find(t => t.placementTypeId === placementType)?.acceptsAssetCategories || []
}

export function findSpec(refData, specId) {
  if (!specId) return null
  return [...(refData?.imageSpecs || []), ...(refData?.videoSpecs || [])].find(s => s.specId === specId) || null
}

// "IPHONE_DYNAMIC_ISLAND_LARGE_PROFILE" → "iPhone Dynamic Island Large"
export function formatGroupName(groupId) {
  return (groupId || '')
    .replace(/_PROFILE$/, '')
    .split('_')
    .map(w => ({ IPHONE: 'iPhone', IPAD: 'iPad', IMESSAGE: 'iMessage', TV: 'TV', MAC: 'Mac' })[w] || w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ')
}

export function formatSpecDimensions(spec) {
  const d = spec?.dimensions
  if (!d) return ''
  const w = d.minWidth === d.maxWidth ? d.minWidth : `${d.minWidth}–${d.maxWidth}`
  const h = d.minHeight === d.maxHeight ? d.minHeight : `${d.minHeight}–${d.maxHeight}`
  return `${w}×${h}`
}

// Client-side pre-check so a wrongly sized export fails fast instead of after upload
export function specsAcceptDimensions(specs, width, height) {
  return specs.some(({ dimensions: d }) => d &&
    width >= d.minWidth && width <= d.maxWidth &&
    height >= d.minHeight && height <= d.maxHeight)
}

export async function readMediaDimensions(file) {
  if (file.type.startsWith('image/')) {
    const bitmap = await createImageBitmap(file)
    const dims = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return dims
  }
  if (file.type.startsWith('video/')) {
    const url = URL.createObjectURL(file)
    try {
      return await new Promise((resolve, reject) => {
        const video = document.createElement('video')
        video.preload = 'metadata'
        video.onloadedmetadata = () => resolve({ width: video.videoWidth, height: video.videoHeight, duration: video.duration })
        video.onerror = () => reject(new Error('Unreadable video'))
        video.src = url
      })
    } finally {
      URL.revokeObjectURL(url)
    }
  }
  return null
}
