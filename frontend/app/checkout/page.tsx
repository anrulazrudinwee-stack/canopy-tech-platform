'use client'
import { useCart } from '@/hooks/useCart'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useState } from 'react'

export default function CheckoutPage() {
  const { items, getTotal, clearCart } = useCart()
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Checkout</h1>
        <p className="text-gray-600 mb-4">Your cart is empty</p>
        <Link href="/products">
          <Button>Continue Shopping</Button>
        </Link>
      </div>
    )
  }

  const handleCheckout = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(getTotal() * 100),
          email,
          items: items.map(i => ({
            product_id: i.product_id,
            quantity: i.quantity,
            price_sgd: i.price_sgd
          }))
        })
      })

      const data = await res.json()
      if (data.success) {
        clearCart()
        window.location.href = '/order-confirmation'
      } else {
        alert('Error: ' + data.error)
      }
    } catch (error) {
      alert('Error: ' + String(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-8">Checkout</h1>

      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Shipping Address</label>
            <textarea
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="Enter your full address"
              rows={4}
            />
          </div>

          <div className="bg-gray-50 p-4 rounded">
            <h3 className="font-bold mb-4">Order Items</h3>
            {items.map(item => (
              <div key={item.product_id} className="flex justify-between text-sm mb-2">
                <span>{item.name} x{item.quantity}</span>
                <span>SGD ${(item.price_sgd * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <Button
            onClick={handleCheckout}
            disabled={!email || !address || loading}
            className="w-full bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            {loading ? 'Processing...' : 'Place Order'}
          </Button>
        </div>

        <div className="bg-gray-50 p-6 rounded h-fit">
          <h3 className="font-bold text-lg mb-4">Order Summary</h3>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>SGD ${getTotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping</span>
              <span>Free</span>
            </div>
          </div>
          <div className="border-t pt-2 font-bold flex justify-between text-lg">
            <span>Total</span>
            <span className="text-blue-600">SGD ${getTotal().toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}