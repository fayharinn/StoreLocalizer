export const SUPPORTED_LANGUAGES = [
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'zh-HK', name: 'Chinese (HK)', flag: '🇭🇰' },
  { code: 'zh-Hans', name: 'Chinese (Simplified)', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
  { code: 'id', name: 'Indonesian', flag: '🇮🇩' },
  { code: 'pt-BR', name: 'Portuguese (BR)', flag: '🇧🇷' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱' },
  { code: 'th', name: 'Thai', flag: '🇹🇭' },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'da', name: 'Danish', flag: '🇩🇰' },
  { code: 'zh-Hant', name: 'Chinese (Traditional)', flag: '🇹🇼' },
  { code: 'pt-PT', name: 'Portuguese (PT)', flag: '🇵🇹' },
  { code: 'uk', name: 'Ukrainian', flag: '🇺🇦' },
  { code: 'ms', name: 'Malay', flag: '🇲🇾' },
  { code: 'fil', name: 'Filipino', flag: '🇵🇭' },
  { code: 'ro', name: 'Romanian', flag: '🇷🇴' },
  { code: 'el', name: 'Greek', flag: '🇬🇷' },
  { code: 'cs', name: 'Czech', flag: '🇨🇿' },
  { code: 'hu', name: 'Hungarian', flag: '🇭🇺' },
  { code: 'he', name: 'Hebrew', flag: '🇮🇱' },
  { code: 'fi', name: 'Finnish', flag: '🇫🇮' },
  { code: 'nb', name: 'Norwegian', flag: '🇳🇴' },
  { code: 'sk', name: 'Slovak', flag: '🇸🇰' },
  { code: 'bg', name: 'Bulgarian', flag: '🇧🇬' },
  { code: 'hr', name: 'Croatian', flag: '🇭🇷' },
  { code: 'ca', name: 'Catalan', flag: '🏴' },
]

export const PROVIDERS = {
  openai: {
    name: 'OpenAI',
    models: ['gpt-5.4-nano', 'gpt-5.4-mini', 'gpt-5.5'],
    defaultModel: 'gpt-5.4-nano',
    serviceTiers: ['auto', 'default', 'flex', 'priority'],
    defaultServiceTier: 'auto',
  },
  azure: {
    name: 'Azure OpenAI',
    models: ['gpt-5-nano', 'gpt-5-mini'],
    defaultModel: 'gpt-5-nano',
    needsEndpoint: true,
    customModelInput: true,
    placeholder: 'https://xxx.openai.azure.com',
  },
  bedrock: {
    name: 'AWS Bedrock',
    models: [
      'arn:aws:bedrock:us-east-1:471112516430:inference-profile/global.anthropic.claude-haiku-4-5-20251001-v1:0',
      'arn:aws:bedrock:us-east-1:471112516430:inference-profile/global.anthropic.claude-sonnet-4-6',
      'arn:aws:bedrock:us-east-1:471112516430:inference-profile/global.anthropic.claude-opus-4-6-v1',
    ],
    defaultModel: 'arn:aws:bedrock:us-east-1:471112516430:inference-profile/global.anthropic.claude-haiku-4-5-20251001-v1:0',
    needsRegion: true,
  },
  github: {
    name: 'GitHub Models',
    models: ['gpt-4o', 'gpt-4.1'],
    defaultModel: 'gpt-4o',
  },
  deepseek: {
    name: 'DeepSeek',
    models: ['deepseek-v4-flash', 'deepseek-v4-pro'],
    defaultModel: 'deepseek-v4-flash',
  },
  cloudflare: {
    name: 'Cloudflare Workers AI',
    // Text-generation (LLM) models only — see https://developers.cloudflare.com/ai/models/
    models: [
      '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      '@cf/meta/llama-4-scout-17b-16e-instruct',
      '@cf/meta/llama-3.1-8b-instruct',
      '@cf/openai/gpt-oss-120b',
      '@cf/openai/gpt-oss-20b',
      '@cf/qwen/qwen3-30b-a3b-fp8',
      '@cf/qwen/qwq-32b',
      '@cf/mistralai/mistral-small-3.1-24b-instruct',
      '@cf/google/gemma-3-12b-it',
      '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
      '@cf/nvidia/nemotron-3-120b-a12b',
      '@cf/moonshotai/kimi-k2.6',
      '@cf/zai-org/glm-4.7-flash',
    ],
    defaultModel: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    needsEndpoint: true,
    endpointLabel: 'Account ID',
    placeholder: 'Cloudflare Account ID',
  },
}

/**
 * Fetch the list of chat-capable models directly from the OpenAI API.
 * Filters out non-chat models (embeddings, audio, image, moderation, etc.)
 * so the user doesn't have to maintain the model list by hand.
 *
 * @param {string} apiKey - OpenAI API key (sk-...)
 * @returns {Promise<string[]>} sorted list of model ids, newest first
 */
export async function fetchOpenAIModels(apiKey) {
  if (!apiKey) throw new Error('Missing OpenAI API key')

  const response = await fetch('https://api.openai.com/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  })

  if (!response.ok) {
    let detail = ''
    try {
      const body = await response.json()
      detail = body?.error?.message || ''
    } catch { /* ignore parse errors */ }
    throw new Error(detail || `Failed to fetch models (${response.status})`)
  }

  const data = await response.json()
  const ids = (data?.data || []).map(m => m.id).filter(Boolean)

  const chatModels = ids.filter(id => {
    // Keep chat families: gpt-*, chatgpt-*, o1/o3/o4 reasoning models
    if (!/^(gpt-|chatgpt-|o[1-9])/i.test(id)) return false
    // Drop non-chat variants that share the gpt- prefix
    if (/embedding|whisper|tts|dall-e|audio|realtime|image|moderation|transcribe|-search|computer-use/i.test(id)) return false
    return true
  })

  // Sort descending so newer families (gpt-5, gpt-4.1, o4...) surface first
  return chatModels.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
}

const LANG_NAMES = {
  'fr': 'French',
  'es': 'Spanish',
  'de': 'German',
  'ja': 'Japanese',
  'ko': 'Korean',
  'zh-HK': 'Traditional Chinese (Hong Kong)',
  'zh-Hans': 'Simplified Chinese',
  'ar': 'Arabic',
  'tr': 'Turkish',
  'id': 'Indonesian',
  'pt-BR': 'Portuguese (Brazilian)',
  'it': 'Italian',
  'ru': 'Russian',
  'nl': 'Dutch',
  'pl': 'Polish',
  'th': 'Thai',
  'vi': 'Vietnamese',
  'hi': 'Hindi',
  'sv': 'Swedish',
  'da': 'Danish',
  'zh-Hant': 'Traditional Chinese',
  'pt-PT': 'Portuguese (European)',
  'uk': 'Ukrainian',
  'ms': 'Malay',
  'fil': 'Filipino',
  'ro': 'Romanian',
  'el': 'Greek',
  'cs': 'Czech',
  'hu': 'Hungarian',
  'he': 'Hebrew',
  'fi': 'Finnish',
  'nb': 'Norwegian Bokmål',
  'sk': 'Slovak',
  'bg': 'Bulgarian',
  'hr': 'Croatian',
  'ca': 'Catalan',
}

export const DEFAULT_CONCURRENT_REQUESTS = 10
export const DEFAULT_TEXTS_PER_BATCH = 5  // How many texts to translate in a single API call
const REQUEST_DELAY = 50

function findFormatSpecifiers(text) {
  const specifiers = []
  const regex = /(%[@dislf\d.$+\-#]*[dislf@]|%[0-9]+\$[@dislf]|%[1-9]\$[@dislf]|%\.[0-9]f)/g
  let match
  while ((match = regex.exec(text)) !== null) {
    specifiers.push(match[0])
  }
  return specifiers
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function buildPrompt(text, targetLangs, protectedWords) {
  const formatSpecifiers = findFormatSpecifiers(text)
  const protectedList = protectedWords.length > 0 ? protectedWords.join(', ') : null
  const langList = targetLangs.map(lang => `${lang} (${LANG_NAMES[lang] || lang})`).join(', ')

  let systemMessage = `You are a professional translator for a mobile app. Translate English text to multiple languages.

CRITICAL RULES:
1. Preserve ALL formatting specifiers (%@, %d, %lld, %s, etc.) EXACTLY as they appear
2. Format specifiers MUST remain in the same order in ALL translations
3. DO NOT translate or modify any format specifiers
4. Maintain a natural, user-friendly tone`

  if (protectedList) {
    systemMessage += `
5. DO NOT translate these words/names, keep them exactly as-is: ${protectedList}`
  }

  systemMessage += `
${protectedList ? '6' : '5'}. Your output must be ONLY a JSON object with this structure:
{
  "translations": {
    "fr": "French translation here",
    "es": "Spanish translation here"
  }
}`

  let userMessage = `Translate this English text to the following languages: ${langList}

English text: "${text}"
`

  if (formatSpecifiers.length > 0) {
    userMessage += `\nFormat specifiers that MUST be preserved exactly: ${formatSpecifiers.join(', ')}`
  }

  if (protectedList) {
    userMessage += `\nProtected words that MUST NOT be translated (keep as-is): ${protectedList}`
  }

  userMessage += `\n\nRespond with ONLY a JSON object containing translations for ALL ${targetLangs.length} requested languages.`

  return { systemMessage, userMessage }
}

// Build prompt for batch translation (multiple texts at once)
function buildBatchPrompt(texts, targetLangs, protectedWords) {
  const protectedList = protectedWords.length > 0 ? protectedWords.join(', ') : null
  const langList = targetLangs.map(lang => `${lang} (${LANG_NAMES[lang] || lang})`).join(', ')

  let systemMessage = `You are a professional translator for a mobile app. Translate multiple English texts to multiple languages.

CRITICAL RULES:
1. Preserve ALL formatting specifiers (%@, %d, %lld, %s, etc.) EXACTLY as they appear
2. Format specifiers MUST remain in the same order in ALL translations
3. DO NOT translate or modify any format specifiers
4. Maintain a natural, user-friendly tone`

  if (protectedList) {
    systemMessage += `
5. DO NOT translate these words/names, keep them exactly as-is: ${protectedList}`
  }

  systemMessage += `
${protectedList ? '6' : '5'}. Your output must be ONLY a JSON object with translations for each text ID.`

  // Build the texts list with IDs
  const textsWithSpecs = texts.map((t, i) => {
    const specs = findFormatSpecifiers(t.text)
    return `[${i}] "${t.text}"${specs.length > 0 ? ` (preserve: ${specs.join(', ')})` : ''}`
  }).join('\n')

  let userMessage = `Translate these English texts to: ${langList}

${textsWithSpecs}

${protectedList ? `Protected words (keep as-is): ${protectedList}\n\n` : ''}Respond with ONLY a JSON object:
{
  "0": { "fr": "...", "es": "..." },
  "1": { "fr": "...", "es": "..." }
}`

  return { systemMessage, userMessage }
}

// OpenAI API
async function callOpenAI(apiKey, model, systemMessage, userMessage, serviceTier = 'auto') {
  const body = {
    model,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage }
    ]
  }

  // Add service_tier if not 'auto' (auto is the default behavior)
  if (serviceTier && serviceTier !== 'auto') {
    body.service_tier = serviceTier
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body)
  })

  const result = await response.json()
  if (result.error) throw new Error(result.error.message)
  if (!result.choices?.[0]?.message?.content) {
    throw new Error(`Invalid API response: ${JSON.stringify(result).slice(0, 200)}`)
  }
  return result.choices[0].message.content
}

// Generic OpenAI-compatible chat completion (used by DeepSeek and Cloudflare Workers AI)
async function callOpenAICompatible(url, apiKey, model, systemMessage, userMessage, jsonMode = true) {
  const body = {
    model,
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage }
    ]
  }
  if (jsonMode) body.response_format = { type: 'json_object' }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body)
  })

  const result = await response.json()
  if (result.error) throw new Error(result.error.message || JSON.stringify(result.error))
  if (!result.choices?.[0]?.message?.content) {
    throw new Error(`Invalid API response: ${JSON.stringify(result).slice(0, 200)}`)
  }
  return result.choices[0].message.content
}

// DeepSeek API (OpenAI-compatible)
async function callDeepSeek(apiKey, model, systemMessage, userMessage, jsonMode = true) {
  return callOpenAICompatible('https://api.deepseek.com/chat/completions', apiKey, model, systemMessage, userMessage, jsonMode)
}

// Cloudflare Workers AI (OpenAI-compatible endpoint). `accountId` is the Cloudflare account id.
function cloudflareUrl(accountId) {
  const id = (accountId || '').trim()
  if (!id) throw new Error('Cloudflare Account ID is required')
  return `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(id)}/ai/v1/chat/completions`
}

async function callCloudflare(apiKey, model, accountId, systemMessage, userMessage, jsonMode = false) {
  // Open-weight models on Workers AI don't reliably support json_object, so default it off
  // and rely on the prompt + the markdown-fence stripping in the parser.
  return callOpenAICompatible(cloudflareUrl(accountId), apiKey, model, systemMessage, userMessage, jsonMode)
}

// Anthropic Claude API
async function callAnthropic(apiKey, model, systemMessage, userMessage) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemMessage,
      messages: [
        { role: 'user', content: userMessage }
      ]
    })
  })

  const result = await response.json()
  if (result.error) throw new Error(result.error.message)
  return result.content[0].text
}

// Azure OpenAI API
async function callAzure(apiKey, model, endpoint, systemMessage, userMessage, jsonMode = true) {
  // Extract base URL (just the host part, strip any path)
  let baseUrl = endpoint.replace(/\/+$/, '')
  // If user pasted a full URL with /openai/deployments/..., extract just the base
  const openaiIndex = baseUrl.indexOf('/openai/')
  if (openaiIndex !== -1) {
    baseUrl = baseUrl.substring(0, openaiIndex)
  }
  const url = `${baseUrl}/openai/deployments/${encodeURIComponent(model)}/chat/completions?api-version=2025-01-01-preview`

  const body = {
    model,
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage }
    ]
  }

  if (jsonMode) {
    body.response_format = { type: 'json_object' }
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body)
  })

  const result = await response.json()
  
  if (result.error) {
    throw new Error(result.error.message || JSON.stringify(result.error))
  }
  
  if (!result.choices || !Array.isArray(result.choices) || result.choices.length === 0) {
    console.error('Unexpected Azure API response:', JSON.stringify(result, null, 2))
    throw new Error(`Invalid API response: missing choices array. Response: ${JSON.stringify(result).slice(0, 200)}`)
  }
  
  if (!result.choices[0].message?.content) {
    throw new Error(`Empty response from Azure API: no message content`)
  }
  
  return result.choices[0].message.content
}

// AWS Bedrock API
async function callBedrock(apiKey, model, region, systemMessage, userMessage) {
  const endpoint = `https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(model)}/converse`

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      messages: [
        {
          role: 'user',
          content: [{ text: userMessage }]
        }
      ],
      system: [{ text: systemMessage }],
      inferenceConfig: {
        temperature: 0.3,
        maxTokens: 4096,
      }
    })
  })

  const result = await response.json()
  if (result.message) throw new Error(result.message)
  return result.output.message.content[0].text
}

// GitHub Models API
async function callGitHubModels(apiKey, model, systemMessage, userMessage) {
  const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userMessage }
      ]
    })
  })

  const result = await response.json()
  if (result.error) throw new Error(result.error.message)
  if (!result.choices?.[0]?.message?.content) {
    throw new Error(`Invalid API response: ${JSON.stringify(result).slice(0, 200)}`)
  }
  return result.choices[0].message.content
}

async function translateSingleText(text, targetLangs, config, protectedWords = []) {
  const { provider, apiKey, model, region, endpoint, serviceTier } = config
  const { systemMessage, userMessage } = buildPrompt(text, targetLangs, protectedWords)

  try {
    let content
    switch (provider) {
      case 'openai':
        content = await callOpenAI(apiKey, model, systemMessage, userMessage, serviceTier)
        break
      case 'azure':
        content = await callAzure(apiKey, model, endpoint, systemMessage, userMessage)
        break
      case 'bedrock':
        content = await callBedrock(apiKey, model, region, systemMessage, userMessage)
        break
      case 'github':
        content = await callGitHubModels(apiKey, model, systemMessage, userMessage)
        break
      case 'deepseek':
        content = await callDeepSeek(apiKey, model, systemMessage, userMessage)
        break
      case 'cloudflare':
        content = await callCloudflare(apiKey, model, endpoint, systemMessage, userMessage)
        break
      default:
        throw new Error(`Unknown provider: ${provider}`)
    }

    // Parse JSON response - strip markdown code blocks if present
    let jsonContent = content.trim()
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.slice(7)
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.slice(3)
    }
    if (jsonContent.endsWith('```')) {
      jsonContent = jsonContent.slice(0, -3)
    }
    jsonContent = jsonContent.trim()

    const parsed = JSON.parse(jsonContent)
    return { translations: parsed.translations || {}, error: null }
  } catch (error) {
    console.error('Translation error:', error.message || error)
    return { translations: {}, error: error.message || 'Unknown error' }
  }
}

// Translate multiple texts in a single API call
async function translateBatch(texts, targetLangs, config, protectedWords = []) {
  const { provider, apiKey, model, region, endpoint, serviceTier } = config
  const { systemMessage, userMessage } = buildBatchPrompt(texts, targetLangs, protectedWords)

  try {
    let content
    switch (provider) {
      case 'openai':
        content = await callOpenAI(apiKey, model, systemMessage, userMessage, serviceTier)
        break
      case 'azure':
        content = await callAzure(apiKey, model, endpoint, systemMessage, userMessage)
        break
      case 'bedrock':
        content = await callBedrock(apiKey, model, region, systemMessage, userMessage)
        break
      case 'github':
        content = await callGitHubModels(apiKey, model, systemMessage, userMessage)
        break
      case 'deepseek':
        content = await callDeepSeek(apiKey, model, systemMessage, userMessage)
        break
      case 'cloudflare':
        content = await callCloudflare(apiKey, model, endpoint, systemMessage, userMessage)
        break
      default:
        throw new Error(`Unknown provider: ${provider}`)
    }

    // Parse JSON response - strip markdown code blocks if present
    let jsonContent = content.trim()
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.slice(7)
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.slice(3)
    }
    if (jsonContent.endsWith('```')) {
      jsonContent = jsonContent.slice(0, -3)
    }
    jsonContent = jsonContent.trim()

    const parsed = JSON.parse(jsonContent)

    // Map results back to original texts
    const results = texts.map((t, i) => ({
      key: t.key,
      englishText: t.text,
      translations: parsed[String(i)] || parsed[i] || {},
      error: null,
      missingLangs: t.missingLangs
    }))

    return { results, error: null }
  } catch (error) {
    console.error('Batch translation error:', error.message || error)
    // Return error for all texts in batch
    return {
      results: texts.map(t => ({
        key: t.key,
        englishText: t.text,
        translations: {},
        error: error.message || 'Unknown error',
        missingLangs: t.missingLangs
      })),
      error: error.message
    }
  }
}

// Test API connection
export async function testApiConnection(config) {
  const { provider, apiKey, model, region, endpoint, serviceTier } = config
  const testMessage = "Say 'API connection successful' in exactly those words."

  try {
    let response
    switch (provider) {
      case 'openai': {
        const body = {
          model,
          max_completion_tokens: 20,
          messages: [{ role: 'user', content: testMessage }]
        }
        if (serviceTier && serviceTier !== 'auto') {
          body.service_tier = serviceTier
        }
        response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body)
        })
        break
      }

      case 'anthropic':
        response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model,
            max_tokens: 20,
            messages: [{ role: 'user', content: testMessage }]
          })
        })
        break

      case 'azure': {
        let baseUrl = endpoint.replace(/\/+$/, '')
        const openaiIndex = baseUrl.indexOf('/openai/')
        if (openaiIndex !== -1) {
          baseUrl = baseUrl.substring(0, openaiIndex)
        }
        const url = `${baseUrl}/openai/deployments/${encodeURIComponent(model)}/chat/completions?api-version=2025-01-01-preview`
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: testMessage }]
          })
        })
        break
      }

      case 'bedrock':
        response = await fetch(`https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(model)}/converse`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: [{ text: testMessage }] }],
            inferenceConfig: { maxTokens: 20 }
          })
        })
        break

      case 'github':
        response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            max_tokens: 20,
            messages: [{ role: 'user', content: testMessage }]
          })
        })
        break

      case 'deepseek':
        response = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            max_tokens: 20,
            messages: [{ role: 'user', content: testMessage }]
          })
        })
        break

      case 'cloudflare':
        response = await fetch(cloudflareUrl(endpoint), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            max_tokens: 20,
            messages: [{ role: 'user', content: testMessage }]
          })
        })
        break

      default:
        throw new Error(`Unknown provider: ${provider}`)
    }

    const result = await response.json()

    // Check for errors in response
    if (result.error) {
      throw new Error(result.error.message || JSON.stringify(result.error))
    }
    if (result.message && provider === 'bedrock') {
      throw new Error(result.message)
    }

    return { success: true, message: 'API connection successful!' }
  } catch (error) {
    return { success: false, message: error.message }
  }
}

// Simple text completion for ASO keyword generation and similar tasks
export async function translateText(prompt, sourceLocale, targetLocale, config) {
  const { provider, apiKey, model, region, endpoint, serviceTier } = config

  const systemMessage = "You are a helpful assistant. Follow the user's instructions precisely and respond with only the requested output."

  try {
    let content
    switch (provider) {
      case 'openai': {
        const body = {
          model,
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: prompt }
          ],
        }
        if (serviceTier && serviceTier !== 'auto') {
          body.service_tier = serviceTier
        }
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body)
        })
        const openaiResult = await openaiResponse.json()
        if (openaiResult.error) throw new Error(openaiResult.error.message)
        if (!openaiResult.choices?.[0]?.message?.content) {
          throw new Error(`Invalid API response: ${JSON.stringify(openaiResult).slice(0, 200)}`)
        }
        content = openaiResult.choices[0].message.content
        break
      }
      case 'azure':
        content = await callAzure(apiKey, model, endpoint, systemMessage, prompt, false)
        break
      case 'bedrock':
        content = await callBedrock(apiKey, model, region, systemMessage, prompt)
        break
      case 'github':
        content = await callGitHubModels(apiKey, model, systemMessage, prompt)
        break
      case 'deepseek':
        content = await callDeepSeek(apiKey, model, systemMessage, prompt, false)
        break
      case 'cloudflare':
        content = await callCloudflare(apiKey, model, endpoint, systemMessage, prompt, false)
        break
      default:
        throw new Error(`Unknown provider: ${provider}`)
    }

    // Clean up response
    let result = content.trim()
    if (result.startsWith('```')) {
      result = result.replace(/^```\w*\n?/, '').replace(/```$/, '').trim()
    }
    return result
  } catch (error) {
    throw new Error(error.message || 'Translation failed')
  }
}

export async function translateStrings(xcstringsData, targetLanguages, config, protectedWords = [], onProgress, concurrency = DEFAULT_CONCURRENT_REQUESTS, batchSize = DEFAULT_TEXTS_PER_BATCH) {
  const data = JSON.parse(JSON.stringify(xcstringsData)) // Deep clone
  const strings = data.strings || {}

  // Collect texts that need translation
  const textsToTranslate = []

  for (const [key, value] of Object.entries(strings)) {
    if (!value || typeof value !== 'object') continue

    const localizations = value.localizations || {}
    const englishText = localizations.en?.stringUnit?.value || key

    if (!englishText || !englishText.trim()) continue

    // Find missing languages for this key
    const missingLangs = targetLanguages.filter(lang => !localizations[lang])

    if (missingLangs.length > 0) {
      textsToTranslate.push({
        key,
        englishText,
        missingLangs
      })
    }
  }

  if (textsToTranslate.length === 0) {
    onProgress({
      current: 0,
      total: 0,
      currentText: 'No translations needed',
      log: 'All strings are already translated for selected languages',
      logType: 'info'
    })
    return data
  }

  const total = textsToTranslate.length
  let current = 0

  // Group texts into batches for API calls (multiple texts per call)
  // Then run multiple API calls in parallel (concurrency)
  const apiBatches = []
  for (let i = 0; i < textsToTranslate.length; i += batchSize) {
    apiBatches.push(textsToTranslate.slice(i, i + batchSize).map(t => ({
      key: t.key,
      text: t.englishText,
      missingLangs: t.missingLangs
    })))
  }

  onProgress({
    current: 0,
    total,
    currentText: 'Starting translations...',
    log: `Translating ${total} strings in ${apiBatches.length} batches (${batchSize} texts/batch, ${concurrency} parallel)`,
    logType: 'info'
  })

  // Process API batches with concurrency
  for (let i = 0; i < apiBatches.length; i += concurrency) {
    const parallelBatches = apiBatches.slice(i, i + concurrency)

    const promises = parallelBatches.map(batch =>
      translateBatch(batch, targetLanguages, config, protectedWords)
    )

    const batchResults = await Promise.all(promises)

    // Flatten results from all parallel batches
    const results = batchResults.flatMap(br => br.results)

    for (const { key, englishText, translations, error, missingLangs } of results) {
      current++

      const truncatedText = englishText.length > 40
        ? englishText.substring(0, 40) + '...'
        : englishText

      // If there was an error, log it and continue
      if (error) {
        onProgress({
          current,
          total,
          currentText: truncatedText,
          log: `Error translating "${truncatedText}": ${error}`,
          logType: 'error'
        })
        continue
      }

      // Ensure localizations object exists
      if (!strings[key].localizations) {
        strings[key].localizations = {}
      }

      // Ensure English is present
      if (!strings[key].localizations.en) {
        strings[key].localizations.en = {
          stringUnit: {
            state: 'translated',
            value: englishText
          }
        }
      }

      // Add translations
      let addedCount = 0
      for (const lang of missingLangs) {
        const translation = translations[lang]
        if (translation) {
          strings[key].localizations[lang] = {
            stringUnit: {
              state: 'translated',
              value: translation
            }
          }
          addedCount++
        }
      }

      onProgress({
        current,
        total,
        currentText: truncatedText,
        log: `Translated "${truncatedText}" to ${addedCount} languages`,
        logType: addedCount > 0 ? 'success' : 'error'
      })
    }

    // Add delay between batches
    if (i + batchSize < textsToTranslate.length) {
      await delay(REQUEST_DELAY)
    }
  }

  return data
}
