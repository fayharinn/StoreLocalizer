import { useState, useMemo, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import {
  TrendingUp, Download, Languages,
  ChevronDown, ChevronUp, BarChart3, CheckCircle2, AlertCircle,
  Loader2, RefreshCw, Link2, Package, Edit3, Save, Database, Clock, Lock
} from 'lucide-react'
import {
  GDP_PER_CAPITA,
  generatePricingTable,
  getPricingTiersSummary,
  SUBSCRIPTION_PERIODS,
  generatePricingRecommendations,
  getTier,
  fetchExchangeRates
} from '@/services/subscriptionPricingService'
import {
  SUBSCRIPTION_TEMPLATES,
  generateSubscriptionLocalizations,
  exportSubscriptionLocalizations,
  exportForAppStoreConnect
} from '@/services/subscriptionTranslationService'
import {
  listSubscriptionGroups,
  getSubscriptionsInGroup,
  getSubscription,
  createSubscriptionLocalization,
  updateSubscriptionLocalization,
  getSubscriptionPricesWithDetails,
  getAvailablePricePoints,
  setSubscriptionPrice,
  deleteSubscriptionPrice,
  SUBSCRIPTION_PERIOD_NAMES,
  SUBSCRIPTION_STATES
} from '@/services/subscriptionService'
import { listApps, ASC_LOCALES, hasValidToken, getTokenTimeLeft } from '@/services/appStoreConnectService'
import { SUPPORTED_LANGUAGES, PROVIDERS } from '@/services/translationService'
import { decrypt } from '@/utils/crypto'
import PricingChart from './PricingChart'

const ENCRYPTED_KEY_STORAGE = 'asc-encrypted-p8-key'

// ISO 2-letter to 3-letter country code mapping for App Store Connect API
const ISO2_TO_ISO3 = {
  'AF': 'AFG', 'AL': 'ALB', 'DZ': 'DZA', 'AO': 'AGO', 'AI': 'AIA', 'AG': 'ATG', 'AR': 'ARG', 'AM': 'ARM',
  'AU': 'AUS', 'AT': 'AUT', 'AZ': 'AZE', 'BS': 'BHS', 'BH': 'BHR', 'BB': 'BRB', 'BY': 'BLR', 'BE': 'BEL',
  'BZ': 'BLZ', 'BJ': 'BEN', 'BM': 'BMU', 'BT': 'BTN', 'BO': 'BOL', 'BA': 'BIH', 'BW': 'BWA', 'BR': 'BRA',
  'VG': 'VGB', 'BN': 'BRN', 'BG': 'BGR', 'BF': 'BFA', 'KH': 'KHM', 'CM': 'CMR', 'CA': 'CAN', 'CV': 'CPV',
  'KY': 'CYM', 'TD': 'TCD', 'CL': 'CHL', 'CN': 'CHN', 'CO': 'COL', 'CG': 'COG', 'CR': 'CRI', 'HR': 'HRV',
  'CY': 'CYP', 'CZ': 'CZE', 'CI': 'CIV', 'CD': 'COD', 'DK': 'DNK', 'DM': 'DMA', 'DO': 'DOM', 'EC': 'ECU',
  'EG': 'EGY', 'SV': 'SLV', 'EE': 'EST', 'SZ': 'SWZ', 'FJ': 'FJI', 'FI': 'FIN', 'FR': 'FRA', 'GA': 'GAB',
  'GM': 'GMB', 'GE': 'GEO', 'DE': 'DEU', 'GH': 'GHA', 'GR': 'GRC', 'GD': 'GRD', 'GT': 'GTM', 'GW': 'GNB',
  'GY': 'GUY', 'HN': 'HND', 'HK': 'HKG', 'HU': 'HUN', 'IS': 'ISL', 'IN': 'IND', 'ID': 'IDN', 'IQ': 'IRQ',
  'IE': 'IRL', 'IL': 'ISR', 'IT': 'ITA', 'JM': 'JAM', 'JP': 'JPN', 'JO': 'JOR', 'KZ': 'KAZ', 'KE': 'KEN',
  'KR': 'KOR', 'KW': 'KWT', 'KG': 'KGZ', 'LA': 'LAO', 'LV': 'LVA', 'LB': 'LBN', 'LR': 'LBR', 'LY': 'LBY',
  'LT': 'LTU', 'LU': 'LUX', 'MO': 'MAC', 'MK': 'MKD', 'MG': 'MDG', 'MW': 'MWI', 'MY': 'MYS', 'MV': 'MDV',
  'ML': 'MLI', 'MT': 'MLT', 'MR': 'MRT', 'MU': 'MUS', 'MX': 'MEX', 'FM': 'FSM', 'MD': 'MDA', 'MN': 'MNG',
  'ME': 'MNE', 'MS': 'MSR', 'MA': 'MAR', 'MZ': 'MOZ', 'MM': 'MMR', 'NA': 'NAM', 'NR': 'NRU', 'NP': 'NPL',
  'NL': 'NLD', 'NZ': 'NZL', 'NI': 'NIC', 'NE': 'NER', 'NG': 'NGA', 'NO': 'NOR', 'OM': 'OMN', 'PK': 'PAK',
  'PW': 'PLW', 'PA': 'PAN', 'PG': 'PNG', 'PY': 'PRY', 'PE': 'PER', 'PH': 'PHL', 'PL': 'POL', 'PT': 'PRT',
  'QA': 'QAT', 'RO': 'ROU', 'RU': 'RUS', 'RW': 'RWA', 'KN': 'KNA', 'LC': 'LCA', 'VC': 'VCT', 'ST': 'STP',
  'SA': 'SAU', 'SN': 'SEN', 'RS': 'SRB', 'SC': 'SYC', 'SL': 'SLE', 'SG': 'SGP', 'SK': 'SVK', 'SI': 'SVN',
  'SB': 'SLB', 'ZA': 'ZAF', 'ES': 'ESP', 'LK': 'LKA', 'SR': 'SUR', 'SE': 'SWE', 'CH': 'CHE', 'TW': 'TWN',
  'TJ': 'TJK', 'TZ': 'TZA', 'TH': 'THA', 'TO': 'TON', 'TT': 'TTO', 'TN': 'TUN', 'TR': 'TUR', 'TM': 'TKM',
  'TC': 'TCA', 'UG': 'UGA', 'UA': 'UKR', 'AE': 'ARE', 'GB': 'GBR', 'US': 'USA', 'UY': 'URY', 'UZ': 'UZB',
  'VU': 'VUT', 'VE': 'VEN', 'VN': 'VNM', 'YE': 'YEM', 'ZM': 'ZMB', 'ZW': 'ZWE', 'XK': 'XKS'
}

// Subscription state colors come from the service as hue names; map them onto
// the semantic palette (needs attention, error, success). Anything else stays neutral.
const STATE_BADGE_CLASS = {
  amber: 'border-transparent bg-highlight/10 text-highlight-ink',
  red: 'border-transparent bg-destructive/10 text-destructive',
  emerald: 'border-transparent bg-positive/10 text-positive',
}

// Swatches matching the neutral steps used for GDP tiers in PricingChart
const TIER_SWATCH = {
  high: 'var(--chart-2)',
  medium: 'var(--chart-3)',
  low: 'var(--chart-5)',
}


export default function SubscriptionManager({ aiConfig, ascCredentials, onCredentialsChange }) {
  // ASC Connection state
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [apps, setApps] = useState([])
  const [selectedApp, setSelectedApp] = useState(null)
  const [subscriptionGroups, setSubscriptionGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [subscriptions, setSubscriptions] = useState([])
  const [selectedSubscription, setSelectedSubscription] = useState(null)
  const [subscriptionDetail, setSubscriptionDetail] = useState(null)
  const [sessionTimeLeft, setSessionTimeLeft] = useState(0)

  // Encrypted key unlock state
  const [hasStoredKey] = useState(() => {
    if (typeof window === 'undefined') return false
    return !!window.localStorage.getItem(ENCRYPTED_KEY_STORAGE)
  })
  const [unlockPassword, setUnlockPassword] = useState('')
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [unlockError, setUnlockError] = useState('')

  // Timer for session countdown
  useEffect(() => {
    const updateTimer = () => {
      if (ascCredentials?.keyId && ascCredentials?.issuerId) {
        setSessionTimeLeft(getTokenTimeLeft(ascCredentials.keyId, ascCredentials.issuerId))
      }
    }
    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [ascCredentials?.keyId, ascCredentials?.issuerId])

  // Format seconds to mm:ss
  const formatTimeLeft = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Unlock encrypted key
  const handleUnlockKey = async () => {
    if (!unlockPassword) {
      setUnlockError('Enter password')
      return
    }

    const stored = localStorage.getItem(ENCRYPTED_KEY_STORAGE)
    if (!stored) {
      setUnlockError('No stored key found')
      return
    }

    setIsUnlocking(true)
    setUnlockError('')

    const result = await decrypt(stored, unlockPassword)

    if (result.success) {
      onCredentialsChange(prev => ({ ...prev, privateKey: result.data }))
      setUnlockPassword('')
    } else {
      setUnlockError('Wrong password')
    }

    setIsUnlocking(false)
  }

  // Pricing state
  const [basePrice, setBasePrice] = useState(9.99)
  const [selectedCountries, setSelectedCountries] = useState(['US', 'GB', 'DE', 'FR', 'JP', 'BR', 'IN'])
  const [pricingOptions, setPricingOptions] = useState({
    minMultiplier: 0.3,
    maxMultiplier: 1.2,
    roundToNice: true
  })

  // Translation state
  const [subscriptionName, setSubscriptionName] = useState('Premium')
  const [subscriptionDescription, setSubscriptionDescription] = useState('Unlock all premium features')
  const [selectedPeriods, setSelectedPeriods] = useState(['monthly', 'annual'])
  const [selectedLocales, setSelectedLocales] = useState(['fr', 'es', 'de', 'ja'])
  const [isTranslating, setIsTranslating] = useState(false)
  const [translationProgress, setTranslationProgress] = useState({ current: 0, total: 0 })
  const [localizations, setLocalizations] = useState(null)

  // Edit state for ASC subscriptions
  const [editingLocale, setEditingLocale] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', description: '' })
  const [isSaving, setIsSaving] = useState(false)

  // Pricing comparison state
  const [currentPrices, setCurrentPrices] = useState([])
  const [availablePricePoints, setAvailablePricePoints] = useState([])
  const [isLoadingPrices, setIsLoadingPrices] = useState(false)
  const [showPriceComparison, setShowPriceComparison] = useState(false)
  const [priceRecommendations, setPriceRecommendations] = useState(null)

  // UI state
  const [expandedTier, setExpandedTier] = useState('high')
  const [activeTab, setActiveTab] = useState('asc')
  const [error, setError] = useState(null)

  // Live GDP data state
  const [liveGDPData, setLiveGDPData] = useState(null)
  const [gdpDataSource, setGdpDataSource] = useState('IMF estimates (2024)')
  const [isLoadingGDP, setIsLoadingGDP] = useState(false)
  const [isLiveData, setIsLiveData] = useState(false)

  // Check if ASC credentials are available (either private key or valid cached token)
  const hasPrivateKey = ascCredentials?.privateKey && ascCredentials?.privateKey.trim() !== ''
  const hasCachedToken = ascCredentials?.keyId && ascCredentials?.issuerId && hasValidToken(ascCredentials.keyId, ascCredentials.issuerId)
  const hasCredentials = ascCredentials?.keyId && ascCredentials?.issuerId && (hasPrivateKey || hasCachedToken)
  const hasBasicCredentials = ascCredentials?.keyId && ascCredentials?.issuerId

  // Fetch live exchange rates and generate pricing recommendations
  const handleRefreshGDP = useCallback(async () => {
    setIsLoadingGDP(true)
    try {
      const result = await generatePricingRecommendations(basePrice, pricingOptions)
      setLiveGDPData(result.recommendations)
      setGdpDataSource(result.exchangeRatesAvailable ? 'Live exchange rates' : 'Cached data')
      setIsLiveData(result.exchangeRatesAvailable && !result.exchangeRatesCached)
    } catch (err) {
      console.error('Failed to fetch pricing data:', err)
      setError('Failed to fetch live exchange rates. Using cached data.')
    } finally {
      setIsLoadingGDP(false)
    }
  }, [basePrice, pricingOptions])

  // Load apps when credentials are available
  const handleConnect = async () => {
    if (!hasCredentials) return

    setIsLoading(true)
    setError(null)

    try {
      const appsList = await listApps(ascCredentials)
      setApps(appsList)
      setIsConnected(true)
    } catch (err) {
      setError(err.message)
      setIsConnected(false)
    } finally {
      setIsLoading(false)
    }
  }

  // Load subscription groups when app is selected
  const handleAppSelect = async (app) => {
    setSelectedApp(app)
    setSelectedGroup(null)
    setSubscriptions([])
    setSelectedSubscription(null)
    setSubscriptionDetail(null)
    setIsLoading(true)
    setError(null)

    try {
      const groups = await listSubscriptionGroups(ascCredentials, app.id)
      setSubscriptionGroups(groups)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Load subscriptions when group is selected
  const handleGroupSelect = async (group) => {
    setSelectedGroup(group)
    setSelectedSubscription(null)
    setSubscriptionDetail(null)
    setIsLoading(true)
    setError(null)

    try {
      const subs = await getSubscriptionsInGroup(ascCredentials, group.id)
      setSubscriptions(subs)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Load subscription details
  const handleSubscriptionSelect = async (sub) => {
    setSelectedSubscription(sub)
    setIsLoading(true)
    setError(null)
    setShowPriceComparison(false)
    setCurrentPrices([])
    setPriceRecommendations(null)

    try {
      const detail = await getSubscription(ascCredentials, sub.id)
      setSubscriptionDetail(detail)
      // Pre-fill translation form
      const enLoc = detail.localizations.find(l => l.locale.startsWith('en'))
      if (enLoc) {
        setSubscriptionName(enLoc.name || detail.name)
        setSubscriptionDescription(enLoc.description || '')
      }

      // Auto-load prices
      await loadPricesForSubscription(sub.id)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Load prices for a subscription (reusable)
  const loadPricesForSubscription = async (subscriptionId) => {
    setIsLoadingPrices(true)

    try {
      // Fetch current prices and exchange rates in parallel
      const [prices, exchangeResult] = await Promise.all([
        getSubscriptionPricesWithDetails(ascCredentials, subscriptionId),
        fetchExchangeRates()
      ])

      console.log('Fetched prices:', prices)
      setCurrentPrices(prices)

      // Find US price as base (territory is 2-letter code like 'US')
      const usPrice = prices.find(p => p.territory === 'US')
      console.log('US Price:', usPrice)

      // Use US price if available, otherwise use the basePrice state or first available price
      let basePriceUSD = basePrice
      if (usPrice && usPrice.customerPrice) {
        basePriceUSD = parseFloat(usPrice.customerPrice)
        setBasePrice(basePriceUSD)
      } else if (prices.length > 0 && prices[0].customerPrice) {
        basePriceUSD = parseFloat(prices[0].customerPrice)
        setBasePrice(basePriceUSD)
      }

      // Generate GDP recommendations
      const recommendations = await generatePricingRecommendations(basePriceUSD)
      console.log('GDP recommendations:', recommendations)

      // Get exchange rates for conversion
      const rates = exchangeResult.rates || {}

      // Map current prices to recommendations
      // Prices are in local currency, need to convert to USD for comparison
      const comparisonData = recommendations.recommendations.map(rec => {
        const currentPrice = prices.find(p => p.territory === rec.countryCode)

        // Convert local price to USD using exchange rate
        let currentPriceUSD = null
        let currentPriceLocal = null

        if (currentPrice?.customerPrice) {
          currentPriceLocal = parseFloat(currentPrice.customerPrice)
          const exchangeRate = rates[rec.currency] || 1
          // Convert from local currency to USD (divide by rate)
          currentPriceUSD = exchangeRate > 0 ? currentPriceLocal / exchangeRate : currentPriceLocal
        }

        // Check for scheduled future price
        const futurePrice = prices.find(p =>
          p.territory === rec.countryCode &&
          p.startDate &&
          new Date(p.startDate) > new Date()
        )

        return {
          ...rec,
          territory: rec.countryCode,
          currentPriceUSD, // Price converted to USD for comparison
          currentPriceLocal, // Original price in local currency
          currentCurrency: rec.currency,
          hasPriceSet: !!currentPrice,
          scheduledPrice: futurePrice ? parseFloat(futurePrice.customerPrice) : null,
          scheduledDate: futurePrice?.startDate || null
        }
      })

      console.log('Comparison data:', comparisonData)
      setPriceRecommendations(comparisonData)
      setShowPriceComparison(true)
    } catch (err) {
      console.error('Error loading prices:', err)
      // Don't set error - prices are optional, show recommendations anyway
      const recommendations = await generatePricingRecommendations(basePrice)
      setPriceRecommendations(recommendations.recommendations.map(rec => ({
        ...rec,
        territory: rec.countryCode,
        currentPriceUSD: null,
        currentPriceLocal: null,
        currentCurrency: null,
        hasPriceSet: false
      })))
      setShowPriceComparison(true)
    } finally {
      setIsLoadingPrices(false)
    }
  }

  // Refresh prices manually
  const handleLoadPrices = async () => {
    if (!selectedSubscription) return
    await loadPricesForSubscription(selectedSubscription.id)
  }

  // Update price for a territory
  const handleUpdatePrice = async (territory, recommendedLocalPrice, currencySymbol) => {
    if (!selectedSubscription) return

    setIsLoadingPrices(true)

    try {
      // Convert ISO2 to ISO3 for App Store Connect API
      const iso3Territory = ISO2_TO_ISO3[territory] || territory

      // Check if there's already a future price for this territory and delete it
      const existingPrices = currentPrices.filter(p =>
        p.territory === territory && p.startDate && new Date(p.startDate) > new Date()
      )
      for (const existingPrice of existingPrices) {
        await deleteSubscriptionPrice(ascCredentials, existingPrice.id)
      }

      // Get available price points for this territory
      const pricePoints = await getAvailablePricePoints(ascCredentials, selectedSubscription.id, [iso3Territory])

      // Find the smallest price point >= recommended price (round up)
      const targetPrice = recommendedLocalPrice
      let bestPoint = null

      for (const pp of pricePoints) {
        const ppPrice = parseFloat(pp.customerPrice)
        // Only consider price points >= target
        if (ppPrice >= targetPrice) {
          if (!bestPoint || ppPrice < parseFloat(bestPoint.customerPrice)) {
            bestPoint = pp
          }
        }
      }

      // If no price point >= target, take the highest available
      if (!bestPoint && pricePoints.length > 0) {
        bestPoint = pricePoints.reduce((max, pp) =>
          parseFloat(pp.customerPrice) > parseFloat(max.customerPrice) ? pp : max
          , pricePoints[0])
      }

      if (bestPoint) {
        const result = await setSubscriptionPrice(ascCredentials, selectedSubscription.id, bestPoint.id)
        toast.success(`Price scheduled for ${territory}`, {
          description: `${currencySymbol}${bestPoint.customerPrice} starting ${result.startDate}`
        })
        // Refresh prices
        await handleLoadPrices()
      } else {
        toast.error(`No suitable price point found for ${territory}`)
      }
    } catch (err) {
      toast.error('Failed to update price', { description: err.message })
    } finally {
      setIsLoadingPrices(false)
    }
  }


  // Edit localization
  const handleEditLocale = (loc) => {
    setEditingLocale(loc)
    setEditForm({ name: loc.name || '', description: loc.description || '' })
  }

  // Save localization
  const handleSaveLocalization = async () => {
    if (!editingLocale || !selectedSubscription) return

    setIsSaving(true)
    setError(null)

    try {
      await updateSubscriptionLocalization(ascCredentials, editingLocale.id, editForm)
      // Refresh subscription detail
      const detail = await getSubscription(ascCredentials, selectedSubscription.id)
      setSubscriptionDetail(detail)
      setEditingLocale(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  // Add new localization
  const handleAddLocalization = async (locale) => {
    if (!selectedSubscription) return

    setIsLoading(true)
    setError(null)

    try {
      await createSubscriptionLocalization(
        ascCredentials,
        selectedSubscription.id,
        locale,
        subscriptionName,
        subscriptionDescription
      )
      // Refresh subscription detail
      const detail = await getSubscription(ascCredentials, selectedSubscription.id)
      setSubscriptionDetail(detail)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Calculate pricing table (use live data if available)
  const pricingTable = useMemo(() => {
    if (liveGDPData && liveGDPData.length > 0) {
      return liveGDPData
    }
    return generatePricingTable(basePrice, pricingOptions)
  }, [basePrice, pricingOptions, liveGDPData])

  const selectedPricing = useMemo(() => {
    return pricingTable.filter(p => selectedCountries.includes(p.countryCode))
  }, [pricingTable, selectedCountries])

  const tiersSummary = useMemo(() => {
    return getPricingTiersSummary(basePrice)
  }, [basePrice])

  const chartData = useMemo(() => {
    return selectedPricing.map(p => ({
      country: p.countryCode,
      name: p.countryName,
      price: p.price,
      gdpRatio: p.gdpRatio,
      tier: p.tier
    }))
  }, [selectedPricing])

  // Toggle functions
  const toggleCountry = (code) => {
    setSelectedCountries(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    )
  }

  const togglePeriod = (period) => {
    setSelectedPeriods(prev =>
      prev.includes(period) ? prev.filter(p => p !== period) : [...prev, period]
    )
  }

  const toggleLocale = (locale) => {
    setSelectedLocales(prev =>
      prev.includes(locale) ? prev.filter(l => l !== locale) : [...prev, locale]
    )
  }

  const applyTemplate = (templateKey) => {
    const template = SUBSCRIPTION_TEMPLATES[templateKey]
    if (template) {
      setSubscriptionName(template.displayName)
      setSubscriptionDescription(template.description)
    }
  }


  // Generate AI translations
  const handleGenerateTranslations = async () => {
    const currentApiKey = aiConfig?.apiKeys?.[aiConfig?.provider]
    if (!currentApiKey) {
      setError('Please configure your AI provider in the sidebar first')
      return
    }

    setIsTranslating(true)
    setTranslationProgress({ current: 0, total: selectedLocales.length * selectedPeriods.length * 2 })

    try {
      const config = {
        baseName: subscriptionName,
        baseDescription: subscriptionDescription,
        periods: selectedPeriods,
        targetLocales: selectedLocales
      }

      const fullAiConfig = {
        provider: aiConfig.provider,
        apiKey: currentApiKey,
        model: aiConfig.models?.[aiConfig.provider] || PROVIDERS[aiConfig.provider]?.defaultModel,
        region: aiConfig.region
      }

      const results = await generateSubscriptionLocalizations(
        config,
        fullAiConfig,
        setTranslationProgress
      )

      setLocalizations(results)
    } catch (err) {
      setError(`Translation failed: ${err.message}`)
    } finally {
      setIsTranslating(false)
    }
  }

  // Push translations to ASC
  const handlePushToASC = async () => {
    if (!localizations || !selectedSubscription) return

    setIsLoading(true)
    setError(null)
    let successCount = 0

    try {
      // For each generated locale, create or update
      for (const locale of selectedLocales) {
        const ascLocale = ASC_LOCALES.find(l => l.code.startsWith(locale) || l.code === locale)?.code || locale
        const translation = localizations.subscriptions?.monthly?.[locale]

        if (!translation) continue

        const existingLoc = subscriptionDetail?.localizations.find(l => l.locale === ascLocale)

        if (existingLoc) {
          await updateSubscriptionLocalization(ascCredentials, existingLoc.id, {
            name: translation.displayName,
            description: translation.description
          })
        } else {
          await createSubscriptionLocalization(
            ascCredentials,
            selectedSubscription.id,
            ascLocale,
            translation.displayName,
            translation.description
          )
        }
        successCount++
      }

      // Refresh
      const detail = await getSubscription(ascCredentials, selectedSubscription.id)
      setSubscriptionDetail(detail)
      setError(null)
      alert(`Successfully pushed ${successCount} localizations to App Store Connect!`)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Export functions
  const handleExportJSON = () => {
    if (!localizations) return
    const json = exportSubscriptionLocalizations(localizations)
    downloadFile(json, 'subscription-localizations.json', 'application/json')
  }

  const handleExportASC = () => {
    if (!localizations) return
    const data = exportForAppStoreConnect(localizations)
    const json = JSON.stringify(data, null, 2)
    downloadFile(json, 'asc-subscriptions.json', 'application/json')
  }

  const handleExportPricing = () => {
    const csv = generatePricingCSV()
    downloadFile(csv, 'subscription-pricing.csv', 'text/csv')
  }

  const generatePricingCSV = () => {
    const headers = ['Country', 'Code', 'Currency', 'Tier', 'GDP Ratio', 'Price']
    const rows = selectedPricing.map(p => [
      p.countryName, p.countryCode, p.currency, p.tier, p.gdpRatio.toFixed(2), p.price.toFixed(2)
    ])
    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }

  const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const currentApiKey = aiConfig?.apiKeys?.[aiConfig?.provider] || ''


  return (
    <div className="space-y-8">
      {/* Page header */}
      <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-xl space-y-1">
          <h1 className="text-[28px] leading-9 font-medium tracking-[-0.01em] text-foreground">Subscriptions</h1>
          <p className="text-sm text-muted-foreground">
            Manage your App Store subscriptions, set prices per country from GDP and generate localized metadata.
          </p>
        </div>
        <div className="flex gap-8">
          <div>
            <div className="text-2xl font-medium tabular-nums text-foreground">{Object.keys(GDP_PER_CAPITA).length}</div>
            <div className="text-xs text-faint">Markets</div>
          </div>
          <div>
            <div className="text-2xl font-medium tabular-nums text-foreground">{subscriptionGroups.length || '-'}</div>
            <div className="text-xs text-faint">Groups</div>
          </div>
        </div>
      </header>

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="text-sm">{error}</span>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setError(null)}>
            Dismiss
          </Button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 h-10 p-1 bg-secondary rounded-lg">
          <TabsTrigger value="asc" className="rounded-md data-[state=active]:bg-card flex items-center gap-2">
            <Link2 className="h-4 w-4 text-faint" />
            App Store Connect
          </TabsTrigger>
          <TabsTrigger value="pricing" className="rounded-md data-[state=active]:bg-card flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-faint" />
            GDP pricing
          </TabsTrigger>
          <TabsTrigger value="translations" className="rounded-md data-[state=active]:bg-card flex items-center gap-2">
            <Languages className="h-4 w-4 text-faint" />
            Translations
          </TabsTrigger>
        </TabsList>


        {/* ASC Tab */}
        <TabsContent value="asc" className="space-y-6">
          {!hasBasicCredentials ? (
            <Card>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <h3 className="text-base font-medium mb-1">App Store Connect is not configured</h3>
                  <p className="text-sm text-muted-foreground max-w-md mb-4">
                    Add your App Store Connect credentials in the sidebar to manage subscriptions here.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : !hasCredentials && hasStoredKey ? (
            <Card>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <h3 className="text-base font-medium mb-1 flex items-center gap-2">
                    <Lock className="h-4 w-4 text-faint" />
                    Unlock your private key
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md mb-4">
                    Your .p8 key is encrypted. Enter your password to unlock it.
                  </p>
                  <div className="flex items-center gap-2 w-full max-w-sm">
                    <Input
                      type="password"
                      placeholder="Password"
                      value={unlockPassword}
                      onChange={(e) => {
                        setUnlockPassword(e.target.value)
                        setUnlockError('')
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleUnlockKey()}
                      className="flex-1"
                    />
                    <Button onClick={handleUnlockKey} disabled={isUnlocking}>
                      {isUnlocking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Unlock'}
                    </Button>
                  </div>
                  {unlockError && <p className="text-sm text-destructive mt-2">{unlockError}</p>}
                  {sessionTimeLeft > 0 && (
                    <div className="flex items-center gap-2 mt-4 px-3 py-2 rounded-lg bg-secondary text-muted-foreground text-sm">
                      <Clock className="h-4 w-4 text-faint" />
                      <span>Session active <span className="font-mono tabular-nums text-foreground">{formatTimeLeft(sessionTimeLeft)}</span></span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleConnect}
                        className="ml-2"
                      >
                        Use session
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : !hasCredentials ? (
            <Card>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <h3 className="text-base font-medium mb-1">Private key required</h3>
                  <p className="text-sm text-muted-foreground max-w-md mb-4">
                    Upload your .p8 private key in the sidebar to connect to App Store Connect.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : !isConnected ? (
            <Card>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <h3 className="text-base font-medium mb-1">Connect to App Store Connect</h3>
                  <p className="text-sm text-muted-foreground max-w-md mb-4">
                    Fetch your subscription groups and manage localizations directly from here.
                  </p>
                  <div className="flex items-center gap-3">
                    <Button variant="highlight" onClick={handleConnect} disabled={isLoading} size="lg">
                      {isLoading ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Connecting</>
                      ) : (
                        <><Link2 className="h-4 w-4 mr-2" />Connect</>
                      )}
                    </Button>
                    {sessionTimeLeft > 0 && !hasPrivateKey && (
                      <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary text-muted-foreground text-sm font-mono tabular-nums">
                        <Clock className="h-4 w-4 text-faint" />
                        {formatTimeLeft(sessionTimeLeft)}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 lg:grid-cols-4">
              {/* Apps List */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-medium">Apps</CardTitle>
                    <Button variant="ghost" size="sm" onClick={handleConnect} disabled={isLoading}>
                      <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-1">
                      {apps.map(app => (
                        <button
                          key={app.id}
                          onClick={() => handleAppSelect(app)}
                          className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${selectedApp?.id === app.id
                              ? 'bg-accent text-foreground'
                              : 'hover:bg-secondary/50'
                            }`}
                        >
                          {app.iconUrl ? (
                            <img src={app.iconUrl} alt="" className="w-8 h-8 rounded-lg" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                              <Package className="h-4 w-4 text-faint" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{app.name}</p>
                            <p className="font-mono text-xs text-faint truncate">{app.bundleId}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Subscription Groups */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium">Subscription groups</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    {!selectedApp ? (
                      <p className="text-sm text-muted-foreground text-center py-8">Select an app first</p>
                    ) : subscriptionGroups.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No subscription groups found</p>
                    ) : (
                      <div className="space-y-1">
                        {subscriptionGroups.map(group => (
                          <button
                            key={group.id}
                            onClick={() => handleGroupSelect(group)}
                            className={`w-full p-3 rounded-lg text-left transition-colors ${selectedGroup?.id === group.id
                                ? 'bg-accent text-foreground'
                                : 'hover:bg-secondary/50'
                              }`}
                          >
                            <p className="text-sm font-medium">{group.referenceName}</p>
                            <p className="text-xs text-faint tabular-nums">
                              {group.subscriptions?.length || 0} subscriptions · {group.localizations?.length || 0} locales
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>


              {/* Subscriptions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium">Subscriptions</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    {!selectedGroup ? (
                      <p className="text-sm text-muted-foreground text-center py-8">Select a group first</p>
                    ) : subscriptions.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No subscriptions found</p>
                    ) : (
                      <div className="space-y-1">
                        {subscriptions.map(sub => {
                          const stateInfo = SUBSCRIPTION_STATES[sub.state] || { label: sub.state, color: 'gray' }
                          return (
                            <button
                              key={sub.id}
                              onClick={() => handleSubscriptionSelect(sub)}
                              className={`w-full p-3 rounded-lg text-left transition-colors ${selectedSubscription?.id === sub.id
                                  ? 'bg-accent text-foreground'
                                  : 'hover:bg-secondary/50'
                                }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-sm font-medium">{sub.name}</p>
                                <Badge variant="outline" className={`text-xs ${STATE_BADGE_CLASS[stateInfo.color] || 'text-muted-foreground'}`}>
                                  {stateInfo.label}
                                </Badge>
                              </div>
                              <p className="text-xs text-faint">
                                <span className="font-mono">{sub.productId}</span> · {SUBSCRIPTION_PERIOD_NAMES[sub.subscriptionPeriod] || sub.subscriptionPeriod}
                              </p>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Subscription Detail & Localizations */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium">Localizations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    {!subscriptionDetail ? (
                      <p className="text-sm text-muted-foreground text-center py-8">Select a subscription</p>
                    ) : (
                      <div className="space-y-2">
                        {subscriptionDetail.localizations.map(loc => {
                          const localeInfo = ASC_LOCALES.find(l => l.code === loc.locale)
                          return (
                            <div
                              key={loc.id}
                              className="p-3 rounded-lg border border-border hover:border-foreground/20 transition-colors"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-base">{localeInfo?.flag || '🌐'}</span>
                                  <span className="text-sm font-medium">{localeInfo?.name || loc.locale}</span>
                                  <span className="keycap">{loc.locale}</span>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditLocale(loc)}
                                >
                                  <Edit3 className="h-3 w-3 text-muted-foreground" />
                                </Button>
                              </div>
                              <p className="text-sm font-medium truncate">{loc.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{loc.description || 'No description'}</p>
                            </div>
                          )
                        })}

                        {/* Add new locale button */}
                        <div className="pt-2 border-t border-border">
                          <p className="text-xs text-faint mb-2">Add localization</p>
                          <div className="flex flex-wrap gap-1">
                            {ASC_LOCALES.filter(l => !subscriptionDetail.localizations.find(loc => loc.locale === l.code))
                              .slice(0, 6)
                              .map(locale => (
                                <Button
                                  key={locale.code}
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => handleAddLocalization(locale.code)}
                                  disabled={isLoading}
                                >
                                  {locale.flag} <span className="font-mono">{locale.code}</span>
                                </Button>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Edit Localization Modal */}
          {editingLocale && (
            <Card className="border-foreground/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium">
                    Edit {ASC_LOCALES.find(l => l.code === editingLocale.locale)?.name || editingLocale.locale}
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setEditingLocale(null)}>×</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Display name (max 30 characters)</Label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    maxLength={30}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description (max 45 characters)</Label>
                  <Textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    maxLength={45}
                    rows={2}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveLocalization} disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Save
                  </Button>
                  <Button variant="outline" onClick={() => setEditingLocale(null)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Price Comparison Section */}
          {isConnected && selectedSubscription && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-base font-medium">Price comparison</CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">
                      Compare current prices with GDP-based recommendations
                    </CardDescription>
                  </div>
                  <Button
                    onClick={handleLoadPrices}
                    disabled={isLoadingPrices}
                    variant="outline"
                    size="sm"
                  >
                    {isLoadingPrices ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Loading</>
                    ) : (
                      <><RefreshCw className="h-4 w-4 mr-2" />Refresh</>
                    )}
                  </Button>
                </div>
              </CardHeader>

              {showPriceComparison && (
                <CardContent>
                  {/* US Base Price Info */}
                  <div className="mb-4 p-4 rounded-lg bg-secondary/40 border border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🇺🇸</span>
                        <span className="font-medium">Base price (USA)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-medium tabular-nums text-foreground">${basePrice.toFixed(2)}</span>
                        {currentPrices.length === 0 && (
                          <Badge variant="warning">
                            Using default
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 tabular-nums">
                      {currentPrices.length > 0
                        ? `${currentPrices.length} territories with prices configured`
                        : 'No prices found in ASC. Showing recommendations based on default price.'}
                    </p>
                  </div>

                  {/* Price Comparison Table */}
                  {priceRecommendations && priceRecommendations.length > 0 ? (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2">
                        {priceRecommendations
                          .filter(p => p.countryCode !== 'US')
                          .map((p) => {
                            const priceDiff = p.currentPriceUSD
                              ? ((p.currentPriceUSD - p.recommendedPriceUSD) / p.recommendedPriceUSD * 100).toFixed(0)
                              : null
                            const isOverpriced = priceDiff && parseFloat(priceDiff) > 15
                            const isUnderpriced = priceDiff && parseFloat(priceDiff) < -15
                            const isOptimal = priceDiff && Math.abs(parseFloat(priceDiff)) <= 15

                            return (
                              <div
                                key={p.countryCode}
                                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${isOverpriced ? 'border-highlight/30 bg-highlight/5' :
                                    isUnderpriced ? 'border-border bg-secondary/40' :
                                      isOptimal ? 'border-border' :
                                        'border-border hover:bg-secondary/40'
                                  }`}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-base">{p.flag || '🌍'}</span>
                                  <div>
                                    <p className="flex items-center gap-2 font-medium">
                                      {p.countryName}
                                      <span className="keycap">{p.territory}</span>
                                    </p>
                                    <p className="text-xs text-faint tabular-nums">
                                      GDP ${p.gdp?.toLocaleString()} per capita
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-4">
                                  {/* Current Price */}
                                  <div className="text-right min-w-[90px]">
                                    <p className="text-xs text-faint">Current</p>
                                    {p.currentPriceLocal ? (
                                      <>
                                        <p className="font-medium tabular-nums text-muted-foreground">${p.currentPriceUSD?.toFixed(2)}</p>
                                        <p className="text-xs text-faint tabular-nums">{p.symbol}{p.currentPriceLocal.toFixed(2)}</p>
                                        {p.scheduledDate && (
                                          <p className="text-xs text-muted-foreground tabular-nums flex items-center justify-end gap-1">
                                            <Clock className="h-3 w-3 text-faint" />
                                            {p.symbol}{p.scheduledPrice} on {p.scheduledDate}
                                          </p>
                                        )}
                                      </>
                                    ) : (
                                      <p className="text-muted-foreground text-sm">Not set</p>
                                    )}
                                  </div>

                                  {/* Arrow */}
                                  <div className="text-faint">→</div>

                                  {/* Recommended Price */}
                                  <div className="text-right min-w-[90px]">
                                    <p className="text-xs text-faint">Recommended</p>
                                    <p className="font-medium tabular-nums text-foreground">
                                      ${p.recommendedPriceUSD.toFixed(2)}
                                    </p>
                                    <p className="text-xs text-faint tabular-nums">{p.localPriceFormatted}</p>
                                  </div>

                                  {/* Status Badge */}
                                  <Badge
                                    variant="outline"
                                    className={`min-w-[80px] justify-center tabular-nums ${!p.currentPriceUSD ? 'border-transparent bg-secondary text-faint' :
                                        isOverpriced ? 'border-transparent bg-highlight/10 text-highlight-ink' :
                                          isUnderpriced ? 'text-muted-foreground' :
                                            'border-transparent bg-positive/10 text-positive'
                                      }`}
                                  >
                                    {!p.currentPriceUSD ? 'No price' :
                                      isOverpriced ? `+${priceDiff}% high` :
                                        isUnderpriced ? `${priceDiff}% low` :
                                          'Optimal'}
                                  </Badge>

                                  {/* Update Button */}
                                  {(!p.currentPriceUSD || isOverpriced || isUnderpriced) && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleUpdatePrice(p.territory, p.localPrice, p.symbol)}
                                      disabled={isLoadingPrices}
                                      className="min-w-[70px]"
                                    >
                                      {isLoadingPrices ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        'Update'
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">No pricing recommendations available.</p>
                      <p className="text-sm text-faint mt-1">Try adjusting the base price above.</p>
                    </div>
                  )}

                  {/* Summary */}
                  {priceRecommendations && priceRecommendations.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border grid grid-cols-3 gap-4 text-center">
                      <div className="py-2">
                        <p className="text-2xl font-medium tabular-nums text-foreground">
                          {priceRecommendations.filter(p => {
                            if (!p.currentPriceUSD || p.countryCode === 'US') return false
                            const diff = Math.abs((p.currentPriceUSD - p.recommendedPriceUSD) / p.recommendedPriceUSD * 100)
                            return diff <= 15
                          }).length}
                        </p>
                        <p className="text-xs text-faint">Optimal</p>
                      </div>
                      <div className="py-2">
                        <p className="text-2xl font-medium tabular-nums text-foreground">
                          {priceRecommendations.filter(p => {
                            if (!p.currentPriceUSD || p.countryCode === 'US') return false
                            const diff = (p.currentPriceUSD - p.recommendedPriceUSD) / p.recommendedPriceUSD * 100
                            return diff > 15
                          }).length}
                        </p>
                        <p className="text-xs text-faint">Overpriced</p>
                      </div>
                      <div className="py-2">
                        <p className="text-2xl font-medium tabular-nums text-foreground">
                          {priceRecommendations.filter(p => !p.currentPriceUSD && p.countryCode !== 'US').length}
                        </p>
                        <p className="text-xs text-faint">Not set</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )}
        </TabsContent>


        {/* Pricing Tab */}
        <TabsContent value="pricing" className="space-y-6">
          {/* Explanation Card */}
          <Card>
            <CardContent>
              <div className="flex items-start gap-4">
                <div>
                  <h3 className="text-base font-medium mb-1">GDP-based pricing</h3>
                  <p className="text-sm text-muted-foreground">
                    If your subscription costs <span className="font-medium tabular-nums text-foreground">${basePrice.toFixed(2)}</span> in the USA,
                    this tool calculates a recommended price for each country from its GDP per capita (purchasing power).
                    Countries with a lower GDP get a discount so the app stays affordable, while prices stay fair across markets.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-4">
            {/* Configuration */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-medium">Base price (USA)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Monthly price in USD</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-faint">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.99"
                      value={basePrice}
                      onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0)}
                      className="pl-7 text-base font-medium tabular-nums"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshGDP}
                    disabled={isLoadingGDP}
                    className="w-full"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingGDP ? 'animate-spin' : ''}`} />
                    {isLoadingGDP ? 'Loading rates' : 'Refresh exchange rates'}
                  </Button>
                  {isLiveData && (
                    <p className="text-xs text-positive mt-2 text-center">
                      Live exchange rates loaded
                    </p>
                  )}
                </div>

                <Button variant="outline" size="sm" onClick={handleExportPricing} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </CardContent>
            </Card>

            {/* Chart */}
            <Card className="lg:col-span-3">
              <CardHeader className="pb-4">
                <div className="space-y-1">
                  <CardTitle className="text-base font-medium">Recommended prices by country</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    Prices adjusted for local purchasing power (GDP per capita)
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <PricingChart data={chartData} basePrice={basePrice} />
              </CardContent>
            </Card>
          </div>

          {/* Pricing Table */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-medium">Pricing recommendations</CardTitle>
                <div className="flex items-center gap-2 text-xs text-faint">
                  <Database className="h-4 w-4 text-faint" />
                  {gdpDataSource}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {pricingTable.map((p) => {
                    const tier = p.tier || (p.gdpRatio >= 0.5 ? 'high' : p.gdpRatio >= 0.2 ? 'medium' : 'low')
                    const discount = Math.round((1 - p.multiplier) * 100)

                    return (
                      <div
                        key={p.countryCode}
                        className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-secondary/40 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-base">{p.flag || '🌍'}</span>
                          <div>
                            <p className="flex items-center gap-2 font-medium">
                              {p.countryName}
                              <span className="keycap">{p.countryCode}</span>
                            </p>
                            <p className="text-xs text-faint tabular-nums">
                              GDP ${p.gdp?.toLocaleString() || 'N/A'} per capita
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          {/* Recommended USD Price */}
                          <div className="text-right">
                            <p className="text-xs text-faint">Recommended</p>
                            <p className="font-medium tabular-nums text-foreground">
                              ${(p.recommendedPriceUSD || p.price || 0).toFixed(2)}
                            </p>
                          </div>

                          {/* Local Currency Price */}
                          {p.localPriceFormatted && (
                            <div className="text-right min-w-[100px]">
                              <p className="text-xs text-faint">Local price</p>
                              <p className="font-medium tabular-nums text-muted-foreground">{p.localPriceFormatted}</p>
                            </div>
                          )}

                          {/* Discount Badge */}
                          <Badge
                            variant="outline"
                            className={`min-w-[60px] justify-center tabular-nums ${discount > 0
                                ? 'text-muted-foreground'
                                : discount < 0
                                  ? 'text-foreground'
                                  : 'border-transparent bg-secondary text-faint'
                              }`}
                          >
                            {discount > 0 ? `-${discount}%` : discount < 0 ? `+${Math.abs(discount)}%` : 'Base'}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Tier Summary */}
          <div className="grid gap-4 md:grid-cols-3">
            {['high', 'medium', 'low'].map((tier) => {
              const tierData = tiersSummary.tiers[tier]
              const avgPrice = tier === 'high' ? tiersSummary.stats.avgHigh :
                tier === 'medium' ? tiersSummary.stats.avgMedium :
                  tiersSummary.stats.avgLow
              const avgDiscount = tier === 'high' ? 0 : tier === 'medium' ? 25 : 50

              return (
                <Card key={tier}>
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge variant="outline" className="text-muted-foreground">
                        <span className="h-2 w-2 rounded-xs" style={{ backgroundColor: TIER_SWATCH[tier] }} />
                        {tier === 'high' ? 'High GDP' : tier === 'medium' ? 'Medium GDP' : 'Low GDP'}
                      </Badge>
                      <span className="text-2xl font-medium tabular-nums">${avgPrice.toFixed(2)}</span>
                    </div>
                    <CardDescription className="text-sm text-muted-foreground tabular-nums">
                      {tierData.length} markets · ~{avgDiscount}% {avgDiscount > 0 ? 'discount' : 'base price'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <button
                      onClick={() => setExpandedTier(expandedTier === tier ? null : tier)}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {expandedTier === tier ? <ChevronUp className="h-4 w-4 text-faint" /> : <ChevronDown className="h-4 w-4 text-faint" />}
                      {expandedTier === tier ? 'Hide' : 'Show'} countries
                    </button>
                    {expandedTier === tier && (
                      <div className="mt-3 space-y-1">
                        {tierData.slice(0, 10).map(p => (
                          <div key={p.countryCode} className="flex items-center justify-between gap-3 text-sm py-1">
                            <div className="flex items-center gap-2">
                              <span>{p.flag || '🌍'}</span>
                              <span>{p.countryName}</span>
                            </div>
                            <span className="tabular-nums text-foreground">${(p.recommendedPriceUSD || p.price || 0).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>


        {/* Translations Tab */}
        <TabsContent value="translations" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Configuration */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-medium">Subscription metadata</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">Configure your subscription details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Templates</Label>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(SUBSCRIPTION_TEMPLATES).map(key => (
                      <Button key={key} variant="outline" size="sm" onClick={() => applyTemplate(key)} className="capitalize">
                        {key}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Display name</Label>
                  <Input
                    value={subscriptionName}
                    onChange={(e) => setSubscriptionName(e.target.value)}
                    placeholder="Premium"
                    maxLength={30}
                  />
                  <p className="text-xs text-faint tabular-nums">{subscriptionName.length}/30 characters</p>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={subscriptionDescription}
                    onChange={(e) => setSubscriptionDescription(e.target.value)}
                    placeholder="Unlock all premium features"
                    maxLength={45}
                    rows={2}
                  />
                  <p className="text-xs text-faint tabular-nums">{subscriptionDescription.length}/45 characters</p>
                </div>

                <div className="space-y-2">
                  <Label>Subscription periods</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(SUBSCRIPTION_PERIODS).map(([key, period]) => (
                      <div
                        key={key}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${selectedPeriods.includes(key) ? 'border-foreground/30 bg-secondary' : 'border-border hover:border-foreground/20'
                          }`}
                        onClick={() => togglePeriod(key)}
                      >
                        <Checkbox checked={selectedPeriods.includes(key)} onCheckedChange={() => togglePeriod(key)} />
                        <span className="text-sm">{period.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Languages */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-medium">Target languages</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">Select languages for translation</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[280px]">
                  <div className="grid grid-cols-2 gap-2">
                    {SUPPORTED_LANGUAGES.map(lang => (
                      <div
                        key={lang.code}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${selectedLocales.includes(lang.code) ? 'border-foreground/30 bg-secondary' : 'border-border hover:border-foreground/20'
                          }`}
                        onClick={() => toggleLocale(lang.code)}
                      >
                        <Checkbox checked={selectedLocales.includes(lang.code)} onCheckedChange={() => toggleLocale(lang.code)} />
                        <span className="text-base">{lang.flag}</span>
                        <span className="text-sm truncate">{lang.name}</span>
                        <span className="keycap ml-auto">{lang.code}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
                  <span className="text-sm text-muted-foreground tabular-nums">{selectedLocales.length} selected</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedLocales(SUPPORTED_LANGUAGES.map(l => l.code))}>All</Button>
                    <Button variant="outline" size="sm" onClick={() => setSelectedLocales([])}>Clear</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Generate Button */}
          <Card>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1">
                  {!currentApiKey ? (
                    <div className="inline-flex items-center gap-2 rounded-lg bg-highlight/10 px-3 py-2 text-sm text-highlight-ink">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>Configure your AI provider in the sidebar</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-positive" />
                      <span className="tabular-nums">Ready: {selectedPeriods.length} periods × {selectedLocales.length} languages</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="highlight"
                    size="lg"
                    onClick={handleGenerateTranslations}
                    disabled={!currentApiKey || isTranslating || selectedLocales.length === 0 || selectedPeriods.length === 0}
                  >
                    {isTranslating ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Translating</>
                    ) : (
                      <><Languages className="h-4 w-4 mr-2" />Generate</>
                    )}
                  </Button>
                  {localizations && selectedSubscription && (
                    <Button size="lg" variant="outline" onClick={handlePushToASC} disabled={isLoading}>
                      {isLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TrendingUp className="h-4 w-4 mr-2" />}
                      Push to ASC
                    </Button>
                  )}
                </div>
              </div>
              {isTranslating && (
                <div className="mt-4 space-y-2">
                  <Progress value={(translationProgress.current / translationProgress.total) * 100} />
                  <p className="text-sm text-muted-foreground text-center tabular-nums">{translationProgress.current} / {translationProgress.total}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results */}
          {localizations && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-medium">Generated localizations</CardTitle>
                    <CardDescription className="text-sm text-muted-foreground tabular-nums">
                      {Object.keys(localizations.subscriptions).length} periods × {Object.keys(localizations.subscriptions[Object.keys(localizations.subscriptions)[0]] || {}).length} languages
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportJSON}>
                      <Download className="h-4 w-4 mr-2" />JSON
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportASC}>
                      <Download className="h-4 w-4 mr-2" />ASC
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-4">
                    {Object.entries(localizations.subscriptions).map(([period, translations]) => (
                      <div key={period} className="p-4 rounded-lg border border-border">
                        <h4 className="text-sm font-medium mb-3 capitalize">{period}</h4>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {Object.entries(translations).map(([locale, fields]) => (
                            <div key={locale} className="p-3 rounded-lg bg-secondary/40">
                              <span className="keycap mb-2">{locale}</span>
                              <p className="font-medium text-sm">{fields.displayName}</p>
                              <p className="text-xs text-muted-foreground">{fields.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
