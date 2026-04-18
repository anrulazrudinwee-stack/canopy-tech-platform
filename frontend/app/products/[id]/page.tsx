'use client'
import React, { useEffect, useState } from 'react'
import { use } from 'react'
import { Button } from '@/components/ui/button'
import { useCart } from '@/hooks/useCart'

type Tab = 'overview' | 'details' | 'specs' | 'techspecs'

// SRP-only usage rates shown to customers (USD, converted to SGD at 1.35)
const USAGE_PRICING: Record<string, { unit: string; rates: { label: string; srp: number; note?: string; section?: string }[] }> = {
  'ACR-BUP-ACM-C100': {
    unit: 'billed monthly in arrears based on actual usage',
    rates: [
      // Per Workload
      { section: 'Per Workload',              label: 'Server',                    srp: 46.43 },
      { section: 'Per Workload',              label: 'VM',                        srp: 16.34 },
      { section: 'Per Workload',              label: 'Workstation',               srp: 7.61  },
      { section: 'Per Workload',              label: 'Microsoft 365 seat',        srp: 2.69  },
      { section: 'Per Workload',              label: 'Mobile',                    srp: 1.86  },
      // Hosted Storage (per GB)
      { section: 'Hosted Storage (per GB)',   label: 'Acronis Hosted (G1)',       srp: 0.24  },
      { section: 'Hosted Storage (per GB)',   label: 'Google Hosted',             srp: 0.25  },
      { section: 'Hosted Storage (per GB)',   label: 'Azure Hosted',              srp: 0.25  },
      { section: 'Hosted Storage (per GB)',   label: 'Hybrid',                    srp: 0.14  },
      // Workload-model Storage (per GB)
      { section: 'Per-Workload Storage (per GB)', label: 'Acronis Hosted (G1)',   srp: 0.08  },
      { section: 'Per-Workload Storage (per GB)', label: 'Google Hosted',         srp: 0.09  },
      { section: 'Per-Workload Storage (per GB)', label: 'Azure Hosted',          srp: 0.09  },
    ],
  },
  'CRD-MSP-DEF-C100': { unit: 'per endpoint / month', rates: [{ label: 'MSSP Advanced Defend', srp: 15.41 }] },
  'CRD-MSP-FAL-C100': { unit: 'per endpoint / month', rates: [{ label: 'MSSP Complete Defend',  srp: 24.82 }] },
  'CRD-MSP-DEF-C099': { unit: 'per endpoint / month', rates: [{ label: 'MSSP Defend',           srp: 9.71  }] },
  'CRW-STR-DSC-A100': {
    unit: 'per endpoint / month (tiered)',
    rates: [
      { label: '1–249 endpoints',     srp: 2.3523 },
      { label: '250–999 endpoints',   srp: 1.7175 },
      { label: '1,000–2,499',         srp: 1.2533 },
      { label: '2,500–4,999',         srp: 1.1283 },
      { label: '5,000–9,999',         srp: 1.0158 },
      { label: '10,000–24,999',       srp: 0.9142 },
      { label: '25,000–49,999',       srp: 0.8225 },
      { label: '50,000+',             srp: 0.74   },
    ],
  },
  'CRW-STR-SAA-A100': {
    unit: 'per endpoint / month (tiered)',
    rates: [
      { label: '1–249 endpoints',     srp: 3.83 },
      { label: '250–999 endpoints',   srp: 2.80 },
      { label: '1,000–2,499',         srp: 2.04 },
      { label: '2,500–4,999',         srp: 1.84 },
      { label: '5,000–9,999',         srp: 1.66 },
      { label: '10,000–24,999',       srp: 1.49 },
      { label: '25,000–49,999',       srp: 1.34 },
      { label: '50,000+',             srp: 1.21 },
    ],
  },
  'CWD-DPT-ADD-A100': { unit: 'per user / month',    rates: [{ label: 'Data Protection Add-on',           srp: 2.64  }] },
  'CRW-MOB-ADD-A100': { unit: 'per user / month',    rates: [{ label: 'Mobile Add-on',                    srp: 3.28  }] },
  'CRW-NGS-ADD-A100': { unit: 'per GB / month',      rates: [{ label: 'NexGen SIEM (365-day retention)',   srp: 290   }] },
}

export default function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState<number | string>(1)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const { addItem } = useCart()

  useEffect(() => {
    const fetchProduct = async () => {
      const res = await fetch(`/api/products?id=${id}`)
      const data = await res.json()
      setProduct(res.ok ? data : null)
      setLoading(false)
    }
    fetchProduct()
  }, [id])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-500">Loading product...</div>
    </div>
  )

  if (!product) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-2xl font-bold mb-2">Product not found</p>
        <a href="/products" className="text-blue-600 hover:underline">Back to products</a>
      </div>
    </div>
  )

  const qty = typeof quantity === 'string' ? 1 : quantity
  const monthlyTotal = product.price_sgd > 0 ? (product.price_sgd * qty).toFixed(2) : null
  const hasDetails = product.long_description && product.long_description.trim().length > 0
  const usagePricing = USAGE_PRICING[product.sku]
  const isUsageBased = product.price_sgd === 0 && !!usagePricing

  const hasTechSpecs = product.supplier === 'ingram' && product.specs && Object.keys(product.specs).length > 0

  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    ...(hasDetails ? [{ key: 'details' as Tab, label: 'Full Details' }] : []),
    ...(hasTechSpecs ? [{ key: 'techspecs' as Tab, label: 'Tech Specs' }] : []),
    { key: 'specs', label: 'Specifications' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Hero */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <a href="/products" className="text-sm text-blue-600 hover:underline mb-6 inline-block">← Back to Products</a>
          <div className="flex items-start gap-6">
            {/* Logo */}
            <div className="w-20 h-20 flex-shrink-0 bg-gray-50 border rounded-2xl flex items-center justify-center p-3 shadow-sm">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.supplier}
                  className="w-full h-full object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              ) : (
                <span className="text-3xl">📦</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {product.supplier}
                </span>
                {product.stock_qty > 0
                  ? <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded">Available</span>
                  : <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded">Out of stock</span>
                }
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2 leading-snug">{product.name}</h1>
              <p className="text-gray-600 text-sm leading-relaxed max-w-3xl">{product.description}</p>
            </div>

            {/* Price (hero) */}
            <div className="flex-shrink-0 text-right hidden md:block">
              {product.price_sgd > 0 ? (
                <>
                  <p className="text-3xl font-bold text-blue-600">SGD ${product.price_sgd.toFixed(2)}</p>
                  {product.supplier === 'pax8' && (
                    <p className="text-xs text-gray-400 mt-1">per user / month</p>
                  )}
                </>
              ) : (
                <p className="text-base font-medium text-gray-500">Contact us for pricing</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-0">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid grid-cols-3 gap-8">

          {/* Main content */}
          <div className="col-span-2">

            {/* Overview tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl border p-6">
                  <h2 className="text-lg font-semibold mb-4">About this product</h2>
                  <p className="text-gray-700 leading-relaxed">{product.description}</p>
                </div>

                {hasDetails && (
                  <div className="bg-white rounded-xl border p-6">
                    <h2 className="text-lg font-semibold mb-4">What's included</h2>
                    <div
                      className="text-gray-700 text-sm leading-relaxed
                        [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_ul]:mt-2
                        [&_li]:text-gray-700
                        [&_b]:font-semibold [&_strong]:font-semibold
                        [&_p]:mb-3"
                      dangerouslySetInnerHTML={{ __html: product.long_description }}
                    />
                  </div>
                )}

                {/* Usage pricing table */}
                {isUsageBased && (
                  <div className="bg-white rounded-xl border p-6">
                    <h2 className="text-lg font-semibold mb-1">Pricing</h2>
                    <p className="text-sm text-gray-500 mb-4">{usagePricing.unit}</p>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs uppercase tracking-wide text-gray-400 border-b">
                          <th className="text-left pb-2">Workload / Tier</th>
                          <th className="text-right pb-2">Price (SGD)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {usagePricing.rates.map((r, i) => {
                          const prevSection = i > 0 ? usagePricing.rates[i - 1].section : undefined
                          const showSection = r.section && r.section !== prevSection
                          return (
                            <React.Fragment key={i}>
                              {showSection && (
                                <tr>
                                  <td colSpan={2} className="pt-4 pb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                                    {r.section}
                                  </td>
                                </tr>
                              )}
                              <tr>
                                <td className="py-2.5 text-gray-700">{r.label}{r.note ? ` (${r.note})` : ''}</td>
                                <td className="py-2.5 text-right font-semibold text-gray-900">
                                  SGD ${(r.srp * 1.35).toFixed(2)}
                                </td>
                              </tr>
                            </React.Fragment>
                          )
                        })}
                      </tbody>
                    </table>
                    <p className="text-xs text-gray-400 mt-4">Prices converted from USD SRP at 1.35. Billed monthly based on actual consumption. Excludes GST.</p>
                  </div>
                )}

                {/* Billing info */}
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 flex gap-4 items-start">
                  <span className="text-2xl">💳</span>
                  <div>
                    <p className="font-semibold text-gray-800 mb-1">{isUsageBased ? 'Usage-based billing' : 'Flexible billing'}</p>
                    <p className="text-sm text-gray-600">
                      {isUsageBased
                        ? 'Charges are calculated at the end of each month based on actual usage. No upfront commitment required.'
                        : 'Billed monthly per user. Cancel or adjust licences anytime. Annual commitment options available for savings.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Full details tab */}
            {activeTab === 'details' && hasDetails && (
              <div className="bg-white rounded-xl border p-6">
                <h2 className="text-lg font-semibold mb-6">Full Product Details</h2>
                <div
                  className="text-gray-700 text-sm leading-relaxed
                    [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_ul]:mt-2 [&_ul]:mb-4
                    [&_li]:text-gray-700
                    [&_b]:font-semibold [&_strong]:font-semibold
                    [&_p]:mb-4
                    [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-2
                    [&_h3]:text-sm [&_h3]:font-bold [&_h3]:mt-4 [&_h3]:mb-2
                    [&_a]:text-blue-600 [&_a]:hover:underline"
                  dangerouslySetInnerHTML={{ __html: product.long_description }}
                />
              </div>
            )}

            {/* Tech Specs tab — Ingram hardware only */}
            {activeTab === 'techspecs' && hasTechSpecs && (
              <div className="bg-white rounded-xl border p-6">
                <h2 className="text-lg font-semibold mb-6">Technical Specifications</h2>
                <dl className="divide-y">
                  {Object.entries(product.specs as Record<string, string>).map(([label, value]) => (
                    <div key={label} className="grid grid-cols-5 gap-4 py-3 text-sm">
                      <dt className="col-span-2 text-gray-500 font-medium">{label}</dt>
                      <dd className="col-span-3 text-gray-900">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            {/* Specifications tab — vendor / licence info */}
            {activeTab === 'specs' && (
              <div className="bg-white rounded-xl border p-6">
                <h2 className="text-lg font-semibold mb-6">Specifications</h2>
                <dl className="divide-y">
                  {[
                    { label: 'SKU',           value: product.sku },
                    { label: 'Supplier',      value: product.supplier?.toUpperCase() },
                    { label: 'Vendor',        value: product.supplier === 'pax8' ? 'PAX8' : product.supplier === 'ingram' ? 'Ingram Micro' : product.supplier },
                    ...(product.supplier !== 'ingram' ? [
                      { label: 'Billing cycle', value: 'Monthly' },
                      { label: 'Unit',          value: 'Per user / per licence' },
                    ] : [
                      { label: 'Type',          value: 'Hardware (one-time)' },
                    ]),
                    { label: 'Availability',  value: product.stock_qty > 0 ? `${product.stock_qty} units available` : 'Out of stock' },
                    { label: 'Price (SGD)',    value: product.price_sgd > 0 ? `SGD $${product.price_sgd.toFixed(2)}${product.supplier !== 'ingram' ? ' / user / month' : ''}` : 'Usage-based' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between py-3 text-sm">
                      <dt className="text-gray-500">{label}</dt>
                      <dd className="font-medium text-gray-900 text-right font-mono">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

          </div>

          {/* Sidebar: purchase card */}
          <div className="col-span-1">
            <div className="bg-white rounded-xl border p-6 sticky top-20 space-y-5">
              {product.price_sgd > 0 ? (
                <>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Price per user / month</p>
                    <p className="text-3xl font-bold text-blue-600">SGD ${product.price_sgd.toFixed(2)}</p>
                  </div>

                  <div className="border-t pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Number of users</label>
                    <input
                      type="number"
                      min="1"
                      max={product.stock_qty || 9999}
                      value={quantity}
                      onChange={e => setQuantity(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1))}
                      className="border rounded-lg px-3 py-2 w-full text-center text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {monthlyTotal && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between text-sm text-gray-500 mb-1">
                        <span>{qty} user{qty !== 1 ? 's' : ''} × SGD ${product.price_sgd.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm font-medium">Monthly total</span>
                        <span className="text-xl font-bold text-gray-900">SGD ${monthlyTotal}</span>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={() => {
                      addItem(product, qty)
                      alert(`Added ${qty} licence${qty !== 1 ? 's' : ''} to cart!`)
                    }}
                    size="lg"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
                    disabled={product.stock_qty === 0}
                  >
                    Add to Cart
                  </Button>

                  <p className="text-xs text-gray-400 text-center">Prices in SGD · Billed monthly<br/>Licences adjustable anytime</p>
                </>
              ) : (
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-2xl">💬</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">Custom pricing</p>
                    <p className="text-sm text-gray-500">This product is usage-based or requires a tailored quote. Get in touch and we'll set it up for you.</p>
                  </div>
                  <Button size="lg" className="w-full" variant="outline">Contact Us</Button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
