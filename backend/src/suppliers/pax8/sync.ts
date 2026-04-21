import { createClient } from '@supabase/supabase-js'
import { Pax8Client } from './client'

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )
}

// SKUs that are legitimately $0 — usage/arrears billing, no monthly SRP
const USAGE_BASED_SKUS = new Set([
  'ACR-BUP-ACM-C100',
  'CWD-DPT-ADD-A100',
  'CRW-STR-DSC-A100',
  'CRW-MOB-ADD-A100',
  'CRD-MSP-DEF-C100',
  'CRD-MSP-FAL-C100',
  'CRD-MSP-DEF-C099',
  'CRW-NGS-ADD-A100',
  'CRW-STR-SAA-A100',
])

const SEARCHES: { productName?: string; vendorName?: string }[] = [
  { productName: 'Microsoft 365 Business Basic' },
  { productName: 'Microsoft 365 Business Standard' },
  { productName: 'Microsoft 365 Business Premium' },
  { productName: 'Microsoft 365 Apps for Business' },
  { productName: 'Microsoft 365 Apps for Enterprise' },
  { productName: 'Office 365 E1' },
  { productName: 'Office 365 E3' },
  { productName: 'Office 365 E5' },
  { productName: 'Dynamics 365 Business Central' },
  { productName: 'Acronis Cyber Protect' },
  { vendorName: 'CrowdStrike' },
]

const VENDOR_LOGOS: Record<string, string> = {
  Microsoft:   'https://img.icons8.com/color/96/microsoft.png',
  Acronis:     'https://img.icons8.com/color/96/acronis.png',
  CrowdStrike: 'https://icon.horse/icon/crowdstrike.com',
}

export async function syncPAX8Products() {
  const clientId     = process.env.PAX8_CLIENT_ID || ''
  const clientSecret = process.env.PAX8_CLIENT_SECRET || ''

  if (!clientId || !clientSecret) {
    console.log('⚠️  PAX8_CLIENT_ID / PAX8_CLIENT_SECRET not set — skipping sync')
    return 0
  }

  console.log('\n🔄 PAX8 sync starting (direct API)...')
  const supabase = getSupabase()
  const pax8 = new Pax8Client(clientId, clientSecret)

  // 1. Authenticate
  try {
    await pax8.getToken()
  } catch (err: any) {
    console.error('  ✗ PAX8 auth failed:', err.response?.data || err.message)
    return 0
  }

  // 2. Collect all products (deduplicated by SKU)
  const skuMap = new Map<string, any>()

  for (const params of SEARCHES) {
    const label = params.productName || params.vendorName
    try {
      const products = await pax8.listProducts(params)
      for (const p of products) {
        if (!skuMap.has(p.sku)) skuMap.set(p.sku, p)
      }
      console.log(`  ✓ "${label}": ${products.length} products`)
    } catch (err: any) {
      console.error(`  ✗ "${label}" failed:`, err.response?.data?.message || err.message)
    }
  }

  const allProducts = [...skuMap.values()]
  console.log(`\n  ${allProducts.length} unique SKUs collected`)

  // 3. Load existing PAX8 SKUs from DB — only update what's already curated, don't add new products
  const { data: existing } = await supabase
    .from('products')
    .select('id, sku, markup_percent')
    .eq('supplier', 'pax8')

  const existingMap = new Map((existing || []).map((r: any) => [r.sku, r]))
  console.log(`  ${existingMap.size} existing PAX8 products in DB`)

  // 4. Update pricing for existing products only
  let synced = 0
  let skipped = 0
  let failed = 0

  for (const p of allProducts) {
    const existing = existingMap.get(p.sku)
    if (!existing) {
      skipped++
      continue  // not in our curated catalogue — don't add it
    }

    try {
      let srpUsd = 0
      let buyUsd = 0

      if (!USAGE_BASED_SKUS.has(p.sku)) {
        const tiers = await pax8.getProductPricing(p.id)
        const prices = Pax8Client.extractMonthlyPrice(tiers)
        srpUsd = prices.srpUsd
        buyUsd = prices.buyUsd
      }

      const baseSgd    = Pax8Client.toSgd(srpUsd)
      const partnerSgd = Pax8Client.toSgd(buyUsd)
      const markup     = existing.markup_percent ?? 0

      // Recalculate sell price: preserve admin markup if set, otherwise use SRP
      const priceSgd = markup > 0
        ? Math.round(baseSgd * (1 + markup / 100) * 100) / 100
        : baseSgd

      const vendor   = typeof p.vendor === 'string' ? p.vendor : (p.vendor as any)?.name || ''
      const imageUrl = VENDOR_LOGOS[vendor] || ''

      const { error } = await supabase.from('products')
        .update({
          name:              p.name,
          description:       p.description || '',
          base_price_sgd:    baseSgd,
          partner_price_sgd: partnerSgd,
          price_sgd:         priceSgd,
          image_url:         imageUrl,
          category:          'software',
        })
        .eq('id', existing.id)

      if (error) {
        console.error(`  ✗ Update failed (${p.sku}):`, error.message)
        failed++
      } else {
        synced++
      }
    } catch (err: any) {
      console.error(`  ✗ Failed (${p.sku}):`, err.response?.data?.message || err.message)
      failed++
    }
  }

  console.log(`\n✓ PAX8 sync complete — ${synced} updated, ${skipped} skipped (not in catalogue), ${failed} failed\n`)
  return synced
}
