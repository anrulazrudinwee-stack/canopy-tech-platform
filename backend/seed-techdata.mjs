/**
 * seed-techdata.mjs
 * Imports Tech Data / Innovix price list products into Supabase.
 * Extracts: Dell & HP & Lenovo (Desktops + Laptops) + Canon (Printers)
 *
 * Run: node seed-techdata.mjs
 * Safe to re-run — upserts on sku + supplier.
 *
 * Price list folder: C:/Users/ACER/Desktop/Canopy/data/Price list/innovix tech data/
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import XLSX from 'xlsx'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '.env') })

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const PRICE_LIST_DIR = 'C:/Users/ACER/Desktop/Canopy/data/Price list/innovix tech data'

// Parse a price value — handles numbers, "SGD 558.00" strings, and nulls
function parsePrice(val) {
  if (val == null) return null
  if (typeof val === 'number') return Math.round(val * 100) / 100
  const str = String(val).replace(/[^0-9.]/g, '')
  const n = parseFloat(str)
  return isNaN(n) ? null : Math.round(n * 100) / 100
}

// First line of a multi-line string
function firstLine(str) {
  if (!str) return ''
  return String(str).split(/\r?\n/)[0].trim()
}

// Skip rows with "(EOL)" in the name
function isEOL(str) {
  return str && String(str).toUpperCase().includes('(EOL)')
}

const SKIP_FAMILIES = ['Case', 'Monitor', 'Mice', 'Services', 'Power Adapter', 'Power Banks', 'Universal USB-C Dock', 'Headset', 'Display', 'Keyboard']

const products = []

// ─── DELL ────────────────────────────────────────────────────────────────────

function parseDell() {
  const wb = XLSX.readFile(`${PRICE_LIST_DIR}/DellCSGPricelistValidtill30Apr2026.xlsm`)
  let count = 0

  // Dell Laptops sheet
  // Headers at rows 6-7, data from row 8
  // Col: 0=ModelGroup, 1=SKU(with accessories), 2=CleanSKU, 3=Summary, 4=Desc, 5=Reseller, 6=EndUser excl GST
  const laptopWs = wb.Sheets['Dell Laptops']
  const laptopRows = XLSX.utils.sheet_to_json(laptopWs, { header: 1, defval: null })
  for (const row of laptopRows) {
    const sku = row[2]
    const summary = row[3]
    const desc = row[4]
    const resellerPrice = parsePrice(row[5])
    const endUserPrice = parsePrice(row[6])
    if (!sku || typeof sku !== 'string' || !resellerPrice || !endUserPrice) continue
    if (isEOL(summary) || isEOL(sku)) continue
    const name = firstLine(summary) || firstLine(desc)
    products.push({
      sku: `TD-${sku.trim()}`,
      supplier: 'techdata',
      category: 'Laptop',
      name,
      description: firstLine(desc),
      long_description: null,
      base_price_sgd: endUserPrice,
      partner_price_sgd: resellerPrice,
      price_sgd: endUserPrice,
      markup_percent: 0,
      stock_qty: 50,
      image_url: 'https://logo.clearbit.com/dell.com',
      specs: null,
    })
    count++
  }

  // Dell Desktops sheet
  // No header section — data starts at row 6
  // Col: 0=ModelFamily, 1=CleanSKU, 2=Summary, 3=Desc, 4=Reseller, 5=EndUser excl GST
  const desktopWs = wb.Sheets['Dell Desktops']
  const desktopRows = XLSX.utils.sheet_to_json(desktopWs, { header: 1, defval: null })
  for (const row of desktopRows) {
    const sku = row[1]
    const summary = row[2]
    const desc = row[3]
    const resellerPrice = parsePrice(row[4])
    const endUserPrice = parsePrice(row[5])
    if (!sku || typeof sku !== 'string' || sku.length < 5) continue
    if (!resellerPrice || !endUserPrice) continue
    if (isEOL(summary) || isEOL(sku)) continue
    const name = firstLine(summary) || firstLine(desc)
    products.push({
      sku: `TD-${sku.trim()}`,
      supplier: 'techdata',
      category: 'Desktop',
      name,
      description: firstLine(desc),
      long_description: null,
      base_price_sgd: endUserPrice,
      partner_price_sgd: resellerPrice,
      price_sgd: endUserPrice,
      markup_percent: 0,
      stock_qty: 50,
      image_url: 'https://logo.clearbit.com/dell.com',
      specs: null,
    })
    count++
  }

  console.log(`  Dell: ${count} products`)
}

// ─── HP ──────────────────────────────────────────────────────────────────────

function parseHP() {
  const wb = XLSX.readFile(`${PRICE_LIST_DIR}/HPIPricelistValidtill14Apr2026.xlsx`)
  let count = 0

  // Laptop sheets (Business Notebooks)
  const laptopSheets = ['EB800 G11', 'PB4 G1', 'EB6 G1', 'EB8 G1', 'EB X G1']
  for (const sheetName of laptopSheets) {
    const ws = wb.Sheets[sheetName]
    if (!ws) continue
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
    // Find the header row (contains "Part No.")
    let dataStart = -1
    for (let i = 0; i < rows.length; i++) {
      if (rows[i]?.[0] && String(rows[i][0]).includes('Part No')) { dataStart = i + 1; break }
    }
    if (dataStart === -1) continue
    for (let i = dataStart; i < rows.length; i++) {
      const row = rows[i]
      const partNo = row[0]
      const desc = row[1]
      const resellerPrice = parsePrice(row[2])
      // Promo price (col 3) overrides reseller if it's a valid number
      const promoPrice = parsePrice(row[3])
      const srp = parsePrice(row[4])
      if (!partNo || typeof partNo !== 'string' || partNo.length < 4) continue
      if (!resellerPrice) continue
      if (isEOL(desc) || isEOL(partNo)) continue
      const name = firstLine(desc)
      if (!name) continue
      const partnerPrice = resellerPrice
      const sellPrice = srp || resellerPrice
      products.push({
        sku: `TD-${partNo.trim()}`,
        supplier: 'techdata',
        category: 'Laptop',
        name,
        description: name,
        long_description: null,
        base_price_sgd: sellPrice,
        partner_price_sgd: partnerPrice,
        price_sgd: sellPrice,
        markup_percent: 0,
        stock_qty: 50,
        image_url: 'https://logo.clearbit.com/hp.com',
        specs: null,
      })
      count++
    }
  }

  // Desktop sheet (BPC Summary)
  // Row 12: ["Category","VPN","Product Name","OS","Processor","RAM","Storage","Promo Price","DMP Price","SRP","Remarks"]
  // Data from row 14
  const bpcWs = wb.Sheets['BPC Summary']
  if (bpcWs) {
    const rows = XLSX.utils.sheet_to_json(bpcWs, { header: 1, defval: null })
    let dataStart = -1
    for (let i = 0; i < rows.length; i++) {
      if (rows[i]?.[1] && String(rows[i][1]).toLowerCase().includes('vpn')) { dataStart = i + 1; break }
    }
    if (dataStart === -1) dataStart = 14
    for (let i = dataStart; i < rows.length; i++) {
      const row = rows[i]
      const vpn = row[1]    // part number
      const name = row[2]   // product name
      const promoPrice = parsePrice(row[7])  // Promo Price SGD
      const srp = parsePrice(row[9])         // SRP SGD
      if (!vpn || typeof vpn !== 'string' || vpn.length < 4) continue
      if (!promoPrice) continue
      if (isEOL(name) || isEOL(vpn)) continue
      if (!name) continue
      products.push({
        sku: `TD-${vpn.trim()}`,
        supplier: 'techdata',
        category: 'Desktop',
        name: String(name).trim(),
        description: String(name).trim(),
        long_description: null,
        base_price_sgd: srp || promoPrice,
        partner_price_sgd: promoPrice,
        price_sgd: srp || promoPrice,
        markup_percent: 0,
        stock_qty: 50,
        image_url: 'https://logo.clearbit.com/hp.com',
        specs: null,
      })
      count++
    }
  }

  console.log(`  HP: ${count} products`)
}

// ─── LENOVO ──────────────────────────────────────────────────────────────────

function parseLenovo() {
  const wb = XLSX.readFile(`${PRICE_LIST_DIR}/LenovoPCGCommercialNotebook-Desktop-WorkstationPricelistValidtill30Apr2026.xlsx`)
  let count = 0

  // Helper: parse one Lenovo sheet (ThinkPad or ThinkCentre)
  function parseLenovoSheet(sheetName, category) {
    const ws = wb.Sheets[sheetName]
    if (!ws) return
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })

    // Walk rows tracking accumulated context for each product block
    let currentModelName = ''   // first full-line description (e.g. "ThinkBook 14 G9 IPL 14"...")
    let descBuffer = []          // description lines collected before the price row

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const family = row[0]   // product family label (col 0)
      const partNo = row[1]   // part number (col 1)
      const desc = row[2]     // description fragment (col 2)
      const resellerPrice = parsePrice(row[3])
      const srp = parsePrice(row[4])

      // Rows with no part number and no price — accumulate description lines
      if (!partNo && !resellerPrice) {
        if (desc && typeof desc === 'string' && desc.trim().length > 5) {
          const line = desc.trim()
          // First description line encountered is the model summary line
          if (!currentModelName) currentModelName = line
          descBuffer.push(line)
        }
        continue
      }

      // Skip header rows (col 0 = "Product Family")
      if (family === 'Product Family') { currentModelName = ''; descBuffer = []; continue }

      // Skip if no part number or no price
      if (!partNo || typeof partNo !== 'string' || partNo.length < 5) continue
      if (!resellerPrice || resellerPrice <= 0) continue

      // Skip accessories
      if (family && SKIP_FAMILIES.some(f => String(family).includes(f))) continue
      if (isEOL(desc) || isEOL(partNo)) continue

      // Build product name:
      // Col 0 (family) = short family name e.g. "ThinkBook 14 G9"
      // currentModelName = full first-line e.g. "ThinkBook 14 G9 IPL 14" WUXGA..."
      // desc (col 2) on the price row = storage spec e.g. "512GB SSD M.2..."
      let name = ''
      if (family && typeof family === 'string' && !family.includes('*') && !family.includes('!')) {
        name = `Lenovo ${family.trim()}`
      } else if (currentModelName) {
        name = `Lenovo ${firstLine(currentModelName)}`
      } else {
        name = `Lenovo ${partNo.trim()}`
      }

      // Append storage/RAM spec from col 2 if it looks like a storage line
      const specLine = desc ? String(desc).trim() : ''
      const storageMatch = specLine.match(/(\d+\s*(?:GB|TB)\s*(?:SSD|HDD|NVMe|eMMC)?)/i)
      const ramMatch = specLine.match(/(\d+GB\s*(?:SO-DIMM|SODIMM|DDR\d)?)/i)
      if (storageMatch) name += ` ${storageMatch[1].trim()}`

      const description = currentModelName
        ? firstLine(currentModelName).substring(0, 300)
        : specLine.substring(0, 300)

      products.push({
        sku: `TD-${partNo.trim()}`,
        supplier: 'techdata',
        category,
        name: name.substring(0, 200),
        description,
        long_description: null,
        base_price_sgd: srp || resellerPrice,
        partner_price_sgd: resellerPrice,
        price_sgd: srp || resellerPrice,
        markup_percent: 0,
        stock_qty: 50,
        image_url: 'https://logo.clearbit.com/lenovo.com',
        specs: null,
      })
      count++

      // Reset context for next product block
      currentModelName = ''
      descBuffer = []
    }
  }

  parseLenovoSheet('ThinkPad ', 'Laptop')
  parseLenovoSheet('ThinkCentre', 'Desktop')

  console.log(`  Lenovo: ${count} products`)
}

// ─── CANON ───────────────────────────────────────────────────────────────────

function parseCanon() {
  const wb = XLSX.readFile(`${PRICE_LIST_DIR}/CanonPricelistValidtill30Apr2026.xlsx`)
  let count = 0

  function parseCanonSheet(sheetName) {
    const ws = wb.Sheets[sheetName]
    if (!ws) return
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
    // Find header row (contains "Model" and "Product Code")
    let dataStart = -1
    for (let i = 0; i < rows.length; i++) {
      if (rows[i]?.[1] === 'Model' && rows[i]?.[2] === 'Product Code') { dataStart = i + 1; break }
    }
    if (dataStart === -1) return
    for (let i = dataStart; i < rows.length; i++) {
      const row = rows[i]
      const model = row[1]
      const productCode = row[2]
      const warranty = row[3]
      const desc = row[4]
      const normalDealer = parsePrice(row[5])
      // Promo price (col 6) may be "-" or a number
      const promoPrice = parsePrice(row[6])
      const retailExclGST = parsePrice(row[7])
      const retailInclGST = parsePrice(row[8])

      if (!model || typeof model !== 'string' || model.length < 3) continue
      // Skip section headers (e.g. "MONOCHROME SINGLE FUNCTION PRINTERS")
      if (!productCode) continue
      if (isEOL(model)) continue
      // Skip if no dealer price at all
      const partnerPrice = normalDealer || promoPrice
      if (!partnerPrice) continue

      const sellPrice = retailExclGST || partnerPrice
      const name = `Canon ${model.trim()}`
      const description = desc ? firstLine(String(desc)) : name

      products.push({
        sku: `TD-${productCode.trim()}`,
        supplier: 'techdata',
        category: 'Printer',
        name,
        description: description.substring(0, 500),
        long_description: null,
        base_price_sgd: sellPrice,
        partner_price_sgd: partnerPrice,
        price_sgd: sellPrice,
        markup_percent: 0,
        stock_qty: 50,
        image_url: 'https://logo.clearbit.com/canon.com',
        specs: null,
      })
      count++
    }
  }

  parseCanonSheet('Laser Printers')
  parseCanonSheet('Inkjet Printers')

  console.log(`  Canon: ${count} products`)
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

console.log('Parsing price lists...')
parseDell()
parseHP()
parseLenovo()
parseCanon()
console.log(`\nTotal parsed: ${products.length} products`)

// Breakdown by category
const byCategory = products.reduce((acc, p) => {
  const key = `${p.supplier} ${p.category}`
  acc[key] = (acc[key] || 0) + 1
  return acc
}, {})
console.log('Breakdown:', byCategory)

// Upsert into Supabase (on conflict: sku + supplier)
console.log('\nUpserting to Supabase...')
let inserted = 0, failed = 0

for (const product of products) {
  const { error } = await supabase
    .from('products')
    .upsert(product, { onConflict: 'sku,supplier' })

  if (error) {
    console.error(`  ✗ ${product.sku}: ${error.message}`)
    failed++
  } else {
    inserted++
    process.stdout.write(`\r  Upserted ${inserted}/${products.length}...`)
  }
}

console.log(`\n\nDone! ✓ ${inserted} upserted, ✗ ${failed} failed`)
