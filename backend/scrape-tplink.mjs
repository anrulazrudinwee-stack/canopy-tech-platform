/**
 * scrape-tplink.mjs
 * Scrapes TP-Link reseller prices from Innovix Marketplace using a session cookie.
 * Upserts directly to Supabase — safe to re-run anytime prices change.
 *
 * Setup:
 *   1. Log in to innovixmarketplace.com in Chrome
 *   2. DevTools → Application → Cookies → copy PHPSESSID value
 *   3. Add to backend/.env:  INNOVIX_SESSION=<value>
 *
 * Run: node scrape-tplink.mjs
 *
 * When the session expires, repeat steps 1-3 and re-run.
 */

import puppeteer from 'puppeteer'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '.env') })

const PRODUCTS_URL = 'https://www.innovixmarketplace.com/products/index?Products%5Bproduct_brand_id%5D%5B%5D=112'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Direct name → SKU lookup (matched against scraped product names)
const NAME_TO_SKU = {
  '24-Port Gigabit Stackable L3':              'SG6428XHP',
  '48-Port Gigabit and 4-Port 10GE SFP+ L2+': 'SG3452XP',
  '24-Port 2.5GBASE-T and 4-Port 10GE SFP+':  'SG3428XPP-M2',
  '52-Port Gigabit L2+ Managed Switch':        'SG3452P',
  '28-Port Gigabit L2+ Managed Switch':        'SG3428MP',
  'JetStream 24-Port 2.5GBASE-T':             'SG3428X-M2',
  '28-Port Gigabit Smart Switch':              'SG2428P',
  '28-Port Gigabit Easy Managed Switch':       'ES228GMP',
  '18-Port Gigabit Smart Switch':              'SG2218P',
  '20-Port Gigabit Easy Managed Switch':       'ES220GMP',
  '18-Port Gigabit Unmanaged Rackmount':       'DS1018GMP',
  '10-Port Gigabit Industrial Easy Managed Switch with 6-Port': 'IES105GPP',
  '10-Port Gigabit Industrial Easy Managed':   'IES210GPP',
  '10-Port Gigabit Easy Managed Switch':       'ES210GMP',
  '8-Port Gigabit Smart Switch with 4-Port':   'TL-SG2210P',
  '8-Port Gigabit Smart Switch':               'TL-SG2008',
  '10-Port Gigabit Desktop Switch':            'TL-SG1210P',
  '5-Port Gigabit Easy Managed Switch':        'TL-SG105PE',
  'ER8411':                                    'ER8411',
  'ER7412-M2':                                 'ER7412-M2',
  '4G+ Cat6 AX3000 Gigabit VPN Router':        'ER706W-4G',
  'BE19000':                                   'EAP783',
  'BE11000 Indoor/Outdoor':                    'EAP772-Outdoor',
  'BE15000':                                   'EAP787',
  'BE11000 Ceiling Mount Tri-Band':            'EAP773',
  'BE11000 Ceiling Mount Wi-Fi 7':             'EAP772',
  'BE5000':                                    'EAP771',
  'AX1800 Indoor/Outdoor':                     'EAP610-Outdoor',
  'Wireless Bridge 5 GHz 867 Mbps Long-Range': 'EAP215-Bridge KIT',
  'Wireless Bridge 5 GHz 867 Mbps Indoor':     'EAP215-Bridge',
  'Wireless Bridge 5 GHz 300 Mbps':            'CPE710',
  '2.4GHz 300Mbps Indoor/Outdoor Wireless':    'CPE210',
  'AX5400 Ceiling Mount':                      'EAP670',
  'AX3000 Wall Plate':                         'EAP615-Wall',
  'AX3000 Ceiling Mount':                      'EAP650',
  'AX1800 Ceiling Mount':                      'EAP610',
  'OC200':                                     'OC200',
  '10G BASE-T RJ45 SFP+':                      'TXM431-T',
  'PoE+ Extender':                             'TL-POE300',
  '1 Meter 10G SFP+ Direct Attach':            'TL-SM5220-1M',
}

function resolveSku(name) {
  // Try longest matching key first to avoid partial matches
  const keys = Object.keys(NAME_TO_SKU).sort((a, b) => b.length - a.length)
  for (const key of keys) {
    if (name.toLowerCase().includes(key.toLowerCase())) return NAME_TO_SKU[key]
  }
  return name.replace(/[^a-z0-9]/gi, '-').slice(0, 30).toUpperCase()
}

async function main() {
  const session = process.env.INNOVIX_SESSION
  if (!session) throw new Error('INNOVIX_SESSION must be set in .env (copy PHPSESSID from browser DevTools)')

  console.log('Launching browser...')
  const browser = await puppeteer.launch({
    headless: true,
    protocolTimeout: 60000,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 900 })

    // Inject session cookie — skips login + reCAPTCHA entirely
    await page.setCookie({
      name:     'PHPSESSID',
      value:    session,
      domain:   'www.innovixmarketplace.com',
      path:     '/',
      httpOnly: true,
      secure:   false,
    })
    console.log('✓ Session cookie injected')

    // Navigate to TP-Link products page
    console.log('Navigating to TP-Link products page...')
    await page.goto(PRODUCTS_URL, { waitUntil: 'networkidle2', timeout: 30000 })

    // Check if we're logged in
    const loggedIn = await page.evaluate(() =>
      !document.querySelector('a[href*="/login"]')?.textContent?.includes('LOGIN') ||
      !!document.querySelector('a[href*="/logout"], a[href*="signout"], .user-menu, .account-menu')
    )
    console.log(loggedIn ? '✓ Logged in as reseller' : '⚠ May not be logged in — prices might be retail')

    // Scroll to load all products
    console.log('Scrolling to load all products...')
    for (let i = 0; i < 8; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
      await new Promise(r => setTimeout(r, 1500))
    }

    // Extract products using Quick View buttons as card anchors
    const raw = await page.evaluate(() => {
      const results = []
      const quickViews = [...document.querySelectorAll('a, button, span')].filter(el =>
        el.textContent.trim() === 'Quick view'
      )
      quickViews.forEach(qv => {
        let card = qv.parentElement
        for (let i = 0; i < 8; i++) {
          if (!card) break
          if (card.querySelector('h2, h3, h4') && card.querySelector('[class*="price"], .price')) break
          card = card.parentElement
        }
        if (!card) return

        const nameEl = card.querySelector('h2 a, h3 a, h4 a, h2, h3, h4')
        const name   = nameEl?.textContent?.trim()
        const priceEls = [...card.querySelectorAll('[class*="price"], .price')]
        const prices   = priceEls.map(el => {
          const m = el.textContent.replace(/[^0-9.]/g, '')
          return m ? parseFloat(m) : null
        }).filter(p => p && p > 0)
        const priceTexts = priceEls.map(el => el.textContent.trim()).filter(Boolean)

        if (name) results.push({ name, prices, priceTexts })
      })
      return results
    })

    // Deduplicate by cleaned name
    const seen = new Map()
    for (const p of raw) {
      const cleanName = p.name.replace(/\s*-\s*UPGRADEENTERPRISE/gi, '').trim()
      if (!seen.has(cleanName)) seen.set(cleanName, { ...p, name: cleanName })
    }
    const products = [...seen.values()]

    console.log(`\nScraped ${products.length} unique products\n`)
    console.log('=== PRICE BREAKDOWN ===')
    products.forEach((p, i) => {
      console.log(`${String(i+1).padStart(2)}. ${p.name.slice(0, 55).padEnd(55)} | prices: ${JSON.stringify(p.priceTexts)}`)
    })

    // Determine reseller vs SRP
    // When logged in as reseller, the page typically shows both prices.
    // Lower = reseller/partner, higher = SRP/retail.
    const rows = products.map(p => {
      const sku = resolveSku(p.name)
      const resellerPrice = p.prices.length > 0 ? Math.min(...p.prices) : null
      const srpPrice      = p.prices.length > 0 ? Math.max(...p.prices) : null
      return {
        sku:               `TD-${sku}`,
        supplier:          'techdata',
        category:          'Networking',
        name:              p.name,
        description:       p.name,
        long_description:  null,
        base_price_sgd:    srpPrice || resellerPrice,
        partner_price_sgd: resellerPrice,
        price_sgd:         srpPrice || resellerPrice,
        markup_percent:    0,
        stock_qty:         50,
        image_url:         'https://logo.clearbit.com/tp-link.com',
        specs:             null,
      }
    })

    console.log('\n=== UPSERT PREVIEW ===')
    rows.forEach(r => console.log(`  TD-${r.sku.replace('TD-','')} | partner: ${r.partner_price_sgd} | srp: ${r.base_price_sgd}`))

    console.log('\nUpserting to Supabase...')
    let ok = 0, fail = 0
    for (const row of rows) {
      const { error } = await supabase
        .from('products')
        .upsert(row, { onConflict: 'sku,supplier' })
      if (error) { console.error(`  ✗ ${row.sku}: ${error.message}`); fail++ }
      else { ok++; process.stdout.write(`\r  ${ok}/${rows.length} upserted...`) }
    }
    console.log(`\n\nDone! ✓ ${ok} upserted, ✗ ${fail} failed`)

  } finally {
    await browser.close()
  }
}

main().catch(e => { console.error(e); process.exit(1) })
