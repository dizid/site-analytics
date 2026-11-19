// CSP hash check (T-0634). Run after `npm run build`:  node scripts/csp-hash.mjs
// Lists the sha256 hash of every inline <script> in dist/**/*.html (JSON-LD and
// other non-JS types are skipped: CSP doesn't apply to them) and says whether
// netlify.toml's content policy allows it. Exit code 1 when one is missing.
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return htmlFiles(path)
    return name.endsWith('.html') ? [path] : []
  })
}

const policy = readFileSync('netlify.toml', 'utf8')
const inlineScript = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g
const seen = new Map() // hash -> first file

for (const file of htmlFiles('dist')) {
  for (const match of readFileSync(file, 'utf8').matchAll(inlineScript)) {
    const typeMatch = match[1].match(/type=["']?([^"'\s>]+)/)
    if (typeMatch && !/javascript|module/.test(typeMatch[1])) continue
    const hash = `sha256-${createHash('sha256').update(match[2]).digest('base64')}`
    if (!seen.has(hash)) seen.set(hash, file)
  }
}

let missing = 0
for (const [hash, file] of seen) {
  const allowed = policy.includes(`'${hash}'`)
  if (!allowed) missing += 1
  console.log(`${allowed ? 'ok     ' : 'MISSING'} '${hash}'  (${file})`)
}
if (!seen.size) console.log('no inline scripts')
process.exit(missing ? 1 : 0)
