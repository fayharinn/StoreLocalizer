// Regenerates the contributors grid in README.md between the
// <!-- contributors:start --> and <!-- contributors:end --> markers.
// Runs in CI on every push (.github/workflows/contributors.yml) and locally:
//   node scripts/update-contributors.mjs
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const REPO = process.env.GITHUB_REPOSITORY || 'fayharinn/StoreLocalizer'
const README = join(dirname(fileURLToPath(import.meta.url)), '..', 'README.md')
const START = '<!-- contributors:start -->'
const END = '<!-- contributors:end -->'

const headers = { 'User-Agent': 'contributors-script' }
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`

const res = await fetch(`https://api.github.com/repos/${REPO}/contributors?per_page=100`, { headers })
if (!res.ok) {
  console.error(`GitHub API error: ${res.status} ${await res.text()}`)
  process.exit(1)
}

const contributors = (await res.json())
  .filter((c) => c.type === 'User' && !c.login.endsWith('[bot]'))

const cells = contributors.map((c) => `      <td align="center">
        <a href="${c.html_url}">
          <img src="${c.avatar_url}&s=100" width="72" alt="${c.login}" /><br />
          <sub><b>${c.login}</b></sub>
        </a>
      </td>`)

// 8 avatars per row
const rows = []
for (let i = 0; i < cells.length; i += 8) {
  rows.push(`    <tr>\n${cells.slice(i, i + 8).join('\n')}\n    </tr>`)
}

const grid = `<table>\n  <tbody>\n${rows.join('\n')}\n  </tbody>\n</table>`

const readme = readFileSync(README, 'utf8')
const startIdx = readme.indexOf(START)
const endIdx = readme.indexOf(END)
if (startIdx === -1 || endIdx === -1) {
  console.error('Markers not found in README.md')
  process.exit(1)
}

const updated = readme.slice(0, startIdx + START.length) + '\n' + grid + '\n' + readme.slice(endIdx)
if (updated === readme) {
  console.log('Contributors grid already up to date.')
} else {
  writeFileSync(README, updated)
  console.log(`Updated contributors grid (${contributors.length} contributors).`)
}
