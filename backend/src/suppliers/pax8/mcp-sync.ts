import { spawn } from 'child_process'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )
}

function getMcpToken() {
  return process.env.PAX8_MCP_TOKEN || ''
}

let requestId = 1

function sendRequest(proc: ReturnType<typeof spawn>, method: string, params: object): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = requestId++
    const message = JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n'

    let buffer = ''

    const onData = (data: Buffer) => {
      buffer += data.toString()
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const parsed = JSON.parse(line)
          if (parsed.id === id) {
            proc.stdout?.off('data', onData)
            if (parsed.error) reject(new Error(JSON.stringify(parsed.error)))
            else resolve(parsed.result)
          }
        } catch {}
      }
    }

    proc.stdout?.on('data', onData)
    proc.stdin?.write(message)

    setTimeout(() => {
      proc.stdout?.off('data', onData)
      reject(new Error(`MCP request timed out: ${method}`))
    }, 30000)
  })
}

function spawnMcpProcess() {
  const token = getMcpToken()
  return spawn('npx', [
    '-y', '--ignore-scripts',
    'supergateway@3.4.0',
    '--header', `x-pax8-mcp-token:${token}`,
    '--streamableHttp', 'https://mcp.pax8.com/v1/mcp'
  ], { stdio: ['pipe', 'pipe', 'pipe'], shell: true })
}

async function callPax8Tool(
  proc: ReturnType<typeof spawn>,
  toolName: string,
  args: object = {}
): Promise<any> {
  const result = await sendRequest(proc, 'tools/call', {
    name: toolName,
    arguments: args
  })

  const text = result?.content?.find((c: any) => c.type === 'text')?.text
  return text ? JSON.parse(text) : null
}

export async function syncPAX8ProductsViaMCP() {
  console.log('🔄 Syncing PAX8 products via MCP...')

  const supabase = getSupabase()

  // Test Supabase connection
  const { error: testError } = await supabase.from('products').select('id').limit(1)
  if (testError) {
    console.error('  ✗ Supabase connection failed:', testError.message)
    return 0
  }
  console.log('  ✓ Supabase connected')

  // Specific product searches — add more productName entries as needed
  const SEARCHES: Record<string, string>[] = [
    { productName: 'Microsoft 365 Business Basic' },
    { productName: 'Microsoft 365 Business Standard' },
    { productName: 'Microsoft 365 Business Premium' },
    { productName: 'Microsoft 365 Apps for Business' },
    { productName: 'Microsoft 365 Apps for Enterprise' },
    { productName: 'Office 365 E1' },
    { productName: 'Office 365 E3' },
    { productName: 'Office 365 E5' },
    { productName: 'Acronis Cyber Protect' },
    { vendorName: 'CrowdStrike' },
  ]

  const allProducts: any[] = []

  const proc = spawnMcpProcess()
  try {
    await sendRequest(proc, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'canopy-backend', version: '1.0.0' }
    })

    for (const params of SEARCHES) {
      try {
        const data = await callPax8Tool(proc, 'pax8-list-products', params)
        const products = data?.content || []
        allProducts.push(...products)
        const label = params.productName || params.vendorName
        console.log(`  ✓ "${label}": ${products.length} products`)
      } catch (e: any) {
        console.error(`  ✗ Search failed (${JSON.stringify(params)}):`, e.message)
      }
    }
  } finally {
    proc.kill()
  }

  // Deduplicate by SKU
  const seen = new Set<string>()
  const uniqueProducts = allProducts.filter((p: any) => {
    if (seen.has(p.sku)) return false
    seen.add(p.sku)
    return true
  })
  console.log(`  Fetched ${allProducts.length} total, ${uniqueProducts.length} unique SKUs`)

  // Delete old PAX8 rows and re-insert
  const { error: deleteError } = await supabase.from('products').delete().eq('supplier', 'pax8')
  if (deleteError) {
    console.error('  ✗ Failed to clear old rows:', deleteError.message)
    return 0
  }

  const BATCH = 100
  let totalSynced = 0

  for (let i = 0; i < uniqueProducts.length; i += BATCH) {
    const batch = uniqueProducts.slice(i, i + BATCH).map((p: any) => ({
      sku: p.sku,
      supplier: 'pax8',
      name: p.name,
      description: p.description || '',
      price_sgd: 0,
      stock_qty: 100,
      image_url: ''
    }))

    const { error } = await supabase.from('products').insert(batch)
    if (error) {
      console.error(`  ✗ Insert failed (rows ${i}–${i + batch.length}): ${error.message}`)
    } else {
      totalSynced += batch.length
    }
  }

  console.log(`✓ PAX8 sync complete! Synced ${totalSynced} products`)
  return totalSynced
}
