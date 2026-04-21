'use client'
import { useEffect, useState } from 'react'

// Starting price for usage-based products (USD SRP, converted at 1.35)
const USAGE_FROM: Record<string, { from: number; unit: string; tiered?: boolean }> = {
  'ACR-BUP-ACM-C100': { from: 1.86,   unit: 'workload / mo', tiered: true  },
  'CRD-MSP-DEF-C099': { from: 9.71,   unit: 'endpoint / mo'                },
  'CRD-MSP-DEF-C100': { from: 15.41,  unit: 'endpoint / mo'                },
  'CRD-MSP-FAL-C100': { from: 24.82,  unit: 'endpoint / mo'                },
  'CRW-STR-DSC-A100': { from: 2.3523, unit: 'endpoint / mo', tiered: true  },
  'CRW-STR-SAA-A100': { from: 3.83,   unit: 'endpoint / mo', tiered: true  },
  'CWD-DPT-ADD-A100': { from: 2.64,   unit: 'user / mo'                    },
  'CRW-MOB-ADD-A100': { from: 3.28,   unit: 'user / mo'                    },
  'CRW-NGS-ADD-A100': { from: 290,    unit: 'GB / mo'                      },
}

const CATEGORY_LABELS: Record<string, string> = {
  all:        'All',
  Desktop:    'Desktops',
  Laptop:     'Laptops',
  Networking: 'Networking',
  Printer:    'Printers',
  NAS:        'NAS / Storage',
  software:   'Cloud & Software',
}

// Extract brand name from product (image URL first, SKU prefix as fallback)
function getBrand(imageUrl: string, sku?: string): string {
  if (imageUrl) {
    // Simple Icons CDN (dell, hp, lenovo, synology, tplink)
    const simpleMatch = imageUrl.match(/simpleicons\.org\/([^/?]+)/)
    if (simpleMatch) {
      const simpleMap: Record<string, string> = {
        'dell': 'Dell', 'hp': 'HP', 'lenovo': 'Lenovo',
        'synology': 'Synology', 'tplink': 'TP-Link', 'tp-link': 'TP-Link',
      }
      return simpleMap[simpleMatch[1]] ?? simpleMatch[1]
    }
    // icons8 (microsoft, acronis, canon printer icon)
    const icons8Match = imageUrl.match(/icons8\.com\/[^/]+\/\d+\/([^.]+)\.png/)
    if (icons8Match) {
      const icons8Map: Record<string, string> = {
        'microsoft': 'Microsoft', 'acronis': 'Acronis', 'print': 'Canon',
      }
      return icons8Map[icons8Match[1]] ?? icons8Match[1]
    }
    // icon.horse (crowdstrike)
    const horseMatch = imageUrl.match(/icon\.horse\/icon\/([^.]+)\.com/)
    if (horseMatch) {
      const horseMap: Record<string, string> = { 'crowdstrike': 'CrowdStrike' }
      return horseMap[horseMatch[1]] ?? horseMatch[1]
    }
  }
  if (sku) {
    const prefix = sku.split('-')[0].toUpperCase()
    const skuBrandMap: Record<string, string> = {
      'ACR': 'Acronis', 'CRW': 'CrowdStrike', 'CRD': 'CrowdStrike',
      'CWD': 'CrowdStrike', 'MST': 'Microsoft',
    }
    if (skuBrandMap[prefix]) return skuBrandMap[prefix]
  }
  return 'Other'
}

// Categories that get brand grouping
const GROUPED_CATEGORIES = ['Desktop', 'Laptop', 'Networking', 'Printer', 'NAS', 'software']

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [brand, setBrand] = useState('all')

  useEffect(() => {
    const fetchProducts = async () => {
      const res = await fetch('/api/products')
      const data = await res.json()
      setProducts(Array.isArray(data) ? data : [])
      setLoading(false)
    }
    fetchProducts()
  }, [])

  const rawCategories = Array.from(new Set(products.map(p => p.category || 'software'))).sort()
  const categories = ['all', ...rawCategories]

  const showsBrands = GROUPED_CATEGORIES.includes(category)

  // Products filtered by category + search (before brand filter)
  const categoryFiltered = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase())
    const productCategory = p.category || 'software'
    const matchesCategory = category === 'all' || productCategory === category
    return matchesSearch && matchesCategory
  })

  // Available brands for the selected category
  const brands = Array.from(new Set(categoryFiltered.map(p => getBrand(p.image_url, p.sku)))).sort()

  // Final filtered list (also applies brand filter)
  const filtered = categoryFiltered.filter(p =>
    brand === 'all' || getBrand(p.image_url, p.sku) === brand
  )

  // Reset brand when category changes
  function handleCategoryChange(c: string) {
    setCategory(c)
    setBrand('all')
  }

  // Group products by brand
  const grouped: Record<string, typeof products> = {}
  if (showsBrands && brand === 'all' && !search) {
    for (const p of filtered) {
      const b = getBrand(p.image_url, p.sku)
      if (!grouped[b]) grouped[b] = []
      grouped[b].push(p)
    }
  }
  const showGrouped = showsBrands && brand === 'all' && !search && Object.keys(grouped).length > 0

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-gray-500">Loading products...</div>
  )

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Page header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Products</h1>
          <p className="text-gray-500">{products.length} products available from our suppliers</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Search */}
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border rounded-lg px-4 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Category tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => handleCategoryChange(c)}
              className={`px-5 py-2 rounded-full text-sm font-medium border transition-colors ${
                category === c
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
              }`}
            >
              {CATEGORY_LABELS[c] ?? c}
            </button>
          ))}
        </div>

        {/* Brand cards — shown for hardware categories when no brand selected and no search */}
        {showsBrands && !search && brands.length > 1 && (
          <div className="flex flex-wrap gap-3 mb-8">
            {(['all', ...brands]).map(b => {
              const count = b === 'all' ? categoryFiltered.length : categoryFiltered.filter(p => getBrand(p.image_url, p.sku) === b).length
              const sampleProduct = b === 'all' ? null : categoryFiltered.find(p => getBrand(p.image_url, p.sku) === b)
              return (
                <button
                  key={b}
                  onClick={() => setBrand(b)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                    brand === b
                      ? 'border-blue-500 bg-blue-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
                  }`}
                >
                  {b === 'all' ? (
                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-gray-500 text-xs font-bold">ALL</span>
                    </div>
                  ) : getLogoUrl(sampleProduct) ? (
                    <div className="w-8 h-8 bg-gray-50 border rounded-lg flex items-center justify-center p-1">
                      <img
                        src={getLogoUrl(sampleProduct)}
                        alt={b}
                        className="w-full h-full object-contain"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    </div>
                  ) : null}
                  <div className="text-left">
                    <p className={`text-sm font-semibold ${brand === b ? 'text-blue-700' : 'text-gray-800'}`}>
                      {b === 'all' ? 'All Brands' : b}
                    </p>
                    <p className="text-xs text-gray-400">{count} {count === 1 ? 'product' : 'products'}</p>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-20 text-gray-400">No products match your search.</div>
        )}

        {/* Grouped by brand (hardware, no brand selected, no search) */}
        {showGrouped && (
          <div className="space-y-10">
            {Object.entries(grouped).map(([brandName, brandProducts]) => {
              const sampleProduct = brandProducts[0]
              return (
                <div key={brandName}>
                  {/* Brand section header */}
                  <div className="flex items-center gap-3 mb-4">
                    {getLogoUrl(sampleProduct) && (
                      <div className="w-9 h-9 bg-white border rounded-xl flex items-center justify-center p-1.5 shadow-sm">
                        <img
                          src={getLogoUrl(sampleProduct)}
                          alt={brandName}
                          className="w-full h-full object-contain"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      </div>
                    )}
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">{brandName}</h2>
                      <p className="text-xs text-gray-400">{brandProducts.length} {brandProducts.length === 1 ? 'product' : 'products'}</p>
                    </div>
                  </div>

                  {/* Product cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {brandProducts.map(product => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Flat grid (all categories, or brand selected, or search active) */}
        {!showGrouped && filtered.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const SKU_LOGO: Record<string, string> = {
  ACR: 'https://img.icons8.com/color/96/acronis.png',
  CRW: 'https://icon.horse/icon/crowdstrike.com',
  CRD: 'https://icon.horse/icon/crowdstrike.com',
  CWD: 'https://icon.horse/icon/crowdstrike.com',
  MST: 'https://img.icons8.com/color/96/microsoft.png',
}

function getLogoUrl(product: any): string {
  if (product.image_url) return product.image_url
  const prefix = (product.sku || '').split('-')[0].toUpperCase()
  return SKU_LOGO[prefix] || ''
}

function ProductCard({ product }: { product: any }) {
  const isHardware = product.supplier !== 'pax8'
  const usage = USAGE_FROM[product.sku]
  const logoUrl = getLogoUrl(product)

  return (
    <a
      href={`/products/${product.id}`}
      className="bg-white border rounded-xl p-5 hover:shadow-md hover:border-blue-300 transition-all group block"
    >
      {/* Logo + category badge */}
      <div className="flex items-center justify-between mb-4">
        <div className="w-10 h-10 bg-gray-50 border rounded-lg flex items-center justify-center p-1.5">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={getBrand(logoUrl, product.sku)}
              className="w-full h-full object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <span className="text-lg">📦</span>
          )}
        </div>
        {product.category && (
          <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
            {CATEGORY_LABELS[product.category] ?? product.category}
          </span>
        )}
      </div>

      {/* Name */}
      <h2 className="font-semibold text-gray-900 text-sm leading-snug mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
        {product.name}
      </h2>

      {/* Description */}
      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-4">
        {product.description}
      </p>

      {/* Price */}
      <div className="flex items-end justify-between mt-auto pt-4 border-t">
        {product.price_sgd > 0 ? (
          <div>
            <p className="text-lg font-bold text-gray-900">SGD ${product.price_sgd.toFixed(2)}</p>
            {!isHardware && <p className="text-xs text-gray-400">per user / month</p>}
          </div>
        ) : usage ? (
          <div>
            <p className="text-base font-bold text-gray-900">
              {usage.tiered ? 'From ' : ''}SGD ${(usage.from * 1.35).toFixed(2)}
            </p>
            <p className="text-xs text-gray-400">per {usage.unit}{usage.tiered ? ' · volume discounts' : ''}</p>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium text-gray-500">Contact us</p>
            <p className="text-xs text-gray-400">for pricing</p>
          </div>
        )}
        <span className="text-xs text-blue-600 font-medium group-hover:underline">View details →</span>
      </div>
    </a>
  )
}
