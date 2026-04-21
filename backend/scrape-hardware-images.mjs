/**
 * scrape-hardware-images.mjs
 * Fetches real product images for all hardware products.
 * - Dell: uses dell.com search (fast, reliable CDN URLs)
 * - Everything else: Bing Image Search by product name
 *
 * Run: node scrape-hardware-images.mjs
 * Safe to re-run — only updates products still showing brand-logo placeholders.
 */

import puppeteer from 'puppeteer'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '.env') })

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Brand-logo placeholders to replace with real product images
const PLACEHOLDER_LOGOS = [
  'https://cdn.simpleicons.org/dell',
  'https://cdn.simpleicons.org/hp',
  'https://cdn.simpleicons.org/lenovo',
  'https://cdn.simpleicons.org/tplink',
  'https://cdn.simpleicons.org/synology',
  'https://img.icons8.com/fluency/96/print.png',  // Canon placeholder
]

// Domains whose images we trust as real product photos
const TRUSTED_PRODUCT_DOMAINS = [
  'i.dell.com', 'dell.com',
  'ssl-product-images.www8-hp.com', 'hp.com',
  'bhphotovideo.com', 'bhphoto',
  'media.lenovo.com', 'psref.lenovo.com', 'lenovo.com',
  'static.tp-link.com', 'tp-link.com',
  'www.synology.com', 'synology.com',
  'sg.canon', 'canon.com', 'usa.canon.com',
  'cdn.mos.cms.futurecdn.net',
  'images-na.ssl-images-amazon.com', 'media.amazon',
  'image.bhphotovideo.com',
]

// Images to reject even if size looks good
const REJECT_FRAGMENTS = [
  'hp_og_image', 'og_image', 'placeholder', 'no-image', 'noimage',
  'logo', 'icon', 'banner', 'sprite', 'avatar', 'favicon',
  '1x1', 'pixel', 'blank', 'transparent',
]

function isGoodImage(url) {
  if (!url || url.startsWith('data:') || url.length < 30) return false
  const lower = url.toLowerCase()
  return !REJECT_FRAGMENTS.some(f => lower.includes(f))
}

/** Search Bing Images and return the first good product image URL */
async function bingImageSearch(page, query) {
  const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&form=HDRSC2&first=1`
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })
    await new Promise(r => setTimeout(r, 1800 + Math.random() * 800))

    // Bing embeds image metadata in JSON within the `m` attribute of each result anchor
    const result = await page.evaluate(() => {
      const iuscCount = document.querySelectorAll('a.iusc[m]').length
      const isCaptcha = document.querySelector('#captcha, .captcha, #CaptchaContainer') !== null
      const images = [...document.querySelectorAll('a.iusc[m]')]
        .map(a => {
          try { return JSON.parse(a.getAttribute('m'))?.murl } catch { return null }
        })
        .filter(u => u && u.startsWith('http') && u.length > 30)
      return { images, iuscCount, isCaptcha }
    })

    if (result.isCaptcha || result.iuscCount === 0) {
      // Rate limited — wait and try once more
      process.stdout.write('[rate-limited, waiting 15s] ')
      await new Promise(r => setTimeout(r, 15000))
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })
      await new Promise(r => setTimeout(r, 2500))
      const retry = await page.evaluate(() => {
        return [...document.querySelectorAll('a.iusc[m]')]
          .map(a => { try { return JSON.parse(a.getAttribute('m'))?.murl } catch { return null } })
          .filter(u => u && u.startsWith('http') && u.length > 30)
      })
      return retry.find(u => isGoodImage(u)) || null
    }

    return result.images.find(u => isGoodImage(u)) || null
  } catch {
    return null
  }
}

/** For Dell: use dell.com search which returns proper CDN URLs */
async function dellSearch(page, sku) {
  try {
    const cleanSku = sku.replace(/^(TD-|IM-DELL-)/, '')
    await page.goto(
      `https://www.dell.com/en-sg/search/All/${encodeURIComponent(cleanSku)}`,
      { waitUntil: 'domcontentloaded', timeout: 20000 }
    )
    await new Promise(r => setTimeout(r, 2000))

    // Strategy 1: thumbnail in search results
    let img = await page.evaluate(() => {
      const el = document.querySelector('.ps-imagewrapper img, [data-testid="product-image"] img')
      return el?.src || el?.getAttribute('data-src') || ''
    })
    if (img && img.includes('dell.com') && isGoodImage(img)) return img

    // Strategy 2: follow first product link and get OG image
    const href = await page.evaluate(() => {
      const a = document.querySelector('a[href*="/shop/"][href*="desktop"], a[href*="/shop/"][href*="laptop"], a[href*="/shop/"][href*="workstation"], a[href*="/shop/"]')
      return a?.href || null
    })
    if (href) {
      await page.goto(href, { waitUntil: 'domcontentloaded', timeout: 20000 })
      await new Promise(r => setTimeout(r, 1500))
      img = await page.evaluate(() => {
        const og = document.querySelector('meta[property="og:image"]')
        return og?.content || ''
      })
      if (img && img.includes('dell.com') && isGoodImage(img)) return img
    }
    return null
  } catch {
    return null
  }
}

/** Build the Bing search query from a product name and brand */
function buildQuery(name, brand) {
  // Strip region/colour variants and specs to get the clean model name
  let q = name
    .replace(/\s+ASA\b.*/i, '')          // Canon ASA regional suffix
    .replace(/\s+\d+GB\b.*/i, '')        // memory specs
    .replace(/\s+\d+TB\b.*/i, '')        // storage
    .replace(/\s+[A-Z]\d+\s*-\s*.*/i, '') // processor codes like "U7-265 ..."
  // Take first 6 words for the model portion (captures brand + model family + gen)
  q = q.split(/\s+/).slice(0, 6).join(' ')
  return `${q} product image`
}

function getBrandName(imageUrl) {
  if (imageUrl.includes('simpleicons.org/dell')) return 'Dell'
  if (imageUrl.includes('simpleicons.org/hp')) return 'HP'
  if (imageUrl.includes('simpleicons.org/lenovo')) return 'Lenovo'
  if (imageUrl.includes('simpleicons.org/tplink')) return 'TP-Link'
  if (imageUrl.includes('simpleicons.org/synology')) return 'Synology'
  if (imageUrl.includes('print.png')) return 'Canon'
  return '?'
}

async function fetchImage(page, product) {
  const isDell = product.image_url.includes('simpleicons.org/dell')

  if (isDell) {
    return dellSearch(page, product.sku)
  }

  const query = buildQuery(product.name, getBrandName(product.image_url))
  return bingImageSearch(page, query)
}

async function main() {
  const { data: products, error } = await supabase
    .from('products')
    .select('id, sku, name, image_url')
    .in('image_url', PLACEHOLDER_LOGOS)
    .order('image_url')

  if (error) throw new Error(error.message)
  if (!products.length) {
    console.log('All products already have real images!')
    return
  }

  const byBrand = {}
  for (const p of products) {
    const b = getBrandName(p.image_url)
    byBrand[b] = (byBrand[b] || 0) + 1
  }
  console.log(`Found ${products.length} products needing images:`, byBrand)
  console.log('Launching browser...\n')

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    protocolTimeout: 60000,
  })

  let updated = 0, skipped = 0, failed = 0

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 900 })
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    )
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' })
    await page.setRequestInterception(true)
    page.on('request', req => {
      if (['font', 'media'].includes(req.resourceType())) req.abort()
      else req.continue()
    })

    for (let i = 0; i < products.length; i++) {
      const p = products[i]
      const brand = getBrandName(p.image_url)
      process.stdout.write(`[${i + 1}/${products.length}] [${brand}] ${p.sku.padEnd(28)} `)

      let imageUrl = null
      try {
        imageUrl = await fetchImage(page, p)
      } catch (err) {
        // Recreate page on crash
        if (err.message?.includes('detached') || err.message?.includes('closed')) {
          try { await page.close() } catch {}
          const newPage = await browser.newPage()
          await newPage.setViewport({ width: 1280, height: 900 })
          await newPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36')
          await newPage.setRequestInterception(true)
          newPage.on('request', req => {
            if (['font', 'media'].includes(req.resourceType())) req.abort()
            else req.continue()
          })
          // Replace page reference in closure — retry once
          imageUrl = await fetchImage(newPage, p).catch(() => null)
          Object.assign(page, newPage)
        }
      }

      if (imageUrl) {
        const { error: dbErr } = await supabase
          .from('products')
          .update({ image_url: imageUrl })
          .eq('id', p.id)

        if (dbErr) { console.log(`✗ ${dbErr.message}`); failed++ }
        else { console.log(`✓ ${imageUrl.slice(0, 80)}`); updated++ }
      } else {
        console.log('— not found')
        skipped++
      }

      // Delay to avoid rate limiting (2–3s random)
      await new Promise(r => setTimeout(r, 2000 + Math.random() * 1000))
    }
  } finally {
    await browser.close()
  }

  console.log(`\n✓ ${updated} updated  — ${skipped} not found  ✗ ${failed} failed`)
  if (skipped > 0) console.log('Re-run anytime to retry missed products.')
}

main().catch(e => { console.error(e); process.exit(1) })
