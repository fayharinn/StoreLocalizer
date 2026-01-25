/**
 * App Store Connect Subscription API Service
 * Handles fetching and managing subscription groups, subscriptions, and their localizations
 */

import { generateToken } from './appStoreConnectService'

const BASE_URL = import.meta.env.VITE_ASC_PROXY_URL
  ? `${import.meta.env.VITE_ASC_PROXY_URL}/v1`
  : '/api/appstoreconnect/v1'

// Make authenticated API request
async function apiRequest(endpoint, token, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (response.status === 204) {
    return null
  }

  let data = null
  const text = await response.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch (e) {
      // Not JSON
    }
  }

  if (!response.ok) {
    const errorMessage = data?.errors?.[0]?.detail || data?.errors?.[0]?.title || `API request failed: ${response.status}`
    throw new Error(errorMessage)
  }

  return data
}

/**
 * List all subscription groups for an app
 */
export async function listSubscriptionGroups(credentials, appId) {
  const { keyId, issuerId, privateKey } = credentials
  const token = await generateToken(keyId, issuerId, privateKey)

  const data = await apiRequest(
    `/apps/${appId}/subscriptionGroups?include=subscriptions,subscriptionGroupLocalizations&fields[subscriptionGroups]=referenceName&fields[subscriptions]=name,productId,state,subscriptionPeriod,groupLevel&fields[subscriptionGroupLocalizations]=name,locale,state&limit=50`,
    token
  )

  if (!data?.data) return []

  // Build included map for quick lookup
  const includedMap = {}
  if (data.included) {
    for (const item of data.included) {
      if (!includedMap[item.type]) includedMap[item.type] = {}
      includedMap[item.type][item.id] = item
    }
  }

  return data.data.map(group => {
    // Get subscriptions for this group
    const subscriptionIds = group.relationships?.subscriptions?.data || []
    const subscriptions = subscriptionIds.map(ref => {
      const sub = includedMap.subscriptions?.[ref.id]
      return sub ? {
        id: sub.id,
        name: sub.attributes.name,
        productId: sub.attributes.productId,
        state: sub.attributes.state,
        subscriptionPeriod: sub.attributes.subscriptionPeriod,
        groupLevel: sub.attributes.groupLevel
      } : null
    }).filter(Boolean)

    // Get localizations for this group
    const localizationIds = group.relationships?.subscriptionGroupLocalizations?.data || []
    const localizations = localizationIds.map(ref => {
      const loc = includedMap.subscriptionGroupLocalizations?.[ref.id]
      return loc ? {
        id: loc.id,
        name: loc.attributes.name,
        locale: loc.attributes.locale,
        state: loc.attributes.state
      } : null
    }).filter(Boolean)

    return {
      id: group.id,
      referenceName: group.attributes.referenceName,
      subscriptions,
      localizations
    }
  })
}

/**
 * Get subscription group details with localizations
 */
export async function getSubscriptionGroup(credentials, groupId) {
  const { keyId, issuerId, privateKey } = credentials
  const token = await generateToken(keyId, issuerId, privateKey)

  const data = await apiRequest(
    `/subscriptionGroups/${groupId}?include=subscriptionGroupLocalizations&fields[subscriptionGroupLocalizations]=name,customAppName,locale,state`,
    token
  )

  const localizations = data.included?.filter(i => i.type === 'subscriptionGroupLocalizations').map(loc => ({
    id: loc.id,
    name: loc.attributes.name,
    customAppName: loc.attributes.customAppName,
    locale: loc.attributes.locale,
    state: loc.attributes.state
  })) || []

  return {
    id: data.data.id,
    referenceName: data.data.attributes.referenceName,
    localizations
  }
}

/**
 * Get subscription details with localizations
 */
export async function getSubscription(credentials, subscriptionId) {
  const { keyId, issuerId, privateKey } = credentials
  const token = await generateToken(keyId, issuerId, privateKey)

  const data = await apiRequest(
    `/subscriptions/${subscriptionId}?include=subscriptionLocalizations&fields[subscriptions]=name,productId,state,subscriptionPeriod,groupLevel,familySharable,reviewNote&fields[subscriptionLocalizations]=name,description,locale,state`,
    token
  )

  const localizations = data.included?.filter(i => i.type === 'subscriptionLocalizations').map(loc => ({
    id: loc.id,
    name: loc.attributes.name,
    description: loc.attributes.description,
    locale: loc.attributes.locale,
    state: loc.attributes.state
  })) || []

  return {
    id: data.data.id,
    name: data.data.attributes.name,
    productId: data.data.attributes.productId,
    state: data.data.attributes.state,
    subscriptionPeriod: data.data.attributes.subscriptionPeriod,
    groupLevel: data.data.attributes.groupLevel,
    familySharable: data.data.attributes.familySharable,
    reviewNote: data.data.attributes.reviewNote,
    localizations
  }
}

/**
 * Get all subscriptions in a group with their localizations
 */
export async function getSubscriptionsInGroup(credentials, groupId) {
  const { keyId, issuerId, privateKey } = credentials
  const token = await generateToken(keyId, issuerId, privateKey)

  const data = await apiRequest(
    `/subscriptionGroups/${groupId}/subscriptions?include=subscriptionLocalizations&fields[subscriptions]=name,productId,state,subscriptionPeriod,groupLevel&fields[subscriptionLocalizations]=name,description,locale,state&limit=50`,
    token
  )

  if (!data?.data) return []

  const includedMap = {}
  if (data.included) {
    for (const item of data.included) {
      if (!includedMap[item.type]) includedMap[item.type] = {}
      includedMap[item.type][item.id] = item
    }
  }

  return data.data.map(sub => {
    const localizationIds = sub.relationships?.subscriptionLocalizations?.data || []
    const localizations = localizationIds.map(ref => {
      const loc = includedMap.subscriptionLocalizations?.[ref.id]
      return loc ? {
        id: loc.id,
        name: loc.attributes.name,
        description: loc.attributes.description,
        locale: loc.attributes.locale,
        state: loc.attributes.state
      } : null
    }).filter(Boolean)

    return {
      id: sub.id,
      name: sub.attributes.name,
      productId: sub.attributes.productId,
      state: sub.attributes.state,
      subscriptionPeriod: sub.attributes.subscriptionPeriod,
      groupLevel: sub.attributes.groupLevel,
      localizations
    }
  })
}

/**
 * Create subscription group localization
 */
export async function createSubscriptionGroupLocalization(credentials, groupId, locale, name, customAppName = null) {
  const { keyId, issuerId, privateKey } = credentials
  const token = await generateToken(keyId, issuerId, privateKey)

  const attributes = { locale, name }
  if (customAppName) attributes.customAppName = customAppName

  const payload = {
    data: {
      type: 'subscriptionGroupLocalizations',
      attributes,
      relationships: {
        subscriptionGroup: {
          data: { type: 'subscriptionGroups', id: groupId }
        }
      }
    }
  }

  const data = await apiRequest('/subscriptionGroupLocalizations', token, {
    method: 'POST',
    body: JSON.stringify(payload)
  })

  return {
    id: data.data.id,
    name: data.data.attributes.name,
    locale: data.data.attributes.locale
  }
}

/**
 * Update subscription group localization
 */
export async function updateSubscriptionGroupLocalization(credentials, localizationId, updates) {
  const { keyId, issuerId, privateKey } = credentials
  const token = await generateToken(keyId, issuerId, privateKey)

  const payload = {
    data: {
      type: 'subscriptionGroupLocalizations',
      id: localizationId,
      attributes: {}
    }
  }

  if (updates.name !== undefined) payload.data.attributes.name = updates.name
  if (updates.customAppName !== undefined) payload.data.attributes.customAppName = updates.customAppName

  await apiRequest(`/subscriptionGroupLocalizations/${localizationId}`, token, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  })

  return true
}

/**
 * Create subscription localization
 */
export async function createSubscriptionLocalization(credentials, subscriptionId, locale, name, description = '') {
  const { keyId, issuerId, privateKey } = credentials
  const token = await generateToken(keyId, issuerId, privateKey)

  const payload = {
    data: {
      type: 'subscriptionLocalizations',
      attributes: { locale, name, description },
      relationships: {
        subscription: {
          data: { type: 'subscriptions', id: subscriptionId }
        }
      }
    }
  }

  const data = await apiRequest('/subscriptionLocalizations', token, {
    method: 'POST',
    body: JSON.stringify(payload)
  })

  return {
    id: data.data.id,
    name: data.data.attributes.name,
    description: data.data.attributes.description,
    locale: data.data.attributes.locale
  }
}

/**
 * Update subscription localization
 */
export async function updateSubscriptionLocalization(credentials, localizationId, updates) {
  const { keyId, issuerId, privateKey } = credentials
  const token = await generateToken(keyId, issuerId, privateKey)

  const payload = {
    data: {
      type: 'subscriptionLocalizations',
      id: localizationId,
      attributes: {}
    }
  }

  if (updates.name !== undefined) payload.data.attributes.name = updates.name
  if (updates.description !== undefined) payload.data.attributes.description = updates.description

  await apiRequest(`/subscriptionLocalizations/${localizationId}`, token, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  })

  return true
}

/**
 * Delete subscription localization
 */
export async function deleteSubscriptionLocalization(credentials, localizationId) {
  const { keyId, issuerId, privateKey } = credentials
  const token = await generateToken(keyId, issuerId, privateKey)

  await apiRequest(`/subscriptionLocalizations/${localizationId}`, token, {
    method: 'DELETE'
  })

  return true
}

/**
 * Get subscription price points for a subscription
 */
export async function getSubscriptionPricePoints(credentials, subscriptionId, territory = null) {
  const { keyId, issuerId, privateKey } = credentials
  const token = await generateToken(keyId, issuerId, privateKey)

  let endpoint = `/subscriptions/${subscriptionId}/pricePoints?fields[subscriptionPricePoints]=customerPrice,proceeds,proceedsYear2&include=territory&limit=200`
  if (territory) {
    endpoint += `&filter[territory]=${territory}`
  }

  const data = await apiRequest(endpoint, token)

  if (!data?.data) return []

  const territoriesMap = {}
  if (data.included) {
    for (const item of data.included) {
      if (item.type === 'territories') {
        territoriesMap[item.id] = item.attributes.currency
      }
    }
  }

  return data.data.map(pp => ({
    id: pp.id,
    customerPrice: pp.attributes.customerPrice,
    proceeds: pp.attributes.proceeds,
    proceedsYear2: pp.attributes.proceedsYear2,
    territory: pp.relationships?.territory?.data?.id,
    currency: territoriesMap[pp.relationships?.territory?.data?.id]
  }))
}

/**
 * Get current subscription prices
 */
export async function getSubscriptionPrices(credentials, subscriptionId) {
  const { keyId, issuerId, privateKey } = credentials
  const token = await generateToken(keyId, issuerId, privateKey)

  const data = await apiRequest(
    `/subscriptions/${subscriptionId}/prices?include=subscriptionPricePoint,territory&fields[subscriptionPrices]=startDate,preserved&fields[subscriptionPricePoints]=customerPrice&fields[territories]=currency&limit=200`,
    token
  )

  if (!data?.data) return []

  const includedMap = { subscriptionPricePoints: {}, territories: {} }
  if (data.included) {
    for (const item of data.included) {
      if (includedMap[item.type]) {
        includedMap[item.type][item.id] = item
      }
    }
  }

  return data.data.map(price => {
    const pricePointId = price.relationships?.subscriptionPricePoint?.data?.id
    const territoryId = price.relationships?.territory?.data?.id
    const pricePoint = includedMap.subscriptionPricePoints[pricePointId]
    const territory = includedMap.territories[territoryId]

    return {
      id: price.id,
      startDate: price.attributes.startDate,
      preserved: price.attributes.preserved,
      territory: territoryId,
      currency: territory?.attributes?.currency,
      customerPrice: pricePoint?.attributes?.customerPrice
    }
  })
}

/**
 * Get all available price points for a subscription (for setting new prices)
 */
export async function getAvailablePricePoints(credentials, subscriptionId, territories = null) {
  const { keyId, issuerId, privateKey } = credentials
  const token = await generateToken(keyId, issuerId, privateKey)

  let endpoint = `/subscriptions/${subscriptionId}/pricePoints?fields[subscriptionPricePoints]=customerPrice,proceeds,proceedsYear2&include=territory&limit=200`
  if (territories && territories.length > 0) {
    endpoint += `&filter[territory]=${territories.join(',')}`
  }

  const data = await apiRequest(endpoint, token)
  if (!data?.data) return []

  const territoriesMap = {}
  if (data.included) {
    for (const item of data.included) {
      if (item.type === 'territories') {
        territoriesMap[item.id] = item.attributes.currency
      }
    }
  }

  return data.data.map(pp => ({
    id: pp.id,
    customerPrice: pp.attributes.customerPrice,
    proceeds: pp.attributes.proceeds,
    proceedsYear2: pp.attributes.proceedsYear2,
    territory: pp.relationships?.territory?.data?.id,
    currency: territoriesMap[pp.relationships?.territory?.data?.id]
  }))
}

/**
 * Create/update subscription price for a territory
 * For approved subscriptions, a future startDate is required
 */
export async function setSubscriptionPrice(credentials, subscriptionId, pricePointId, startDate = null) {
  const { keyId, issuerId, privateKey } = credentials
  const token = await generateToken(keyId, issuerId, privateKey)

  // If no startDate provided, use 3 days from now (Apple requires future date based on their timezone)
  let effectiveStartDate = startDate
  if (!effectiveStartDate) {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 3)
    effectiveStartDate = futureDate.toISOString().split('T')[0] // YYYY-MM-DD format
  }

  const payload = {
    data: {
      type: 'subscriptionPrices',
      attributes: {
        startDate: effectiveStartDate,
        preserveCurrentPrice: false
      },
      relationships: {
        subscription: {
          data: { type: 'subscriptions', id: subscriptionId }
        },
        subscriptionPricePoint: {
          data: { type: 'subscriptionPricePoints', id: pricePointId }
        }
      }
    }
  }

  const data = await apiRequest('/subscriptionPrices', token, {
    method: 'POST',
    body: JSON.stringify(payload)
  })

  return {
    id: data.data.id,
    startDate: data.data.attributes.startDate
  }
}

/**
 * Delete a scheduled (future) subscription price
 */
export async function deleteSubscriptionPrice(credentials, priceId) {
  const { keyId, issuerId, privateKey } = credentials
  const token = await generateToken(keyId, issuerId, privateKey)

  await apiRequest(`/subscriptionPrices/${priceId}`, token, {
    method: 'DELETE'
  })
}

/**
 * Decode a base64 encoded ID to extract territory and price info
 */
function decodeBase64Id(encodedId) {
  try {
    let padded = encodedId
    const padding = 4 - (encodedId.length % 4)
    if (padding !== 4) {
      padded += '='.repeat(padding)
    }
    const decoded = atob(padded)
    const parsed = JSON.parse(decoded)
    return {
      territory: parsed.t || parsed.c,
      priceTier: parsed.p
    }
  } catch {
    return null
  }
}

/**
 * Get current prices with full details for comparison
 */
export async function getSubscriptionPricesWithDetails(credentials, subscriptionId) {
  const { keyId, issuerId, privateKey } = credentials
  const token = await generateToken(keyId, issuerId, privateKey)

  let allPrices = []
  let nextUrl = `/subscriptions/${subscriptionId}/prices?include=subscriptionPricePoint&fields[subscriptionPrices]=startDate,preserved&fields[subscriptionPricePoints]=customerPrice,proceeds&limit=200`
  
  while (nextUrl) {
    const pricesData = await apiRequest(nextUrl, token)
    if (!pricesData?.data) break

    const included = pricesData.included || []
    
    // Match by index: data[i] corresponds to included[i]
    const pagePrices = pricesData.data.map((price, idx) => {
      const decoded = decodeBase64Id(price.id)
      const pricePoint = included[idx]

      return {
        id: price.id,
        territory: decoded?.territory,
        customerPrice: pricePoint?.attributes?.customerPrice,
        proceeds: pricePoint?.attributes?.proceeds,
        startDate: price.attributes?.startDate,
        preserved: price.attributes?.preserved
      }
    })
    
    allPrices = [...allPrices, ...pagePrices]
    nextUrl = pricesData.links?.next || null
  }

  const usPrice = allPrices.find(p => p.territory === 'US')
  console.log('[ASC-PRICE] US price:', usPrice?.customerPrice)
  
  return allPrices
}

// Subscription period display names
export const SUBSCRIPTION_PERIOD_NAMES = {
  'ONE_WEEK': 'Weekly',
  'ONE_MONTH': 'Monthly',
  'TWO_MONTHS': '2 Months',
  'THREE_MONTHS': '3 Months',
  'SIX_MONTHS': '6 Months',
  'ONE_YEAR': 'Yearly'
}

// Subscription state display
export const SUBSCRIPTION_STATES = {
  'MISSING_METADATA': { label: 'Missing Metadata', color: 'amber' },
  'READY_TO_SUBMIT': { label: 'Ready to Submit', color: 'blue' },
  'WAITING_FOR_REVIEW': { label: 'Waiting for Review', color: 'purple' },
  'IN_REVIEW': { label: 'In Review', color: 'purple' },
  'DEVELOPER_ACTION_NEEDED': { label: 'Action Needed', color: 'red' },
  'PENDING_BINARY_APPROVAL': { label: 'Pending Approval', color: 'amber' },
  'APPROVED': { label: 'Approved', color: 'emerald' },
  'DEVELOPER_REMOVED_FROM_SALE': { label: 'Removed', color: 'gray' },
  'REMOVED_FROM_SALE': { label: 'Removed', color: 'gray' },
  'REJECTED': { label: 'Rejected', color: 'red' }
}
