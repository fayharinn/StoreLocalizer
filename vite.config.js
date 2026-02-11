import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// Custom plugin to handle Play Store scraping in dev mode
const playstoreScraperPlugin = () => ({
  name: 'playstore-scraper',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (!req.url?.startsWith('/api/googleplay/playstore/dev/')) {
        return next()
      }
      
      const match = req.url.match(/\/playstore\/dev\/(\d+)/)
      if (!match) {
        res.statusCode = 400
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: 'Invalid developer ID' }))
        return
      }

      const developerId = match[1]
      const storeUrl = `https://play.google.com/store/apps/dev?id=${developerId}&hl=en`

      try {
        const response = await fetch(storeUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Accept': 'text/html',
          }
        })

        if (!response.ok) {
          res.statusCode = response.status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: `Failed to fetch: ${response.status}` }))
          return
        }

        const html = await response.text()
        
        // Extract package names
        const packageRegex = /\/store\/apps\/details\?id=([a-zA-Z0-9._]+)/g
        const packages = new Set()
        let packageMatch
        while ((packageMatch = packageRegex.exec(html)) !== null) {
          packages.add(packageMatch[1])
        }

        // Extract app names and icons
        const apps = []
        for (const pkg of packages) {
          // Try to find app name
          const nameRegex = new RegExp(`aria-label="([^"]+)"[^>]*href="[^"]*\\/store\\/apps\\/details\\?id=${pkg.replace(/\./g, '\\.')}`, 'i')
          const nameMatch = html.match(nameRegex)
          
          // Try to find icon URL - look for img src near the app link
          // Icons are typically in format: https://play-lh.googleusercontent.com/...
          const iconRegex = new RegExp(`<img[^>]*src="(https://play-lh\\.googleusercontent\\.com/[^"]+)"[^>]*>[^<]*<[^>]*href="[^"]*\\/store\\/apps\\/details\\?id=${pkg.replace(/\./g, '\\.')}`, 'i')
          const iconMatch = html.match(iconRegex)
          
          // Alternative: look for srcset patterns
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

        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ developerId, apps, count: apps.length }))
      } catch (error) {
        res.statusCode = 500
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ error: error.message }))
      }
    })
  }
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), playstoreScraperPlugin()],
  // Set VITE_BASE_PATH=/xcstrings-localizer/ for GitHub Pages, otherwise defaults to /
  base: process.env.VITE_BASE_PATH || '/',
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    proxy: {
      '/api/appstoreconnect': {
        target: 'https://api.appstoreconnect.apple.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/appstoreconnect/, ''),
        secure: true,
      },
      '/api/googleplay/androidpublisher': {
        target: 'https://androidpublisher.googleapis.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/googleplay/, ''),
        secure: true,
      },
      '/api/itunes': {
        target: 'https://itunes.apple.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/itunes/, ''),
        secure: true,
      },
    },
  },
})
