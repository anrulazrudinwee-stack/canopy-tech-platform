'use client'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function OrderConfirmation() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto text-center">
        <div className="text-6xl mb-4">✓</div>
        <h1 className="text-4xl font-bold mb-2">Order Confirmed!</h1>
        <p className="text-gray-600 mb-8">
          Thank you for your purchase. Check your email for order details.
        </p>
        <div className="space-x-4">
          <Link href="/account/orders">
            <Button>View My Orders</Button>
          </Link>
          <Link href="/products">
            <Button variant="outline">Continue Shopping</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}