'use client'
import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

type SyncState = 'idle' | 'loading' | 'success' | 'error'

export default function AdminSync() {
  return (
    <Suspense>
      <AdminSyncInner />
    </Suspense>
  )
}

function AdminSyncInner() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [syncTime, setSyncTime] = useState('')

  // Cookie sync state
  const [session, setSession] = useState('')
  const [cookieState, setCookieState] = useState<SyncState>('idle')
  const [cookieMessage, setCookieMessage] = useState('')
  const autoTriggered = useRef(false)

  // Build bookmarklet and check for ?session= on mount
  useEffect(() => {
    const stored = localStorage.getItem('lastSyncTime')
    if (stored) setSyncTime(new Date(stored).toLocaleString())

    // Auto-trigger if redirected back with ?session= in URL
    const sess = searchParams.get('session')
    if (sess && !autoTriggered.current) {
      autoTriggered.current = true
      setSession(sess)
      // Clear the query param from the URL immediately
      router.replace('/admin/sync', { scroll: false })
      // Trigger sync after a tick so state is set
      setTimeout(() => triggerSync(sess), 100)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function triggerSync(sess: string) {
    setCookieState('loading')
    setCookieMessage('')
    try {
      const res = await fetch('/api/admin/sync/tplink', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session: sess }),
      })
      const data = await res.json()
      if (data.success) {
        setCookieState('success')
        setCookieMessage(data.message)
        setSession('')
        localStorage.setItem('lastSyncTime', new Date().toISOString())
      } else {
        setCookieState('error')
        setCookieMessage(data.error || 'Sync failed')
      }
    } catch (err: any) {
      setCookieState('error')
      setCookieMessage(err.message)
    }
  }

  async function handleCookieSync() {
    if (!session.trim()) {
      setCookieState('error')
      setCookieMessage('Please paste your PHPSESSID cookie value first.')
      return
    }
    await triggerSync(session.trim())
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Sync Status</h1>

      {/* Supplier status cards */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {[
          { name: 'Innovix', time: syncTime },
          { name: 'Ingram Micro', time: syncTime },
          { name: 'PAX8', time: syncTime },
        ].map(s => (
          <div key={s.name} className="bg-white p-6 rounded-lg shadow">
            <h3 className="font-bold text-lg mb-4">{s.name}</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Status</span>
                <span className="text-green-600 font-medium">✓ Active</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Last Sync</span>
                <span>{s.time || 'Just now'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Next Sync</span>
                <span>In ~6 hours</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* TP-Link sync panel */}
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="font-bold text-lg mb-4">TP-Link Pricing Sync (Innovix)</h2>

        <ol className="text-sm text-gray-600 space-y-4 mb-5">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center font-bold">1</span>
            <span>
              Log in at{' '}
              <a href="https://www.innovixmarketplace.com/login" target="_blank" rel="noreferrer" className="text-blue-600 underline">
                innovixmarketplace.com/login
              </a>{' '}
              with your reseller account.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center font-bold">2</span>
            <span>
              Press <kbd className="bg-gray-100 border border-gray-300 rounded px-1.5 py-0.5 text-xs font-mono">F12</kbd> to open DevTools →{' '}
              <strong>Application</strong> tab → <strong>Cookies</strong> (left sidebar) →{' '}
              <code className="bg-gray-100 px-1 rounded text-xs">www.innovixmarketplace.com</code>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center font-bold">3</span>
            <span>
              Find the <code className="bg-gray-100 px-1 rounded text-xs">PHPSESSID</code> row → click the Value cell → <kbd className="bg-gray-100 border border-gray-300 rounded px-1.5 py-0.5 text-xs font-mono">Ctrl+A</kbd> then <kbd className="bg-gray-100 border border-gray-300 rounded px-1.5 py-0.5 text-xs font-mono">Ctrl+C</kbd>
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center font-bold">4</span>
            <span>Paste below and click <strong>Sync TP-Link</strong>.</span>
          </li>
        </ol>

        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">PHPSESSID value</label>
            <input
              type="text"
              value={session}
              onChange={e => { setSession(e.target.value); setCookieState('idle'); setCookieMessage('') }}
              placeholder="Paste cookie value here…"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleCookieSync}
            disabled={cookieState === 'loading'}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-5 py-2 rounded text-sm font-medium transition-colors"
          >
            {cookieState === 'loading' ? 'Syncing…' : 'Sync TP-Link'}
          </button>
        </div>

        {cookieMessage && (
          <div className={`mt-4 text-sm px-3 py-2 rounded ${
            cookieState === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {cookieState === 'success' ? '✓ ' : '✗ '}{cookieMessage}
            {cookieState === 'success' && (
              <span className="block text-xs mt-1 text-green-600">
                Scraping in background — check backend console for progress (~30–60 s).
              </span>
            )}
          </div>
        )}

        {cookieState === 'loading' && (
          <div className="mt-4 text-sm text-blue-600 animate-pulse">
            Connecting to Innovix and scraping TP-Link prices…
          </div>
        )}
      </div>

      {/* Info section */}
      <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
        <h2 className="font-bold mb-4 text-lg">How Syncing Works</h2>
        <ul className="space-y-2 text-sm">
          <li>✓ PAX8 products sync automatically every 6 hours</li>
          <li>✓ Prices and stock quantities are updated</li>
          <li>✓ New products are added automatically</li>
          <li>✓ If a supplier is down, sync is skipped gracefully</li>
          <li>✓ TP-Link (Innovix) — use the bookmarklet after logging in to sync on demand</li>
        </ul>
      </div>
    </div>
  )
}
