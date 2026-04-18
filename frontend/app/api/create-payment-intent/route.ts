import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { amount, email, items } = await request.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Create order in database
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        order_number: `ORD-${Date.now()}`,
        total_sgd: amount / 100,
        status: 'confirmed'
      })
      .select()
      .single()

    if (error) throw error

    // Create order items
    for (const item of items) {
      await supabase
        .from('order_items')
        .insert({
          order_id: order.id,
          product_id: item.product_id,
          quantity: item.quantity,
          price_sgd: item.price_sgd
        })
    }

    return NextResponse.json({
      clientSecret: 'test_secret_' + Date.now(),
      success: true,
      orderId: order.id
    })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}