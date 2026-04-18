'use client'
import { useCart } from '@/hooks/useCart'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function CartPage() {
  const { items, removeItem, updateQuantity, clearCart, getTotal } = useCart()

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-4">Shopping Cart</h1>
        <p className="text-gray-600 mb-4">Your cart is empty</p>
        <Link href="/products">
          <Button>Continue Shopping</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-8">Shopping Cart</h1>
      
      <div className="grid grid-cols-3 gap-8">
        <div className="col-span-2">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Product</th>
                <th className="text-right py-2">Price</th>
                <th className="text-right py-2">Quantity</th>
                <th className="text-right py-2">Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.product_id} className="border-b">
                  <td className="py-4">{item.name}</td>
                  <td className="text-right">SGD ${item.price_sgd.toFixed(2)}</td>
                  <td className="text-right">
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.product_id, parseInt(e.target.value) || 1)}
                      className="border rounded px-2 py-1 w-16 text-right"
                    />
                  </td>
                  <td className="text-right">SGD ${(item.price_sgd * item.quantity).toFixed(2)}</td>
                  <td className="text-right">
                    <Button
                      onClick={() => removeItem(item.product_id)}
                      variant="ghost"
                      className="text-red-600"
                    >
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-gray-50 p-6 rounded h-fit">
          <h3 className="font-bold text-lg mb-4">Order Summary</h3>
          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <span>Subtotal</span>
              <span>SGD ${getTotal().toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Shipping</span>
              <span>Free</span>
            </div>
            <div className="flex justify-between font-bold border-t pt-2 mt-2 text-lg">
              <span>Total</span>
              <span className="text-blue-600">SGD ${getTotal().toFixed(2)}</span>
            </div>
          </div>
          
          <Link href="/checkout">
            <Button className="w-full mb-2 bg-blue-600 hover:bg-blue-700">
              Proceed to Checkout
            </Button>
          </Link>
          <Link href="/products">
            <Button variant="outline" className="w-full">
              Continue Shopping
            </Button>
          </Link>
          <Button
            onClick={() => clearCart()}
            variant="ghost"
            className="w-full mt-2 text-red-600"
          >
            Clear Cart
          </Button>
        </div>
      </div>
    </div>
  )
}