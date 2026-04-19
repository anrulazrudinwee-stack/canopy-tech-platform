import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'

export async function POST(request: NextRequest) {
  const { username, password } = await request.json()

  if (!username || !password) {
    return NextResponse.json({ success: false, error: 'username and password are required' }, { status: 400 })
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/sync/tplink/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    const data = await response.json()
    return NextResponse.json(data, { status: response.ok ? 200 : response.status })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: `Cannot reach backend: ${err.message}` },
      { status: 502 }
    )
  }
}
