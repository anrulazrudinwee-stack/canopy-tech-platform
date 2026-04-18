'use client'
import { useEffect, useState } from 'react'

// Starting price for usage-based products (USD SRP, converted at 1.35)
// Shows the lowest / most representative entry rate for each SKU
const USAGE_FROM: Record<string, { from: number; unit: string; tiered?: boolean }> = {
  'ACR-BUP-ACM-C100': { from: 1.86,  unit: 'workload / mo',  tiered: true  }, // Mobile (cheapest workload)
  'CRD-MSP-DEF-C099': { from: 9.71,  unit: 'endpoint / mo'                  },
  'CRD-MSP-DEF-C100': { from: 15.41, unit: 'endpoint / mo'                  },
  'CRD-MSP-FAL-C100': { from: 24.82, unit: 'endpoint / mo'                  },
  'CRW-STR-DSC-A100': { from: 2.3523, unit: 'endpoint / mo',  tiered: true  },
  'CRW-STR-SAA-A100': { from: 3.83,  unit: 'endpoint / mo',  tiered: true  },
  'CWD-DPT-ADD-A100': { from: 2.64,  unit: 'user / mo'                      },
  'CRW-MOB-ADD-A100': { from: 3.28,  unit: 'user / mo'                      },
  'CRW-NGS-ADD-A100': { from: 290,   unit: 'GB / mo'                        },
}

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [vendor, setVendor] = useState('all')

  useEffect(() => {
    const fetchProducts = async () => {
      const res = await fetch('/api/products')
      const data = await res.json()
      setProducts(Array.isArray(data) ? data : [])
      setLoading(false)
    }
    fetchProducts()
  }, [])

  const vendors = ['all', ...Array.from(new Set(products.map(p => p.supplier))).sort()]

  const filtered = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase())
    const matchesVendor = vendor === 'all' || p.supplier === vendor
    return matchesSearch && matchesVendor
  })

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

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-8">
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border rounded-lg px-4 py-2 text-sm flex-1 min-w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            {vendors.map(v => (
              <button
                key={v}
                onClick={() => setVendor(v)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${
                  vendor === v
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
                }`}
              >
                {v === 'all' ? 'All Suppliers' : v}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20 text-gray-400">No products match your search.</div>
        )}

        {/* Product grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(product => (
            <a
              key={product.id}
              href={`/products/${product.id}`}
              className="bg-white border rounded-xl p-5 hover:shadow-md hover:border-blue-300 transition-all group block"
            >
              {/* Vendor logo + badge */}
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-gray-50 border rounded-lg flex items-center justify-center p-1.5">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.supplier}
                      className="w-full h-full object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  ) : (
                    <span className="text-lg">📦</span>
                  )}
                </div>
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{product.supplier}</span>
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
                    {product.supplier !== 'ingram' && (
                      <p className="text-xs text-gray-400">per user / month</p>
                    )}
                  </div>
                ) : (() => {
                  const usage = USAGE_FROM[product.sku]
                  if (usage) {
                    const sgd = (usage.from * 1.35).toFixed(2)
                    return (
                      <div>
                        <p className="text-base font-bold text-gray-900">
                          {usage.tiered ? 'From ' : ''}SGD ${sgd}
                        </p>
                        <p className="text-xs text-gray-400">per {usage.unit}{usage.tiered ? ' · volume discounts' : ''}</p>
                      </div>
                    )
                  }
                  return (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Contact us</p>
                      <p className="text-xs text-gray-400">for pricing</p>
                    </div>
                  )
                })()}
                <span className="text-xs text-blue-600 font-medium group-hover:underline">View details →</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
