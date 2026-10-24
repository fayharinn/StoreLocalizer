// Agent service — multi-provider LLM function calling and the agentic loop.
//
// Neutral message format used everywhere in the app (UI transcript + history):
//   { role: 'user',      content: string }
//   { role: 'assistant', content: string, toolCalls: [{ id, name, args }] }
//   { role: 'tool',      toolCallId: string, name: string, content: string, isError: boolean,
//                        images?: [{ url, name }], configError?: string,
//                        approval?: 'once' | 'always' | 'batch' | 'auto' | 'rejected' }
//
// A tool result may attach images (e.g. App Store screenshots). Adapters for
// vision-capable providers feed them to the model; the others just ignore them.
//
// Each provider adapter converts this neutral format to/from its native
// tool-calling wire format. Providers not listed in TOOL_CAPABLE_PROVIDERS
// (e.g. Cloudflare Workers AI, where support varies per open-weight model)
// are excluded from the agent page.

import { PROVIDERS, OPENAI_COMPATIBLE_URLS } from './translationService'

export const TOOL_CAPABLE_PROVIDERS = ['openai', 'anthropic', 'google', 'azure', 'bedrock', 'github', 'deepseek', 'xai', 'mistral', 'openrouter']

export function getToolCapableProviders() {
  return TOOL_CAPABLE_PROVIDERS.filter((id) => PROVIDERS[id]).map((id) => ({ id, name: PROVIDERS[id].name }))
}

let toolCallSeq = 0

function safeParseJson(text, fallback = {}) {
  if (typeof text !== 'string' || !text.trim()) return fallback
  try {
    return JSON.parse(text)
  } catch {
    return fallback
  }
}

// ---------------------------------------------------------------------------
// OpenAI-style Chat Completions (openai, azure, github, deepseek, xai, mistral, openrouter)
// ---------------------------------------------------------------------------

function toOpenAIMessages(systemPrompt, messages) {
  const result = [{ role: 'system', content: systemPrompt }]
  for (const m of messages) {
    if (m.role === 'user') {
      result.push({ role: 'user', content: m.content })
    } else if (m.role === 'assistant') {
      const entry = { role: 'assistant', content: m.content || null }
      if (m.toolCalls?.length) {
        entry.tool_calls = m.toolCalls.map((c) => ({
          id: c.id,
          type: 'function',
          function: { name: c.name, arguments: JSON.stringify(c.args || {}) },
        }))
      }
      result.push(entry)
    } else if (m.role === 'tool') {
      result.push({ role: 'tool', tool_call_id: m.toolCallId, content: m.content })
      // Attach tool-result images (screenshots) as a follow-up user message —
      // vision inputs must live in user messages on Chat Completions.
      if (m.images?.length) {
        const parts = [{ type: 'text', text: `Images attached by the ${m.name} tool:` }]
        for (const img of m.images) {
          parts.push({ type: 'text', text: img.name })
          parts.push({ type: 'image_url', image_url: { url: img.url } })
        }
        result.push({ role: 'user', content: parts })
      }
    }
  }
  return result
}

function openAIStyleUrl(config) {
  const { provider, model, endpoint } = config
  if (provider === 'openai') return 'https://api.openai.com/v1/chat/completions'
  if (OPENAI_COMPATIBLE_URLS[provider]) return OPENAI_COMPATIBLE_URLS[provider]
  if (provider === 'github') return 'https://models.inference.ai.azure.com/chat/completions'
  if (provider === 'azure') {
    let baseUrl = (endpoint || '').replace(/\/+$/, '')
    const openaiIndex = baseUrl.indexOf('/openai/')
    if (openaiIndex !== -1) baseUrl = baseUrl.substring(0, openaiIndex)
    return `${baseUrl}/openai/deployments/${encodeURIComponent(model)}/chat/completions?api-version=2025-01-01-preview`
  }
  throw new Error(`Unknown OpenAI-style provider: ${provider}`)
}

async function callOpenAIStyle(config, systemPrompt, messages, tools, signal) {
  const body = { model: config.model, messages: toOpenAIMessages(systemPrompt, messages) }
  if (tools?.length) {
    body.tools = tools.map((t) => ({
      type: 'function',
      function: { name: t.name, description: t.description, parameters: t.parameters },
    }))
  }
  if (config.provider === 'openai' && config.serviceTier && config.serviceTier !== 'auto') {
    body.service_tier = config.serviceTier
  }
  // gpt-5.6 and gpt-6 models default to a non-"none" reasoning effort, and Chat
  // Completions only accepts function tools with reasoning_effort "none".
  if (config.provider === 'openai' && tools?.length && /^gpt-(5\.6|6)/.test(config.model)) {
    body.reasoning_effort = 'none'
  }

  const response = await fetch(openAIStyleUrl(config), {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  })

  const result = await response.json().catch(() => null)
  if (result?.error) throw new Error(result.error.message || JSON.stringify(result.error))
  const message = result?.choices?.[0]?.message
  if (!response.ok || !message) {
    throw new Error(`Invalid API response (${response.status}): ${JSON.stringify(result).slice(0, 200)}`)
  }
  return {
    role: 'assistant',
    content: message.content || '',
    toolCalls: (message.tool_calls || []).map((c) => ({
      id: c.id,
      name: c.function?.name,
      args: safeParseJson(c.function?.arguments),
    })),
  }
}

// ---------------------------------------------------------------------------
// Anthropic Messages API
// ---------------------------------------------------------------------------

function toAnthropicMessages(messages) {
  const result = []
  let toolBatch = []
  const flushTools = () => {
    if (!toolBatch.length) return
    result.push({
      role: 'user',
      content: toolBatch.map((m) => ({
        type: 'tool_result',
        tool_use_id: m.toolCallId,
        content: m.content,
        is_error: !!m.isError,
      })),
    })
    toolBatch = []
  }

  for (const m of messages) {
    if (m.role === 'tool') {
      toolBatch.push(m)
      continue
    }
    flushTools()
    if (m.role === 'user') {
      result.push({ role: 'user', content: m.content })
    } else if (m.role === 'assistant') {
      const blocks = []
      if (m.content) blocks.push({ type: 'text', text: m.content })
      for (const c of m.toolCalls || []) {
        blocks.push({ type: 'tool_use', id: c.id, name: c.name, input: c.args || {} })
      }
      if (blocks.length) result.push({ role: 'assistant', content: blocks })
    }
  }
  flushTools()
  return result
}

async function callAnthropicAgent(config, systemPrompt, messages, tools, signal) {
  const body = {
    model: config.model,
    max_tokens: 8192,
    system: systemPrompt,
    messages: toAnthropicMessages(messages),
  }
  if (tools?.length) {
    body.tools = tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.parameters }))
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': config.apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
    signal,
  })

  const result = await response.json().catch(() => null)
  if (result?.error) throw new Error(result.error.message || JSON.stringify(result.error))
  if (!response.ok || !Array.isArray(result?.content)) {
    throw new Error(`Invalid Anthropic response (${response.status}): ${JSON.stringify(result).slice(0, 200)}`)
  }
  return {
    role: 'assistant',
    content: result.content.filter((b) => b.type === 'text').map((b) => b.text).join(''),
    toolCalls: result.content
      .filter((b) => b.type === 'tool_use')
      .map((b) => ({ id: b.id, name: b.name, args: b.input || {} })),
  }
}

// ---------------------------------------------------------------------------
// Google Gemini generateContent
// ---------------------------------------------------------------------------

// Gemini's v1beta function declarations reject some JSON Schema keywords
function sanitizeGeminiSchema(schema) {
  if (Array.isArray(schema)) return schema.map(sanitizeGeminiSchema)
  if (schema && typeof schema === 'object') {
    const out = {}
    for (const [key, value] of Object.entries(schema)) {
      if (key === 'additionalProperties' || key === '$schema' || key === 'default' || key === 'examples') continue
      out[key] = sanitizeGeminiSchema(value)
    }
    return out
  }
  return schema
}

function geminiResponsePayload(toolMessage) {
  const parsed = safeParseJson(toolMessage.content, null)
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
  return { result: parsed ?? toolMessage.content }
}

function toGeminiContents(messages) {
  const contents = []
  let toolBatch = []
  const flushTools = () => {
    if (!toolBatch.length) return
    contents.push({
      role: 'user',
      parts: toolBatch.map((m) => ({ functionResponse: { name: m.name, response: geminiResponsePayload(m) } })),
    })
    toolBatch = []
  }

  for (const m of messages) {
    if (m.role === 'tool') {
      toolBatch.push(m)
      continue
    }
    flushTools()
    if (m.role === 'user') {
      contents.push({ role: 'user', parts: [{ text: m.content }] })
    } else if (m.role === 'assistant') {
      const parts = []
      if (m.content) parts.push({ text: m.content })
      for (const c of m.toolCalls || []) {
        parts.push({ functionCall: { name: c.name, args: c.args || {} } })
      }
      if (parts.length) contents.push({ role: 'model', parts })
    }
  }
  flushTools()
  return contents
}

async function callGeminiAgent(config, systemPrompt, messages, tools, signal) {
  const body = {
    contents: toGeminiContents(messages),
    systemInstruction: { parts: [{ text: systemPrompt }] },
  }
  if (tools?.length) {
    body.tools = [{
      functionDeclarations: tools.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: sanitizeGeminiSchema(t.parameters),
      })),
    }]
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`,
    {
      method: 'POST',
      headers: {
        'x-goog-api-key': config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal,
    }
  )

  const result = await response.json().catch(() => null)
  if (result?.error) throw new Error(result.error.message || JSON.stringify(result.error))
  const parts = result?.candidates?.[0]?.content?.parts
  if (!response.ok || !Array.isArray(parts)) {
    throw new Error(`Invalid Gemini response (${response.status}): ${JSON.stringify(result).slice(0, 200)}`)
  }
  return {
    role: 'assistant',
    content: parts.filter((p) => p.text).map((p) => p.text).join(''),
    // Gemini doesn't return tool-call ids — generate stable unique ones
    toolCalls: parts
      .filter((p) => p.functionCall)
      .map((p) => ({
        id: `gemini_${Date.now().toString(36)}_${++toolCallSeq}`,
        name: p.functionCall.name,
        args: p.functionCall.args || {},
      })),
  }
}

// ---------------------------------------------------------------------------
// AWS Bedrock Converse API
// ---------------------------------------------------------------------------

function toBedrockMessages(messages) {
  const result = []
  let toolBatch = []
  const flushTools = () => {
    if (!toolBatch.length) return
    result.push({
      role: 'user',
      content: toolBatch.map((m) => ({
        toolResult: {
          toolUseId: m.toolCallId,
          content: [{ text: m.content }],
          status: m.isError ? 'error' : 'success',
        },
      })),
    })
    toolBatch = []
  }

  for (const m of messages) {
    if (m.role === 'tool') {
      toolBatch.push(m)
      continue
    }
    flushTools()
    if (m.role === 'user') {
      result.push({ role: 'user', content: [{ text: m.content }] })
    } else if (m.role === 'assistant') {
      const content = []
      if (m.content) content.push({ text: m.content })
      for (const c of m.toolCalls || []) {
        content.push({ toolUse: { toolUseId: c.id, name: c.name, input: c.args || {} } })
      }
      if (content.length) result.push({ role: 'assistant', content })
    }
  }
  flushTools()
  return result
}

async function callBedrockAgent(config, systemPrompt, messages, tools, signal) {
  const endpoint = `https://bedrock-runtime.${config.region}.amazonaws.com/model/${encodeURIComponent(config.model)}/converse`
  const body = {
    messages: toBedrockMessages(messages),
    system: [{ text: systemPrompt }],
    inferenceConfig: { maxTokens: 4096 },
  }
  if (tools?.length) {
    body.toolConfig = {
      tools: tools.map((t) => ({
        toolSpec: { name: t.name, description: t.description, inputSchema: { json: t.parameters } },
      })),
    }
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  })

  const result = await response.json().catch(() => null)
  if (!response.ok) throw new Error(result?.message || `Bedrock request failed (${response.status})`)
  const content = result?.output?.message?.content
  if (!Array.isArray(content)) {
    throw new Error(`Invalid Bedrock response: ${JSON.stringify(result).slice(0, 200)}`)
  }
  return {
    role: 'assistant',
    content: content.filter((b) => b.text).map((b) => b.text).join(''),
    toolCalls: content
      .filter((b) => b.toolUse)
      .map((b) => ({ id: b.toolUse.toolUseId, name: b.toolUse.name, args: b.toolUse.input || {} })),
  }
}

// ---------------------------------------------------------------------------
// Dispatch + agent loop
// ---------------------------------------------------------------------------

export async function callAgentModel(config, systemPrompt, messages, tools, signal) {
  switch (config.provider) {
    case 'openai':
    case 'azure':
    case 'github':
    case 'deepseek':
    case 'xai':
    case 'mistral':
    case 'openrouter':
      return callOpenAIStyle(config, systemPrompt, messages, tools, signal)
    case 'anthropic':
      return callAnthropicAgent(config, systemPrompt, messages, tools, signal)
    case 'google':
      return callGeminiAgent(config, systemPrompt, messages, tools, signal)
    case 'bedrock':
      return callBedrockAgent(config, systemPrompt, messages, tools, signal)
    default:
      throw new Error(`Provider "${config.provider}" does not support function calling`)
  }
}

/**
 * Trim history for the LLM request without breaking tool-call pairing:
 * always cut at a 'user' message boundary so no orphan tool results are sent.
 */
export function trimHistory(messages, maxMessages = 40) {
  if (messages.length <= maxMessages) return [...messages]
  let start = messages.length - maxMessages
  while (start < messages.length && messages[start].role !== 'user') start++
  if (start >= messages.length) {
    start = messages.map((m) => m.role).lastIndexOf('user')
    if (start === -1) start = messages.length - maxMessages
  }
  return messages.slice(start)
}

/**
 * Run the agentic loop: call the model, execute any requested tools, feed the
 * results back, and repeat until the model answers with plain text (or the
 * iteration cap is reached).
 *
 * @param {object} options
 * @param {object}   options.config       - { provider, apiKey, model, region, endpoint, serviceTier }
 * @param {string}   options.systemPrompt
 * @param {Array}    options.history      - neutral messages (see header comment)
 * @param {Array}    options.tools        - [{ name, description, parameters, write, execute }]
 * @param {Function} options.executeTool  - async ({ id, name, args }, batch) => { content, isError, approval? }
 *                                          `batch` is { key, calls, index } describing the tool calls the
 *                                          model requested in this turn — it lets the UI offer a single
 *                                          "allow all in this turn" decision instead of one prompt per call.
 * @param {Function} [options.onEvent]    - ({ type, message }) called as each new message is produced
 * @param {AbortSignal} [options.signal]
 * @param {number}   [options.maxIterations]
 * @returns {Promise<Array>} the full neutral message list (history + new messages)
 */
export async function runAgentLoop({
  config,
  systemPrompt,
  history,
  tools,
  executeTool,
  onEvent,
  signal,
  maxIterations = 12,
}) {
  const messages = [...history]

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const assistant = await callAgentModel(config, systemPrompt, messages, tools, signal)
    messages.push(assistant)
    onEvent?.({ type: 'assistant', message: assistant })

    if (!assistant.toolCalls?.length) return messages

    const calls = assistant.toolCalls
    // Stable id for this turn's batch of tool calls, so an "allow all in this
    // turn" decision can be scoped to it (call ids are unique per turn).
    const batchKey = calls[0]?.id || `batch_${iteration}`

    for (let index = 0; index < calls.length; index++) {
      const call = calls[index]
      if (signal?.aborted) throw new DOMException('The agent run was stopped', 'AbortError')
      const result = await executeTool(call, { key: batchKey, calls, index })
      const toolMessage = {
        role: 'tool',
        toolCallId: call.id,
        name: call.name,
        content: result.content,
        isError: !!result.isError,
        images: result.images,
        configError: result.configError,
        approval: result.approval,
      }
      messages.push(toolMessage)
      onEvent?.({ type: 'tool_result', message: toolMessage })
    }
  }

  const warning = {
    role: 'assistant',
    content: '⚠️ Stopped after reaching the maximum number of tool iterations for a single request. Send a new message to continue.',
    toolCalls: [],
  }
  messages.push(warning)
  onEvent?.({ type: 'assistant', message: warning })
  return messages
}
