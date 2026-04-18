/**
 * fix-pricing.mjs
 * Fetches real pricing from PAX8 MCP and updates all $0 non-usage-based products in Supabase.
 * Run once: node fix-pricing.mjs
 */

import { spawn } from 'child_process'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '.env') })

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const PAX8_MCP_TOKEN = process.env.PAX8_MCP_TOKEN
const USD_TO_SGD = 1.35

// SKUs that are legitimately $0 (usage-based billing, charged in arrears)
const USAGE_BASED_SKUS = new Set([
  'ACR-BUP-ACM-C100', // Acronis Cyber Protect
  'CWD-DPT-ADD-A100', // CrowdStrike Data Protection Add-on
  'CRW-STR-DSC-A100', // CrowdStrike Discover Add-on
  'CRW-MOB-ADD-A100', // CrowdStrike Mobile Add-on
  'CRD-MSP-DEF-C100', // CrowdStrike MSSP Advanced Defend
  'CRD-MSP-FAL-C100', // CrowdStrike MSSP Complete Defend
  'CRD-MSP-DEF-C099', // CrowdStrike MSSP Defend
  'CRW-NGS-ADD-A100', // CrowdStrike NexGen SIEM
  'CRW-STR-SAA-A100', // CrowdStrike Spotlight Add-on
])

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

let requestId = 1

function spawnMcp() {
  return spawn('npx', [
    '-y', '--ignore-scripts',
    'supergateway@3.4.0',
    '--header', `x-pax8-mcp-token:${PAX8_MCP_TOKEN}`,
    '--streamableHttp', 'https://mcp.pax8.com/v1/mcp'
  ], { stdio: ['pipe', 'pipe', 'pipe'], shell: true })
}

function sendRequest(proc, method, params) {
  return new Promise((resolve, reject) => {
    const id = requestId++
    const message = JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n'
    let buffer = ''

    const onData = (data) => {
      buffer += data.toString()
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const parsed = JSON.parse(line)
          if (parsed.id === id) {
            proc.stdout.off('data', onData)
            if (parsed.error) reject(new Error(JSON.stringify(parsed.error)))
            else resolve(parsed.result)
          }
        } catch {}
      }
    }

    proc.stdout.on('data', onData)
    proc.stdin.write(message)
    setTimeout(() => {
      proc.stdout.off('data', onData)
      reject(new Error(`Timeout: ${method}`))
    }, 30000)
  })
}

async function callTool(proc, toolName, args = {}) {
  const result = await sendRequest(proc, 'tools/call', { name: toolName, arguments: args })
  const text = result?.content?.find(c => c.type === 'text')?.text
  return text ? JSON.parse(text) : null
}

async function main() {
  console.log('=== PAX8 Pricing Fix ===\n')

  // Get all PAX8 products with $0 price that aren't usage-based
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, sku, price_sgd')
    .eq('supplier', 'pax8')
    .eq('price_sgd', 0)

  if (error) { console.error('DB error:', error.message); process.exit(1) }

  const needsPricing = products.filter(p => !USAGE_BASED_SKUS.has(p.sku))
  console.log(`Found ${products.length} zero-price PAX8 products`)
  console.log(`Usage-based (skip): ${products.length - needsPricing.length}`)
  console.log(`Need pricing fix: ${needsPricing.length}\n`)

  if (needsPricing.length === 0) {
    console.log('Nothing to fix!')
    process.exit(0)
  }

  // Searches to run to collect PAX8 product UUIDs
  const searches = [
    { productName: 'Microsoft 365 Business Basic' },
    { productName: 'Microsoft 365 Business Standard' },
    { productName: 'Microsoft 365 Business Premium' },
    { productName: 'Microsoft 365 Apps for Business' },
    { productName: 'Microsoft 365 Apps for Enterprise' },
    { productName: 'Office 365 E1' },
    { productName: 'Office 365 E3' },
    { productName: 'Office 365 E5' },
    { productName: 'Dynamics 365 Business Central' },
  ]

  const proc = spawnMcp()
  const skuToUuid = {}

  try {
    await sendRequest(proc, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'canopy-pricing-fix', version: '1.0.0' }
    })
    console.log('MCP connected\n')

    // Collect PAX8 UUIDs for all products
    for (const params of searches) {
      try {
        const data = await callTool(proc, 'pax8-list-products', params)
        const items = data?.content || []
        for (const item of items) {
          if (item.sku && item.id) skuToUuid[item.sku] = item.id
        }
        console.log(`  Listed "${params.productName}": ${items.length} products`)
      } catch (e) {
        console.error(`  ✗ List failed (${params.productName}):`, e.message)
      }
    }

    console.log(`\nCollected UUIDs for ${Object.keys(skuToUuid).length} SKUs\n`)

    // Fetch pricing for each product that needs it
    let fixed = 0
    let failed = 0

    for (const product of needsPricing) {
      const uuid = skuToUuid[product.sku]
      if (!uuid) {
        console.log(`  ⚠  No UUID found for ${product.sku} (${product.name.substring(0, 50)})`)
        failed++
        continue
      }

      try {
        const pricing = await callTool(proc, 'pax8-get-product-pricing-by-uuid', { productId: uuid })
        const tiers = pricing?.content || []

        if (tiers.length === 0) {
          console.log(`  ⚠  No pricing tiers returned for ${product.sku}`)
          failed++
          continue
        }

        // Pick the best monthly tier:
        // Preference: Monthly + 1-Year commitment → Monthly (no commitment) → any non-trial non-zero
        const preferredTier =
          tiers.find(t => t.billingTerm === 'Monthly' && t.commitmentTerm === '1-Year') ||
          tiers.find(t => t.billingTerm === 'Monthly' && !t.commitmentTerm) ||
          tiers.find(t => t.billingTerm !== 'Trial' && (t.rates?.[0]?.suggestedRetailPrice ?? 0) > 0)

        if (!preferredTier) {
          console.log(`  ⚠  No usable pricing tier for ${product.sku}`)
          failed++
          continue
        }

        // Pricing is nested: tier.rates[0].suggestedRetailPrice / partnerBuyRate
        const rate = preferredTier.rates?.[0]
        const srpUsd = rate?.suggestedRetailPrice ?? 0
        const buyUsd = rate?.partnerBuyRate ?? 0

        if (srpUsd === 0 && buyUsd === 0) {
          console.log(`  ⚠  PAX8 returned $0 for ${product.sku} — may be non-profit/donation pricing`)
          failed++
          continue
        }

        const baseSgd = Math.round(srpUsd * USD_TO_SGD * 100) / 100
        const partnerSgd = Math.round(buyUsd * USD_TO_SGD * 100) / 100

        const { error: updateError } = await supabase
          .from('products')
          .update({
            base_price_sgd: baseSgd,
            partner_price_sgd: partnerSgd,
            price_sgd: baseSgd, // default sell price = SRP, admin can apply markup
          })
          .eq('id', product.id)

        if (updateError) {
          console.error(`  ✗ DB update failed for ${product.sku}:`, updateError.message)
          failed++
        } else {
          console.log(`  ✓ ${product.sku.padEnd(20)} SRP: $${srpUsd} USD → SGD $${baseSgd}  |  Buy: $${buyUsd} USD → SGD $${partnerSgd}`)
          fixed++
        }
      } catch (e) {
        console.error(`  ✗ Pricing fetch failed for ${product.sku}:`, e.message)
        failed++
      }
    }

    console.log(`\n=== Done: ${fixed} fixed, ${failed} failed ===`)
  } finally {
    proc.kill()
  }
}

main().catch(e => { console.error(e); process.exit(1) })
