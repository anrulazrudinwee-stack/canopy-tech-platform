import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(__dirname, '../.env') })
import express from 'express'
import cron from 'node-cron'
import { createClient } from '@supabase/supabase-js'
import { IngramSyncService } from './suppliers/ingram/sync'
import { syncPAX8Products } from './suppliers/pax8/sync'
import { innovixLogin } from './suppliers/innovix/login'
import { spawn } from 'child_process'

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(express.json())

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

// Ingram Micro credentials
const INGRAM_CLIENT_ID = process.env.INGRAM_CLIENT_ID || ''
const INGRAM_CLIENT_SECRET = process.env.INGRAM_CLIENT_SECRET || ''
const INGRAM_SANDBOX = process.env.INGRAM_SANDBOX !== 'false'

// PAX8 MCP Token
const PAX8_MCP_TOKEN = process.env.PAX8_MCP_TOKEN || ''

let ingramService: IngramSyncService

async function startServer() {
  console.log('\n========================================')
  console.log('🚀 CANOPY TECH PLATFORM - BACKEND')
  console.log('========================================')
  console.log(`Server: http://localhost:${PORT}`)
  console.log(`Health: http://localhost:${PORT}/health`)
  console.log(`Manual Sync: POST http://localhost:${PORT}/api/sync`)
  console.log('========================================\n')

  // Initialize Ingram Micro service
  try {
    ingramService = new IngramSyncService(
      INGRAM_CLIENT_ID,
      INGRAM_CLIENT_SECRET,
      INGRAM_SANDBOX
    )
    console.log('✅ Ingram Micro service initialized')
  } catch (error) {
    console.error('❌ Failed to initialize Ingram Micro service:', error)
  }

  // Check PAX8 MCP token
  if (PAX8_MCP_TOKEN) {
    console.log('✅ PAX8 MCP token configured')
  } else {
    console.warn('⚠️  PAX8 MCP token not found in .env')
  }

  console.log('\n⏰ Setting up cron jobs...\n')

  // Schedule PAX8 sync every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    console.log('\n[CRON] Triggered: PAX8 sync (6-hour schedule)')
    await runPAX8Sync()
  })

  console.log('✅ PAX8 Sync: Every 6 hours (0 */6 * * *)')
  console.log('   Next runs: 00:00, 06:00, 12:00, 18:00 daily')

  // Run initial PAX8 sync after 30 seconds
  console.log('\n🔄 Initial PAX8 sync will run in 30 seconds...\n')
  setTimeout(async () => {
    await runPAX8Sync()
  }, 30000)

  console.log('========================================\n')

  // Start Express server
  app.listen(PORT, () => {
    console.log(`✅ Server started on port ${PORT}\n`)
  })
}

async function runPAX8Sync() {
  try {
    await syncPAX8Products()
  } catch (error) {
    console.error('❌ PAX8 sync error:', error)
  }
}

async function runIngramSync() {
  try {
    if (!INGRAM_CLIENT_ID || !INGRAM_CLIENT_SECRET) {
      console.log('⚠️  Ingram Micro credentials not configured. Skipping sync.')
      return
    }

    await ingramService.fullSync()
  } catch (error) {
    console.error('❌ Ingram Micro sync error:', error)
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Canopy Tech Platform Backend',
    timestamp: new Date().toISOString()
  })
})

// Get sync status
app.get('/api/sync/status', (req, res) => {
  res.json({
    pax8: {
      enabled: !!PAX8_MCP_TOKEN,
      method: 'MCP',
      schedule: 'Every 6 hours',
      nextRuns: '00:00, 06:00, 12:00, 18:00 daily'
    },
    ingram: {
      enabled: !!(INGRAM_CLIENT_ID && INGRAM_CLIENT_SECRET),
      status: 'Awaiting app approval',
      method: 'OAuth 2.0'
    },
    innovix: {
      enabled: false,
      status: 'No public API available'
    }
  })
})

// Manual sync trigger - PAX8
app.post('/api/sync/pax8', async (req, res) => {
  try {
    console.log('[API] Manual PAX8 sync triggered')
    
    // Run sync in background
    runPAX8Sync()
      .then(() => console.log('[API] Manual PAX8 sync completed'))
      .catch(error => console.error('[API] Manual PAX8 sync failed:', error))

    res.json({ 
      success: true, 
      message: 'PAX8 sync started in background' 
    })
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
})

// Manual sync trigger - Ingram
app.post('/api/sync/ingram', async (req, res) => {
  try {
    console.log('[API] Manual Ingram sync triggered')
    
    runIngramSync()
      .then(() => console.log('[API] Manual Ingram sync completed'))
      .catch(error => console.error('[API] Manual Ingram sync failed:', error))

    res.json({ 
      success: true, 
      message: 'Ingram sync started in background' 
    })
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
})

// Manual sync trigger - TP-Link via Innovix (requires PHPSESSID cookie)
app.post('/api/sync/tplink', async (req, res) => {
  const { session } = req.body as { session?: string }
  if (!session || !session.trim()) {
    res.status(400).json({ success: false, error: 'session cookie (PHPSESSID) is required' })
    return
  }

  const scriptPath = path.resolve(__dirname, '../scrape-tplink.mjs')
  console.log(`[API] TP-Link sync triggered with session cookie`)

  const child = spawn('node', [scriptPath], {
    env: { ...process.env, INNOVIX_SESSION: session.trim() },
    cwd: path.resolve(__dirname, '..'),
  })

  child.stdout.on('data', (d: Buffer) => process.stdout.write('[Innovix] ' + d.toString()))
  child.stderr.on('data', (d: Buffer) => process.stderr.write('[Innovix ERR] ' + d.toString()))
  child.on('close', (code: number) => {
    console.log(`[API] TP-Link sync finished with exit code ${code}`)
  })

  res.json({ success: true, message: 'TP-Link sync started — check backend console for progress' })
})

// Login to Innovix and return PHPSESSID, then auto-trigger scrape
app.post('/api/sync/tplink/login', async (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string }
  if (!username || !password) {
    res.status(400).json({ success: false, error: 'username and password are required' })
    return
  }

  try {
    console.log(`[API] Attempting Innovix login for user: ${username}`)
    const session = await innovixLogin(username, password)
    console.log(`[API] Innovix login successful — got PHPSESSID`)

    // Auto-trigger the scrape with the captured session
    const scriptPath = path.resolve(__dirname, '../scrape-tplink.mjs')
    const child = spawn('node', [scriptPath], {
      env: { ...process.env, INNOVIX_SESSION: session },
      cwd: path.resolve(__dirname, '..'),
    })
    child.stdout.on('data', (d: Buffer) => process.stdout.write('[Innovix] ' + d.toString()))
    child.stderr.on('data', (d: Buffer) => process.stderr.write('[Innovix ERR] ' + d.toString()))
    child.on('close', (code: number) => {
      console.log(`[API] TP-Link auto-sync finished with exit code ${code}`)
    })

    res.json({ success: true, message: 'Login successful — TP-Link sync running in background' })
  } catch (error: any) {
    console.error('[API] Innovix login failed:', error.message)
    const isCaptcha = error.message.toLowerCase().includes('recaptcha')
    res.status(isCaptcha ? 422 : 401).json({
      success: false,
      captchaRequired: isCaptcha,
      error: error.message,
    })
  }
})

// Manual sync trigger - All suppliers
app.post('/api/sync', async (req, res) => {
  try {
    console.log('[API] Manual sync triggered (all suppliers)')
    
    runPAX8Sync().catch(console.error)
    runIngramSync().catch(console.error)

    res.json({ 
      success: true, 
      message: 'Sync started for all configured suppliers' 
    })
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    })
  }
})

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Server shutting down...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n🛑 Server shutting down...')
  process.exit(0)
})

startServer().catch(console.error)