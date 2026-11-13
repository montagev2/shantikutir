// Shanti Kutir - Security Test Suite
// Run with: node test/security.test.mjs

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, resolve } from 'path'

// On Windows, import.meta.url pathname starts with /C:/ — strip the leading slash
const rawPath = new URL('.', import.meta.url).pathname
const normalised = rawPath.startsWith('/') && rawPath[2] === ':' ? rawPath.slice(1) : rawPath
const ROOT = resolve(normalised, '..')
let passed = 0
let failed = 0

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  PASS  ${label}`)
    passed++
  } else {
    console.error(`  FAIL  ${label}${detail ? ' :: ' + detail : ''}`)
    failed++
  }
}

function readSrc(file) {
  return readFileSync(join(ROOT, file), 'utf8')
}

function allTsFiles(dir) {
  const results = []
  try {
    for (const f of readdirSync(dir)) {
      const full = join(dir, f)
      if (statSync(full).isDirectory()) results.push(...allTsFiles(full))
      else if (f.endsWith('.ts') || f.endsWith('.tsx')) results.push(full)
    }
  } catch {}
  return results
}

console.log('\nShanti Kutir - Security Test Suite\n')

// 1. No real Supabase URLs in tracked files
const schema = readSrc('supabase/migrations/001_shanti_kutir_schema.sql')
const envExample = readSrc('.env.example')
assert('No zjpzzlmzkekwczqjpjei in schema', !schema.includes('zjpzzlmzkekwczqjpjei'), 'Food Garden project ID must not appear')
assert('No zjpzzlmzkekwczqjpjei in .env.example', !envExample.includes('zjpzzlmzkekwczqjpjei'))

// 2. No real UPI IDs
const business = readSrc('src/lib/business.ts')
assert('No Vyapar UPI ID in business.ts', !business.includes('Vyapar.172426891188@hdfcbank'))
assert('No TFG terminal ID in business.ts', !business.includes('68317066'))

// 3. .gitignore excludes .env
const gitignore = readSrc('.gitignore')
assert('.gitignore excludes .env', gitignore.includes('.env'))

// 4. No .env file committed (only .env.example allowed)
let envExists = false
try { readSrc('.env'); envExists = true } catch {}
assert('No .env file committed', !envExists, '.env should not exist in repo root')

// 5. .env.example has placeholder values
assert('.env.example has placeholder URL', envExample.includes('YOUR_SUPABASE_PROJECT_URL'))
assert('.env.example has placeholder key', envExample.includes('YOUR_SUPABASE_ANON_KEY'))

// 6. No Food Garden phone number in source
const allSrc = allTsFiles(join(ROOT, 'src'))
let foodGardenPhone = false
for (const f of allSrc) {
  if (readFileSync(f, 'utf8').includes('8170859653')) { foodGardenPhone = true; break }
}
assert('No Food Garden staff phone in src/', !foodGardenPhone)

// 7. Order ID prefix is SK not TFG
assert('Order ID prefix is SK', business.includes("ORDER_ID_PREFIX = 'SK'"))
assert('Order ID prefix is not TFG', !business.includes("ORDER_ID_PREFIX = 'TFG'"))

// 8. RPC param names are correct (not old buggy names)
assert('verify_utr has p_staff_id param', schema.includes('p_staff_id') && schema.includes('verify_utr'))
assert('update_order_status has p_new_status', schema.includes('p_new_status'))
assert('update_own_pin uses p_user_id not p_profile_id', schema.includes('p_user_id') && !schema.includes('p_profile_id'))

// 9. All mutations are SECURITY DEFINER
const rpcCount = (schema.match(/SECURITY DEFINER/g) || []).length
assert('Multiple SECURITY DEFINER RPCs exist', rpcCount >= 10, `Found ${rpcCount}`)

// 10. No emoji in source files
let emojiFound = false
const emojiRe = /[\u{1F300}-\u{1FFFF}]/u
for (const f of allSrc) {
  if (emojiRe.test(readFileSync(f, 'utf8'))) { emojiFound = true; break }
}
assert('No emoji in TypeScript source files', !emojiFound)

// 11. Restaurant coordinates are correct
assert('Correct restaurant lat', business.includes('22.177882'))
assert('Correct restaurant lng', business.includes('87.869264'))

// 12. Bengali name present
assert('Bengali store name present', business.includes('শান্তিকুটির'))

console.log(`\n${passed} passed, ${failed} failed\n`)
if (failed > 0) process.exit(1)
