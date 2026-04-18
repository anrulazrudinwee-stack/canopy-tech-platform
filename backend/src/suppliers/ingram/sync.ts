import { createClient } from '@supabase/supabase-js'
import { IngramMicroClient, IngramProduct } from './client'

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )
}

export class IngramSyncService {
  private ingramClient: IngramMicroClient

  constructor(clientId: string, clientSecret: string, sandbox: boolean = true) {
    this.ingramClient = new IngramMicroClient(clientId, clientSecret, sandbox)
  }

  /**
   * Search and sync products by category
   */
  async syncProductsByCategory(
    category: string,
    limit: number = 100
  ): Promise<number> {
    console.log(`\n📦 Syncing Ingram Micro category: ${category}`)

    try {
      // Search products in category
      const searchResult = await this.ingramClient.searchByCategory(
        category,
        0,
        limit
      )

      if (!searchResult.products || searchResult.products.length === 0) {
        console.log(`⚠️  No products found for category: ${category}`)
        return 0
      }

      let synced = 0

      // Sync each product
      for (const product of searchResult.products) {
        try {
          await this.syncProduct(product, 'ingram')
          synced++
        } catch (error) {
          console.error(`  ✗ Failed to sync product: ${product.productName}`)
          continue
        }
      }

      console.log(`✓ Synced ${synced} products from category: ${category}`)
      return synced
    } catch (error) {
      console.error(`✗ Category sync failed for ${category}:`, error)
      return 0
    }
  }

  /**
   * Search and sync products by keyword
   */
  async syncProductsByKeyword(
    keyword: string,
    limit: number = 50
  ): Promise<number> {
    console.log(`\n🔍 Searching Ingram Micro: "${keyword}"`)

    try {
      const searchResult = await this.ingramClient.searchProducts(keyword, 0, limit)

      if (!searchResult.products || searchResult.products.length === 0) {
        console.log(`⚠️  No products found for: "${keyword}"`)
        return 0
      }

      let synced = 0

      for (const product of searchResult.products) {
        try {
          await this.syncProduct(product, 'ingram')
          synced++
        } catch (error) {
          console.error(`  ✗ Failed to sync: ${product.productName}`)
          continue
        }
      }

      console.log(`✓ Synced ${synced} products for keyword: "${keyword}"`)
      return synced
    } catch (error) {
      console.error(`✗ Keyword search failed for "${keyword}":`, error)
      return 0
    }
  }

  /**
   * Sync individual product to Supabase
   */
  private async syncProduct(
    product: IngramProduct,
    supplier: string = 'ingram'
  ): Promise<void> {
    // Get stock from first warehouse
    const stock =
      product.stockAvailability?.[0]?.quantityAvailable || 0

    // Get image URL
    const imageUrl = product.images?.[0]?.imageUrl || ''

    const { error } = await getSupabase()
      .from('products')
      .upsert(
        {
          sku: product.ingramPartNumber,
          supplier,
          name: product.productName,
          description: product.shortDescription || product.longDescription || '',
          price_sgd: parseFloat(product.unitPrice?.toString() || '0'),
          stock_qty: stock,
          image_url: imageUrl
        },
        { onConflict: 'sku,supplier' }
      )

    if (error) {
      throw new Error(`Supabase upsert failed: ${error.message}`)
    }
  }

  /**
   * Run full sync with predefined categories and keywords
   */
  async fullSync(): Promise<number> {
    console.log('\n=== INGRAM MICRO FULL SYNC ===')

    const categories = [
      'Desktops',
      'Laptops',
      'Networking',
      'Storage'
    ]

    const keywords = [
      'Dell',
      'HP',
      'Lenovo',
      'Cisco',
      'Synology'
    ]

    let totalSynced = 0

    // Sync by categories
    for (const category of categories) {
      const synced = await this.syncProductsByCategory(category, 100)
      totalSynced += synced
    }

    // Sync by keywords
    for (const keyword of keywords) {
      const synced = await this.syncProductsByKeyword(keyword, 50)
      totalSynced += synced
    }

    console.log(
      `\n✓ Ingram Micro sync complete! Total: ${totalSynced} products\n`
    )
    return totalSynced
  }
}