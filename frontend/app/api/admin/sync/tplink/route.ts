import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'

export async function POST(request: NextRequest) {
  const { session } = await request.json()

  if (!session?.trim()) {
    return NextResponse.json({ success: false, error: 'PHPSESSID cookie is required' }, { status: 400 })
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/sync/tplink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session: session.trim() }),
    })
    const data = await response.json()
    return NextResponse.json(data, { status: response.ok ? 200 : 500 })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: `Cannot reach backend: ${err.message}` },
      { status: 502 }
    )
  }
}
