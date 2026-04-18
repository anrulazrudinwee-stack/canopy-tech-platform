'use client'
import React, { useEffect, useState } from 'react'

// Usage-based pricing notes per SKU (from PAX8 pricing API, USD SRP)
const USAGE_PRICING: Record<string, { unit: string; rates: { label: string; srp: number; buy: number; note?: string; section?: string }[] }> = {
  'ACR-BUP-ACM-C100': {
    unit: 'billed monthly in arrears based on actual usage',
    rates: [
      { section: 'Per Workload',              label: 'Server',                srp: 46.43, buy: 32.50 },
      { section: 'Per Workload',              label: 'VM',                    srp: 16.34, buy: 11.44 },
      { section: 'Per Workload',              label: 'Workstation',           srp: 7.61,  buy: 5.33  },
      { section: 'Per Workload',              label: 'Microsoft 365 seat',    srp: 2.69,  buy: 1.89  },
      { section: 'Per Workload',              label: 'Mobile',                srp: 1.86,  buy: 1.30  },
      { section: 'Hosted Storage (per GB)',   label: 'Acronis Hosted (G1)',   srp: 0.24,  buy: 0.17  },
      { section: 'Hosted Storage (per GB)',   label: 'Google Hosted',         srp: 0.25,  buy: 0.18  },
      { section: 'Hosted Storage (per GB)',   label: 'Azure Hosted',          srp: 0.25,  buy: 0.18  },
      { section: 'Hosted Storage (per GB)',   label: 'Hybrid',                srp: 0.14,  buy: 0.10  },
      { section: 'Per-Workload Storage (per GB)', label: 'Acronis Hosted (G1)', srp: 0.08, buy: 0.06 },
      { section: 'Per-Workload Storage (per GB)', label: 'Google Hosted',     srp: 0.09,  buy: 0.07  },
      { section: 'Per-Workload Storage (per GB)', label: 'Azure Hosted',      srp: 0.09,  buy: 0.07  },
    ],
  },
  'CRD-MSP-DEF-C100': {
    unit: 'per endpoint / month (billed in arrears)',
    rates: [{ label: 'MSSP Advanced Defend', srp: 15.41, buy: 3.50 }],
  },
  'CRD-MSP-FAL-C100': {
    unit: 'per endpoint / month (billed in arrears)',
    rates: [{ label: 'MSSP Complete Defend', srp: 24.82, buy: 6.00 }],
  },
  'CRD-MSP-DEF-C099': {
    unit: 'per endpoint / month (billed in arrears)',
    rates: [{ label: 'MSSP Defend', srp: 9.71, buy: 2.50 }],
  },
  'CRW-STR-DSC-A100': {
    unit: 'per endpoint / month (billed in arrears, tiered)',
    rates: [
      { label: '1–249 endpoints',     srp: 2.3523, buy: 0.58 },
      { label: '250–999 endpoints',   srp: 1.7175, buy: 0.58 },
      { label: '1,000–2,499',         srp: 1.2533, buy: 0.58 },
      { label: '2,500–4,999',         srp: 1.1283, buy: 0.58 },
      { label: '5,000–9,999',         srp: 1.0158, buy: 0.58 },
      { label: '10,000–24,999',       srp: 0.9142, buy: 0.58 },
      { label: '25,000–49,999',       srp: 0.8225, buy: 0.58 },
      { label: '50,000+',             srp: 0.74,   buy: 0.58 },
    ],
  },
  'CRW-STR-SAA-A100': {
    unit: 'per endpoint / month (billed in arrears, tiered)',
    rates: [
      { label: '1–249 endpoints',     srp: 3.83,  buy: 1.00 },
      { label: '250–999 endpoints',   srp: 2.80,  buy: 1.00 },
      { label: '1,000–2,499',         srp: 2.04,  buy: 1.00 },
      { label: '2,500–4,999',         srp: 1.84,  buy: 1.00 },
      { label: '5,000–9,999',         srp: 1.66,  buy: 1.00 },
      { label: '10,000–24,999',       srp: 1.49,  buy: 1.00 },
      { label: '25,000–49,999',       srp: 1.34,  buy: 1.00 },
      { label: '50,000+',             srp: 1.21,  buy: 1.00 },
    ],
  },
  'CWD-DPT-ADD-A100': {
    unit: 'per user / month (billed in arrears)',
    rates: [{ label: 'Data Protection', srp: 2.64, buy: 0.66 }],
  },
  'CRW-MOB-ADD-A100': {
    unit: 'per user / month (billed in arrears)',
    rates: [{ label: 'Mobile Add-on', srp: 3.28, buy: 0.82 }],
  },
  'CRW-NGS-ADD-A100': {
    unit: 'per GB / month (billed in arrears)',
    rates: [{ label: 'NexGen SIEM (365-day retention)', srp: 290, buy: 72 }],
  },
}

export default function AdminProducts() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<{ markup_percent: number; price_sgd: number; stock_qty: number }>({
    markup_percent: 0,
    price_sgd: 0,
    stock_qty: 0,
  })

  useEffect(() => { fetchProducts() }, [])

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/admin/products')
      const data = await res.json()
      setProducts(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (product: any) => {
    setEditingId(product.id)
    setEditValues({
      markup_percent: product.markup_percent ?? 0,
      price_sgd: product.price_sgd ?? 0,
      stock_qty: product.stock_qty,
    })
  }

  const handleMarkupChange = (markup: number, base: number) => {
    const finalPrice = Math.round(base * (1 + markup / 100) * 100) / 100
    setEditValues(v => ({ ...v, markup_percent: markup, price_sgd: finalPrice }))
  }

  const handlePriceChange = (price: number, base: number) => {
    const markup = base > 0 ? Math.round(((price / base) - 1) * 100 * 100) / 100 : 0
    setEditValues(v => ({ ...v, price_sgd: price, markup_percent: markup }))
  }

  const handleSave = async (product: any) => {
    try {
      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: product.id,
          markup_percent: editValues.markup_percent,
          price_sgd: editValues.price_sgd,
          stock_qty: editValues.stock_qty,
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      setProducts(products.map(p =>
        p.id === product.id
          ? { ...p, markup_percent: editValues.markup_percent, price_sgd: editValues.price_sgd, stock_qty: editValues.stock_qty }
          : p
      ))
      setEditingId(null)
    } catch (error) {
      console.error('Error updating product:', error)
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditValues({ markup_percent: 0, price_sgd: 0, stock_qty: 0 })
  }

  // Margin = sell price - partner cost
  const getMargin = (price_sgd: number, partner: number) => {
    if (!partner || !price_sgd) return null
    const margin = price_sgd - partner
    const pct = (margin / partner) * 100
    return { margin, pct }
  }

  if (loading) return <div className="p-8 text-gray-500">Loading products...</div>

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Products ({products.length})</h1>
      <p className="text-sm text-gray-500 mb-8">All prices in SGD · USD→SGD at 1.35</p>

      <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-gray-50 border-b text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="text-left py-3 px-4">Product</th>
              <th className="text-right py-3 px-4">Partner Cost</th>
              <th className="text-right py-3 px-4">PAX8 SRP</th>
              <th className="text-right py-3 px-4">Markup %</th>
              <th className="text-right py-3 px-4">Your Price</th>
              <th className="text-right py-3 px-4">Margin</th>
              <th className="text-right py-3 px-4">Stock</th>
              <th className="text-center py-3 px-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map(product => {
              const base = product.base_price_sgd ?? 0
              const partner = product.partner_price_sgd ?? 0
              const isEditing = editingId === product.id
              const isExpanded = expandedId === product.id
              const currentPrice = isEditing ? editValues.price_sgd : product.price_sgd
              const marginData = getMargin(currentPrice, partner)
              const usagePricing = USAGE_PRICING[product.sku]
              const isUsageBased = product.price_sgd === 0 && !!usagePricing

              return (
                <React.Fragment key={product.id}>
                <tr className={`hover:bg-gray-50 ${isEditing ? 'bg-blue-50' : ''}`}>

                  {/* Product name + SKU */}
                  <td className="py-3 px-4 max-w-xs">
                    <div className="font-medium text-gray-900 truncate">{product.name}</div>
                    <div className="text-xs text-gray-400 font-mono">{product.sku}</div>
                  </td>

                  {/* Partner cost — readonly, always fixed */}
                  <td className="py-3 px-4 text-right">
                    {partner > 0
                      ? <span className="text-gray-600 font-mono">${partner.toFixed(2)}</span>
                      : <span className="text-xs text-gray-300">—</span>
                    }
                  </td>

                  {/* PAX8 SRP (base) — readonly */}
                  <td className="py-3 px-4 text-right">
                    {base > 0
                      ? <span className="text-gray-600 font-mono">${base.toFixed(2)}</span>
                      : <span className="text-xs text-gray-300">Usage-based</span>
                    }
                  </td>

                  {/* Markup % */}
                  <td className="py-3 px-4 text-right">
                    {isEditing ? (
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          value={editValues.markup_percent}
                          onChange={e => handleMarkupChange(parseFloat(e.target.value) || 0, base)}
                          className="border rounded px-2 py-1 w-20 text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                          step="0.5"
                        />
                        <span className="text-gray-400">%</span>
                      </div>
                    ) : (
                      <span className={product.markup_percent > 0 ? 'text-blue-600 font-medium' : 'text-gray-300'}>
                        {product.markup_percent > 0 ? `+${product.markup_percent}%` : '—'}
                      </span>
                    )}
                  </td>

                  {/* Your selling price */}
                  <td className="py-3 px-4 text-right">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editValues.price_sgd}
                        onChange={e => handlePriceChange(parseFloat(e.target.value) || 0, base)}
                        className="border rounded px-2 py-1 w-24 text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                        step="0.01"
                      />
                    ) : product.price_sgd > 0 ? (
                      <span className="font-semibold font-mono">${product.price_sgd.toFixed(2)}</span>
                    ) : isUsageBased ? (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : product.id)}
                        className="text-xs text-amber-600 hover:text-amber-800 font-medium underline underline-offset-2"
                      >
                        {isExpanded ? 'Hide rates ▲' : 'View rates ▼'}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">Contact us</span>
                    )}
                  </td>

                  {/* Margin */}
                  <td className="py-3 px-4 text-right">
                    {marginData ? (
                      <div>
                        <span className={`font-medium text-xs ${marginData.margin >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          ${marginData.margin.toFixed(2)}
                        </span>
                        <span className={`ml-1 text-xs ${marginData.pct >= 0 ? 'text-green-500' : 'text-red-400'}`}>
                          ({marginData.pct.toFixed(1)}%)
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>

                  {/* Stock */}
                  <td className="py-3 px-4 text-right">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editValues.stock_qty}
                        onChange={e => setEditValues(v => ({ ...v, stock_qty: parseInt(e.target.value) || 0 }))}
                        className="border rounded px-2 py-1 w-20 text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      <span className="font-mono">{product.stock_qty}</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-center">
                    {isEditing ? (
                      <div className="flex gap-3 justify-center">
                        <button onClick={() => handleSave(product)} className="text-green-600 hover:text-green-800 font-semibold">Save</button>
                        <button onClick={handleCancel} className="text-gray-400 hover:text-gray-600">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => handleEdit(product)} className="text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                    )}
                  </td>
                </tr>

                {/* Expanded usage pricing row */}
                {isExpanded && usagePricing && (
                  <tr className="bg-amber-50 border-b">
                    <td colSpan={8} className="px-6 py-4">
                      <div className="flex items-start gap-6">
                        <div>
                          <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-2">
                            Usage-based charges — {usagePricing.unit}
                          </p>
                          <table className="text-xs">
                            <thead>
                              <tr className="text-gray-500">
                                <th className="text-left pr-8 pb-1 font-medium">Workload / Tier</th>
                                <th className="text-right pr-6 pb-1 font-medium">SRP (USD)</th>
                                <th className="text-right pr-6 pb-1 font-medium">Partner Buy (USD)</th>
                                <th className="text-right pr-6 pb-1 font-medium">SRP (SGD)</th>
                                <th className="text-right pb-1 font-medium">Partner Buy (SGD)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-amber-100">
                              {usagePricing.rates.map((r, i) => {
                                const prevSection = i > 0 ? usagePricing.rates[i - 1].section : undefined
                                const showSection = r.section && r.section !== prevSection
                                return (
                                  <React.Fragment key={i}>
                                    {showSection && (
                                      <tr>
                                        <td colSpan={5} className="pt-3 pb-0.5 text-xs font-semibold uppercase tracking-wide text-amber-700">
                                          {r.section}
                                        </td>
                                      </tr>
                                    )}
                                    <tr>
                                      <td className="pr-8 py-1 text-gray-700">{r.label}{r.note ? ` (${r.note})` : ''}</td>
                                      <td className="pr-6 py-1 text-right font-mono text-gray-700">${r.srp.toFixed(2)}</td>
                                      <td className="pr-6 py-1 text-right font-mono text-gray-700">${r.buy.toFixed(2)}</td>
                                      <td className="pr-6 py-1 text-right font-mono font-medium">${(r.srp * 1.35).toFixed(2)}</td>
                                      <td className="py-1 text-right font-mono text-green-700">${(r.buy * 1.35).toFixed(2)}</td>
                                    </tr>
                                  </React.Fragment>
                                )
                              })}
                            </tbody>
                          </table>
                          <p className="text-xs text-gray-400 mt-2">
                            These charges are billed by PAX8 after actual usage is recorded. Set a selling price above to charge customers.
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex gap-6 text-xs text-gray-400">
        <span>· <b>Partner Cost</b> = what you pay PAX8 (buy rate)</span>
        <span>· <b>PAX8 SRP</b> = suggested retail (your base, never changes)</span>
        <span>· <b>Your Price</b> = what customers see</span>
        <span>· <b>Margin</b> = Your Price − Partner Cost</span>
      </div>
    </div>
  )
}
