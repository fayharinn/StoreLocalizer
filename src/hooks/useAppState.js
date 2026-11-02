import { useState, useEffect, useCallback } from 'react'
import { testApiConnection, PROVIDERS } from '../services/translationService'
import {
  PROVIDER_CONFIG_KEY,
  ASC_CONFIG_KEY,
  ASTRO_CONFIG_KEY,
  APPCOMPETE_CONFIG_KEY,
} from '../constants'
import { pageFromPath, pathFor, PAGE_TITLES } from '../lib/routes'

// index.html's title, kept for the landing page
const LANDING_TITLE = typeof document !== 'undefined' ? document.title : 'StoreLocalizer'

export function useAppState(addLog) {
  // The URL is the source of truth: null is the landing page, otherwise a page id
  const [route, setRoute] = useState(() => pageFromPath(window.location.pathname))

  // Back and forward buttons
  useEffect(() => {
    const onPopState = () => setRoute(pageFromPath(window.location.pathname))
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // An unknown path (or "/" in the desktop app) is rewritten to the page it shows
  useEffect(() => {
    const path = pathFor(route)
    if (window.location.pathname !== path) {
      window.history.replaceState({ page: route }, '', path + window.location.search + window.location.hash)
    }
    document.title = route ? `${PAGE_TITLES[route]} · StoreLocalizer` : LANDING_TITLE
  }, [route])

  // Compares with the address bar, so two quick calls never stack duplicate entries
  const setActivePage = useCallback((page) => {
    const path = pathFor(page)
    if (window.location.pathname !== path) {
      window.history.pushState({ page }, '', path)
      window.scrollTo(0, 0)
    }
    setRoute(page)
  }, [])

  const showWelcome = route === null
  const activePage = route || 'home'
  const handleWelcomeComplete = () => setActivePage('home')

  const [providerConfig, setProviderConfig] = useState(() => {
    const saved = localStorage.getItem(PROVIDER_CONFIG_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.apiKey && !parsed.apiKeys) {
          parsed.apiKeys = { [parsed.provider]: parsed.apiKey }
          delete parsed.apiKey
        }
        const provider = PROVIDERS[parsed.provider] ? parsed.provider : 'openai'
        return {
          provider,
          apiKeys: parsed.apiKeys || {},
          models: parsed.models || {},
          region: parsed.region || 'us-east-1',
          endpoint: parsed.endpoint || '',
          serviceTier: parsed.serviceTier || 'auto'
        }
      } catch { /* ignore */ }
    }
    return { provider: 'openai', apiKeys: {}, models: {}, region: 'us-east-1', endpoint: '', serviceTier: 'auto' }
  })

  const [ascCredentials, setAscCredentials] = useState(() => {
    const saved = localStorage.getItem(ASC_CONFIG_KEY)
    let creds = { keyId: '', issuerId: '', privateKey: '' }
    if (saved) {
      try {
        creds = JSON.parse(saved)
      } catch { /* ignore */ }
    }
    return creds
  })

  const [gpCredentials, setGpCredentials] = useState(() => {
    return { serviceAccountJson: '' }
  })

  const [astroConfig, setAstroConfig] = useState(() => {
    const saved = localStorage.getItem(ASTRO_CONFIG_KEY)
    if (saved) {
      try { return JSON.parse(saved) } catch { /* ignore */ }
    }
    return { enabled: false, port: 8089 }
  })

  const [appCompeteConfig, setAppCompeteConfig] = useState(() => {
    const saved = localStorage.getItem(APPCOMPETE_CONFIG_KEY)
    if (saved) {
      try { return JSON.parse(saved) } catch { /* ignore */ }
    }
    return { apiKey: '' }
  })

  const currentApiKey = providerConfig.apiKeys[providerConfig.provider] || ''
  const currentModel = providerConfig.models[providerConfig.provider] || PROVIDERS[providerConfig.provider].defaultModel

  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  useEffect(() => {
    localStorage.setItem(PROVIDER_CONFIG_KEY, JSON.stringify(providerConfig))
  }, [providerConfig])

  useEffect(() => {
    const toSave = { keyId: ascCredentials.keyId, issuerId: ascCredentials.issuerId, privateKey: '' }
    localStorage.setItem(ASC_CONFIG_KEY, JSON.stringify(toSave))
  }, [ascCredentials.keyId, ascCredentials.issuerId])

  useEffect(() => {
    localStorage.setItem(ASTRO_CONFIG_KEY, JSON.stringify(astroConfig))
  }, [astroConfig])

  useEffect(() => {
    localStorage.setItem(APPCOMPETE_CONFIG_KEY, JSON.stringify(appCompeteConfig))
  }, [appCompeteConfig])

  const handleTestConnection = async () => {
    if (!currentApiKey) {
      setTestResult({ success: false, message: 'Please enter an API key first' })
      return
    }

    setIsTesting(true)
    setTestResult(null)

    const config = {
      provider: providerConfig.provider,
      apiKey: currentApiKey,
      model: currentModel,
      region: providerConfig.region,
      endpoint: providerConfig.endpoint || PROVIDERS[providerConfig.provider]?.placeholder || '',
      serviceTier: providerConfig.serviceTier || 'auto'
    }

    const result = await testApiConnection(config)
    setTestResult(result)
    setIsTesting(false)

    if (result.success) {
      addLog(`${PROVIDERS[providerConfig.provider].name} API test successful!`, 'success')
    } else {
      addLog(`${PROVIDERS[providerConfig.provider].name} API test failed: ${result.message}`, 'error')
    }
  }

  return {
    showWelcome,
    handleWelcomeComplete,
    activePage,
    setActivePage,
    providerConfig,
    setProviderConfig,
    ascCredentials,
    setAscCredentials,
    gpCredentials,
    setGpCredentials,
    astroConfig,
    setAstroConfig,
    appCompeteConfig,
    setAppCompeteConfig,
    currentApiKey,
    currentModel,
    isTesting,
    testResult,
    handleTestConnection,
  }
}
