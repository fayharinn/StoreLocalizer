// LLM Service - ES module for AI translation and title generation
// Migrated from vanilla JS files (llm.js and magical-titles.js)

/**
 * Parse a data URL into its components
 * @param {string} dataUrl - Data URL string
 * @returns {{ mimeType: string, base64: string } | null}
 */
export function parseDataUrl(dataUrl) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return {
    mimeType: match[1],
    base64: match[2],
  };
}

// ---------------------------------------------------------------------------
// Translation functions (text-only prompts)
// ---------------------------------------------------------------------------

/**
 * Translate text using Anthropic Claude API
 * @param {string} apiKey - Anthropic API key
 * @param {string} prompt - Text prompt
 * @param {string} model - Model ID
 * @returns {Promise<string>} - Response text
 */
export async function translateWithAnthropic(apiKey, prompt, model) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const status = response.status;
    const errorBody = await response.json().catch(() => ({}));
    if (status === 401 || status === 403) throw new Error('AI_UNAVAILABLE');
    throw new Error(
      `API request failed: ${status} - ${errorBody.error?.message || 'Unknown error'}`
    );
  }

  const data = await response.json();
  return data.content[0].text;
}

/**
 * Translate text using OpenAI API
 * @param {string} apiKey - OpenAI API key
 * @param {string} prompt - Text prompt
 * @param {string} model - Model ID
 * @returns {Promise<string>} - Response text
 */
export async function translateWithOpenAI(apiKey, prompt, model) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_completion_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const status = response.status;
    const errorBody = await response.json().catch(() => ({}));
    if (status === 401 || status === 403) throw new Error('AI_UNAVAILABLE');
    throw new Error(
      `API request failed: ${status} - ${errorBody.error?.message || 'Unknown error'}`
    );
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * Translate text using Azure OpenAI API
 * @param {string} apiKey - Azure API key
 * @param {string} prompt - Text prompt
 * @param {string} model - Deployment name
 * @param {string} endpoint - Azure endpoint URL
 * @returns {Promise<string>} - Response text
 */
export async function translateWithAzure(apiKey, prompt, model, endpoint) {
  if (!endpoint) {
    throw new Error('Azure endpoint not configured');
  }
  const baseUrl = endpoint.replace(/\/+$/, '');
  const url = `${baseUrl}/openai/deployments/${model}/chat/completions?api-version=2024-08-01-preview`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      max_completion_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const status = response.status;
    const errorBody = await response.json().catch(() => ({}));
    if (status === 401 || status === 403) throw new Error('AI_UNAVAILABLE');
    throw new Error(
      `API request failed: ${status} - ${errorBody.error?.message || 'Unknown error'}`
    );
  }

  const data = await response.json();
  if (!data.choices?.[0]?.message?.content) {
    throw new Error('Invalid Azure API response');
  }
  return data.choices[0].message.content;
}

/**
 * Translate text using Google Gemini API
 * @param {string} apiKey - Google API key
 * @param {string} prompt - Text prompt
 * @param {string} model - Model ID
 * @returns {Promise<string>} - Response text
 */
export async function translateWithGoogle(apiKey, prompt, model) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    }
  );

  if (!response.ok) {
    const status = response.status;
    const errorBody = await response.json().catch(() => ({}));
    if (status === 401 || status === 403 || status === 400) throw new Error('AI_UNAVAILABLE');
    throw new Error(
      `API request failed: ${status} - ${errorBody.error?.message || 'Unknown error'}`
    );
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

/**
 * Translate text using GitHub Models API
 * @param {string} apiKey - GitHub API token
 * @param {string} prompt - Text prompt
 * @param {string} model - Model ID
 * @returns {Promise<string>} - Response text
 */
export async function translateWithGitHub(apiKey, prompt, model) {
  const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const status = response.status;
    const errorBody = await response.json().catch(() => ({}));
    if (status === 401 || status === 403) throw new Error('AI_UNAVAILABLE');
    throw new Error(
      `API request failed: ${status} - ${errorBody.error?.message || 'Unknown error'}`
    );
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * Translate text using AWS Bedrock Converse API
 * @param {string} apiKey - AWS credentials / bearer token
 * @param {string} prompt - Text prompt
 * @param {string} model - Model ID
 * @param {string} region - AWS region
 * @returns {Promise<string>} - Response text
 */
export async function translateWithBedrock(apiKey, prompt, model, region) {
  const url = `https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(model)}/converse`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: [{ text: prompt }] }],
      system: [{ text: 'You are a professional translator for app store content.' }],
      inferenceConfig: {
        temperature: 0.3,
        maxTokens: 4096,
      },
    }),
  });

  if (!response.ok) {
    const status = response.status;
    const errorBody = await response.json().catch(() => ({}));
    if (status === 401 || status === 403) throw new Error('AI_UNAVAILABLE');
    throw new Error(
      `API request failed: ${status} - ${errorBody.message || 'Unknown error'}`
    );
  }

  const data = await response.json();
  if (data.message) throw new Error(data.message);
  return data.output.message.content[0].text;
}

// ---------------------------------------------------------------------------
// Vision / title generation functions (image + text prompts)
// ---------------------------------------------------------------------------

/**
 * Generate titles using Anthropic Claude vision API
 * @param {string} apiKey - Anthropic API key
 * @param {Array<{ mimeType: string, base64: string }>} images - Images to analyze
 * @param {string} prompt - Text prompt
 * @param {string} model - Model ID
 * @returns {Promise<string>} - Response text
 */
export async function generateTitlesWithAnthropic(apiKey, images, prompt, model) {
  const content = [];

  for (const img of images) {
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: img.mimeType,
        data: img.base64,
      },
    });
  }

  content.push({ type: 'text', text: prompt });

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: [{ role: 'user', content }],
    }),
  });

  if (!response.ok) {
    const status = response.status;
    const errorBody = await response.json().catch(() => ({}));
    if (status === 401 || status === 403) throw new Error('AI_UNAVAILABLE');
    throw new Error(
      `API request failed: ${status} - ${errorBody.error?.message || 'Unknown error'}`
    );
  }

  const data = await response.json();
  return data.content[0].text;
}

/**
 * Generate titles using OpenAI GPT vision API
 * @param {string} apiKey - OpenAI API key
 * @param {Array<{ mimeType: string, base64: string }>} images - Images to analyze
 * @param {string} prompt - Text prompt
 * @param {string} model - Model ID
 * @returns {Promise<string>} - Response text
 */
export async function generateTitlesWithOpenAI(apiKey, images, prompt, model) {
  const content = [];

  for (const img of images) {
    content.push({
      type: 'image_url',
      image_url: {
        url: `data:${img.mimeType};base64,${img.base64}`,
      },
    });
  }

  content.push({ type: 'text', text: prompt });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_completion_tokens: 4096,
      messages: [{ role: 'user', content }],
    }),
  });

  if (!response.ok) {
    const status = response.status;
    const errorBody = await response.json().catch(() => ({}));
    if (status === 401 || status === 403) throw new Error('AI_UNAVAILABLE');
    throw new Error(
      `API request failed: ${status} - ${errorBody.error?.message || 'Unknown error'}`
    );
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * Generate titles using Azure OpenAI vision API
 * @param {string} apiKey - Azure API key
 * @param {Array<{ mimeType: string, base64: string }>} images - Images to analyze
 * @param {string} prompt - Text prompt
 * @param {string} model - Deployment name
 * @param {string} endpoint - Azure endpoint URL
 * @returns {Promise<string>} - Response text
 */
export async function generateTitlesWithAzure(apiKey, images, prompt, model, endpoint) {
  if (!endpoint) {
    throw new Error('Azure endpoint not configured');
  }
  const baseUrl = endpoint.replace(/\/+$/, '');
  const url = `${baseUrl}/openai/deployments/${model}/chat/completions?api-version=2024-08-01-preview`;

  const content = [];
  for (const img of images) {
    content.push({
      type: 'image_url',
      image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
    });
  }
  content.push({ type: 'text', text: prompt });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      max_completion_tokens: 4096,
      messages: [{ role: 'user', content }],
    }),
  });

  if (!response.ok) {
    const status = response.status;
    const errorBody = await response.json().catch(() => ({}));
    if (status === 401 || status === 403) throw new Error('AI_UNAVAILABLE');
    throw new Error(
      `API request failed: ${status} - ${errorBody.error?.message || 'Unknown error'}`
    );
  }

  const data = await response.json();
  if (!data.choices?.[0]?.message?.content) {
    throw new Error('Invalid Azure API response');
  }
  return data.choices[0].message.content;
}

/**
 * Generate titles using Google Gemini vision API
 * @param {string} apiKey - Google API key
 * @param {Array<{ mimeType: string, base64: string }>} images - Images to analyze
 * @param {string} prompt - Text prompt
 * @param {string} model - Model ID
 * @returns {Promise<string>} - Response text
 */
export async function generateTitlesWithGoogle(apiKey, images, prompt, model) {
  const parts = [];

  for (const img of images) {
    parts.push({
      inlineData: {
        mimeType: img.mimeType,
        data: img.base64,
      },
    });
  }

  parts.push({ text: prompt });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts }],
      }),
    }
  );

  if (!response.ok) {
    const status = response.status;
    const errorBody = await response.json().catch(() => ({}));
    if (status === 401 || status === 403 || status === 400) throw new Error('AI_UNAVAILABLE');
    throw new Error(
      `API request failed: ${status} - ${errorBody.error?.message || 'Unknown error'}`
    );
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

/**
 * Generate titles using GitHub Models vision API
 * @param {string} apiKey - GitHub API token
 * @param {Array<{ mimeType: string, base64: string }>} images - Images to analyze
 * @param {string} prompt - Text prompt
 * @param {string} model - Model ID
 * @returns {Promise<string>} - Response text
 */
export async function generateTitlesWithGitHub(apiKey, images, prompt, model) {
  const content = [];

  for (const img of images) {
    content.push({
      type: 'image_url',
      image_url: {
        url: `data:${img.mimeType};base64,${img.base64}`,
      },
    });
  }

  content.push({ type: 'text', text: prompt });

  const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content }],
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const status = response.status;
    const errorBody = await response.json().catch(() => ({}));
    if (status === 401 || status === 403) throw new Error('AI_UNAVAILABLE');
    throw new Error(
      `API request failed: ${status} - ${errorBody.error?.message || 'Unknown error'}`
    );
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * Generate titles using AWS Bedrock Converse vision API
 * @param {string} apiKey - AWS credentials / bearer token
 * @param {Array<{ mimeType: string, base64: string }>} images - Images to analyze
 * @param {string} prompt - Text prompt
 * @param {string} model - Model ID
 * @param {string} region - AWS region
 * @returns {Promise<string>} - Response text
 */
export async function generateTitlesWithBedrock(apiKey, images, prompt, model, region) {
  const url = `https://bedrock-runtime.${region}.amazonaws.com/model/${encodeURIComponent(model)}/converse`;

  const content = [];

  for (const img of images) {
    content.push({
      image: {
        format: img.mimeType.split('/')[1] || 'png',
        source: { bytes: img.base64 },
      },
    });
  }

  content.push({ text: prompt });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content }],
      system: [{ text: 'You are an expert App Store marketing copywriter.' }],
      inferenceConfig: {
        temperature: 0.3,
        maxTokens: 4096,
      },
    }),
  });

  if (!response.ok) {
    const status = response.status;
    const errorBody = await response.json().catch(() => ({}));
    if (status === 401 || status === 403) throw new Error('AI_UNAVAILABLE');
    throw new Error(
      `API request failed: ${status} - ${errorBody.message || 'Unknown error'}`
    );
  }

  const data = await response.json();
  if (data.message) throw new Error(data.message);
  return data.output.message.content[0].text;
}

// ---------------------------------------------------------------------------
// Dispatcher functions
// ---------------------------------------------------------------------------

// --- DeepSeek & Cloudflare Workers AI (OpenAI-compatible) ---

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

function cloudflareChatUrl(accountId) {
  const id = (accountId || '').trim();
  if (!id) throw new Error('Cloudflare Account ID is required');
  return `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(id)}/ai/v1/chat/completions`;
}

async function postOpenAICompatible(url, apiKey, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const status = response.status;
    const errorBody = await response.json().catch(() => ({}));
    if (status === 401 || status === 403) throw new Error('AI_UNAVAILABLE');
    throw new Error(
      `API request failed: ${status} - ${errorBody.error?.message || 'Unknown error'}`
    );
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

function buildVisionContent(images, prompt) {
  const content = [];
  for (const img of images) {
    content.push({
      type: 'image_url',
      image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
    });
  }
  content.push({ type: 'text', text: prompt });
  return content;
}

export async function translateWithDeepSeek(apiKey, prompt, model) {
  return postOpenAICompatible(DEEPSEEK_URL, apiKey, {
    model,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });
}

export async function translateWithCloudflare(apiKey, prompt, model, accountId) {
  return postOpenAICompatible(cloudflareChatUrl(accountId), apiKey, {
    model,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });
}

export async function generateTitlesWithDeepSeek(apiKey, images, prompt, model) {
  return postOpenAICompatible(DEEPSEEK_URL, apiKey, {
    model,
    max_tokens: 4096,
    messages: [{ role: 'user', content: buildVisionContent(images, prompt) }],
  });
}

export async function generateTitlesWithCloudflare(apiKey, images, prompt, model, accountId) {
  return postOpenAICompatible(cloudflareChatUrl(accountId), apiKey, {
    model,
    max_tokens: 4096,
    messages: [{ role: 'user', content: buildVisionContent(images, prompt) }],
  });
}

/**
 * Translate text using the specified AI provider
 * @param {string} provider - Provider key (anthropic, openai, azure, google, github, bedrock)
 * @param {string} apiKey - API key for the provider
 * @param {string} prompt - Text prompt to send
 * @param {string} model - Model ID
 * @param {Object} [options] - Additional options
 * @param {string} [options.endpoint] - Azure endpoint URL
 * @param {string} [options.region] - AWS Bedrock region
 * @returns {Promise<string>} - Translated text response
 */
export async function translateText(provider, apiKey, prompt, model, options = {}) {
  switch (provider) {
    case 'anthropic':
      return translateWithAnthropic(apiKey, prompt, model);
    case 'openai':
      return translateWithOpenAI(apiKey, prompt, model);
    case 'azure':
      return translateWithAzure(apiKey, prompt, model, options.endpoint);
    case 'google':
      return translateWithGoogle(apiKey, prompt, model);
    case 'github':
      return translateWithGitHub(apiKey, prompt, model);
    case 'bedrock':
      return translateWithBedrock(apiKey, prompt, model, options.region);
    case 'deepseek':
      return translateWithDeepSeek(apiKey, prompt, model);
    case 'cloudflare':
      return translateWithCloudflare(apiKey, prompt, model, options.endpoint);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Generate titles from screenshots using the specified AI provider
 * @param {string} provider - Provider key (anthropic, openai, azure, google, github, bedrock)
 * @param {string} apiKey - API key for the provider
 * @param {Array<{ mimeType: string, base64: string }>} images - Images to analyze
 * @param {string} prompt - Text prompt to send
 * @param {string} model - Model ID
 * @param {Object} [options] - Additional options
 * @param {string} [options.endpoint] - Azure endpoint URL
 * @param {string} [options.region] - AWS Bedrock region
 * @returns {Promise<string>} - Generated titles response
 */
export async function generateTitles(provider, apiKey, images, prompt, model, options = {}) {
  switch (provider) {
    case 'anthropic':
      return generateTitlesWithAnthropic(apiKey, images, prompt, model);
    case 'openai':
      return generateTitlesWithOpenAI(apiKey, images, prompt, model);
    case 'azure':
      return generateTitlesWithAzure(apiKey, images, prompt, model, options.endpoint);
    case 'google':
      return generateTitlesWithGoogle(apiKey, images, prompt, model);
    case 'github':
      return generateTitlesWithGitHub(apiKey, images, prompt, model);
    case 'bedrock':
      return generateTitlesWithBedrock(apiKey, images, prompt, model, options.region);
    case 'deepseek':
      return generateTitlesWithDeepSeek(apiKey, images, prompt, model);
    case 'cloudflare':
      return generateTitlesWithCloudflare(apiKey, images, prompt, model, options.endpoint);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
