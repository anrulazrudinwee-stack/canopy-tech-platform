const dotenv = require('dotenv')
const cron = require('node-cron')

dotenv.config()

console.log('🚀 Data ingestion service starting...')

// Run sync immediately on startup
syncAllSuppliers()

// Schedule: Every 6 hours
cron.schedule('0 */6 * * *', () => {
  console.log('⏰ Scheduled sync triggered')
  syncAllSuppliers()
})

console.log('✓ Service running. Syncing every 6 hours.')

process.on('SIGINT', () => {
  console.log('Shutting down...')
  process.exit(0)
})

async function syncAllSuppliers() {
  const { createClient } = require('@supabase/supabase-js')
  
  console.log('Starting supplier sync...')
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Innovix
  try {
    const innovixProducts = [
      {
        sku: 'DELL-XPS13',
        name: 'Dell XPS 13 Laptop',
        price_sgd: 1800,
        stock_qty: 10,
        description: 'High-performance ultrabook',
        supplier: 'innovix'
      },
      {
        sku: 'CISCO-SWITCH',
        name: 'Cisco Catalyst 9200 Switch',
        price_sgd: 5000,
        stock_qty: 5,
        description: 'Enterprise network switch',
        supplier: 'innovix'
      }
    ]

    const { error: err1 } = await supabase
      .from('products')
      .upsert(innovixProducts, { onConflict: 'sku,supplier' })

    if (err1) throw err1
    console.log(`✓ Synced ${innovixProducts.length} products from Innovix`)
  } catch (err) {
    console.error('Innovix sync failed', err)
  }

  // Ingram Micro
  try {
    const ingramProducts = [
      {
        sku: 'HP-ELITEBOOK',
        name: 'HP EliteBook 15',
        price_sgd: 2200,
        stock_qty: 5,
        description: 'Business laptop',
        supplier: 'ingram'
      },
      {
        sku: 'NETAPP-STORAGE',
        name: 'NetApp AFF A220',
        price_sgd: 15000,
        stock_qty: 1,
        description: 'Enterprise storage',
        supplier: 'ingram'
      }
    ]

    const { error: err2 } = await supabase
      .from('products')
      .upsert(ingramProducts, { onConflict: 'sku,supplier' })

    if (err2) throw err2
    console.log(`✓ Synced ${ingramProducts.length} products from Ingram`)
  } catch (err) {
    console.error('Ingram sync failed', err)
  }

  // PAX8
  try {
    const pax8Products = [
      {
        sku: 'LENOVO-X1',
        name: 'Lenovo ThinkPad X1',
        price_sgd: 2100,
        stock_qty: 8,
        description: 'Professional laptop',
        supplier: 'pax8'
      },
      {
        sku: 'VMWARE-LICENSE',
        name: 'VMware vSphere 8',
        price_sgd: 3500,
        stock_qty: 20,
        description: 'Virtualization',
        supplier: 'pax8'
      }
    ]

    const { error: err3 } = await supabase
      .from('products')
      .upsert(pax8Products, { onConflict: 'sku,supplier' })

    if (err3) throw err3
    console.log(`✓ Synced ${pax8Products.length} products from PAX8`)
  } catch (err) {
    console.error('PAX8 sync failed', err)
  }

  console.log('Sync complete!')
}