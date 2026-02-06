/**
 * Cloudflare Worker to proxy App Store Connect and Google Play API requests
 * This bypasses CORS restrictions in production
 */

const ASC_API_BASE = 'https://api.appstoreconnect.apple.com'
const GP_API_BASE = 'https://androidpublisher.googleapis.com'
const GP_STORE_BASE = 'https://play.google.com'

// Allowed origins
const ALLOWED_ORIGINS = [
  'https://localizer.fayhe.com',
  'https://xcstrings-localizer.pages.dev'
]

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin')
    const url = new URL(request.url)

    // Validate origin
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return new Response(JSON.stringify({
        error: 'Forbidden',
        message: 'Origin not allowed'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const corsOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]

    // Show info page for root path
    if (url.pathname === '/' || url.pathname === '') {
      return new Response(JSON.stringify({
        status: 'running'
      }, null, 2), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': corsOrigin,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        }
      })
    }

    const path = url.pathname

    // Play Store scraping doesn't need auth
    if (path.startsWith('/playstore/')) {
      return await handlePlayStoreScrape(path, url, corsOrigin)
    }

    // Check for Authorization header (required for API calls)
    if (!request.headers.get('Authorization')) {
      return new Response(JSON.stringify({
        error: 'Missing Authorization header'
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': corsOrigin,
        }
      })
    }
    let targetUrl

    // Route to appropriate API based on path
    if (path.startsWith('/androidpublisher/')) {
      // Google Play API
      targetUrl = `${GP_API_BASE}${path}${url.search}`
    } else {
      // Default to App Store Connect API
      targetUrl = `${ASC_API_BASE}${path}${url.search}`
    }

    try {
      const contentType = request.headers.get('Content-Type')
      const headers = {
        'Authorization': request.headers.get('Authorization'),
      }
      
      // Preserve original Content-Type for image uploads etc.
      if (contentType) {
        headers['Content-Type'] = contentType
      }

      const response = await fetch(targetUrl, {
        method: request.method,
        headers,
        body: request.method !== 'GET' && request.method !== 'HEAD'
          ? await request.arrayBuffer()
          : undefined,
      })

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          'Content-Type': response.headers.get('Content-Type') || 'application/json',
          'Access-Control-Allow-Origin': corsOrigin,
        },
      })
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': corsOrigin,
        }
      })
    }
  }
}

/**
 * Handle Google Play Store page scraping for developer apps
 * Fetches the public developer page and extracts app package names
 */
async function handlePlayStoreScrape(path, url, corsOrigin) {
  // Extract developer ID from path: /playstore/dev/{developerId}
  const match = path.match(/^\/playstore\/dev\/(\d+)$/)
  
  if (!match) {
    return new Response(JSON.stringify({
      error: 'Invalid path. Use /playstore/dev/{developerId}'
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': corsOrigin,
      }
    })
  }

  const developerId = match[1]
  const storeUrl = `${GP_STORE_BASE}/store/apps/dev?id=${developerId}&hl=en`

  try {
    const response = await fetch(storeUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    })

    if (!response.ok) {
      return new Response(JSON.stringify({
        error: `Failed to fetch developer page: ${response.status}`
      }), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': corsOrigin,
        }
      })
    }

    const html = await response.text()
    
    // Extract app package names from the HTML
    // Links look like: /store/apps/details?id=com.example.app
    const packageRegex = /\/store\/apps\/details\?id=([a-zA-Z0-9._]+)/g
    const packages = new Set()
    let packageMatch
    
    while ((packageMatch = packageRegex.exec(html)) !== null) {
      packages.add(packageMatch[1])
    }

    // Extract app names and icons
    const apps = []
    const packageList = Array.from(packages)
    
    for (const pkg of packageList) {
      // Try to find the app name
      const nameRegex = new RegExp(`aria-label="([^"]+)"[^>]*href="[^"]*\\/store\\/apps\\/details\\?id=${pkg.replace(/\./g, '\\.')}`, 'i')
      const nameMatch = html.match(nameRegex)
      
      // Try to find icon URL
      const iconRegex = new RegExp(`<img[^>]*src="(https://play-lh\\.googleusercontent\\.com/[^"]+)"[^>]*>[^<]*<[^>]*href="[^"]*\\/store\\/apps\\/details\\?id=${pkg.replace(/\./g, '\\.')}`, 'i')
      const iconMatch = html.match(iconRegex)
      
      let iconUrl = iconMatch ? iconMatch[1] : null
      if (!iconUrl) {
        const srcsetRegex = new RegExp(`srcset="(https://play-lh\\.googleusercontent\\.com/[^"\\s]+)[^"]*"[^>]*>[^<]*<[^>]*href="[^"]*\\/store\\/apps\\/details\\?id=${pkg.replace(/\./g, '\\.')}`, 'i')
        const srcsetMatch = html.match(srcsetRegex)
        iconUrl = srcsetMatch ? srcsetMatch[1] : null
      }
      
      apps.push({
        packageName: pkg,
        name: nameMatch ? nameMatch[1] : pkg,
        icon: iconUrl,
        storeUrl: `https://play.google.com/store/apps/details?id=${pkg}`
      })
    }

    return new Response(JSON.stringify({
      developerId,
      apps,
      count: apps.length
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': corsOrigin,
      }
    })
  } catch (error) {
    return new Response(JSON.stringify({
      error: `Scraping failed: ${error.message}`
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': corsOrigin,
      }
    })
  }
}
