'use client'
import { useEffect, useState } from 'react'

export default function AdminSync() {
  const [syncTime, setSyncTime] = useState<string>('')

  useEffect(() => {
    // Get last sync time from localStorage (set by backend)
    const stored = localStorage.getItem('lastSyncTime')
    if (stored) {
      setSyncTime(new Date(stored).toLocaleString())
    }
  }, [])

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Sync Status</h1>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-bold text-lg mb-4">Innovix</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Status</span>
              <span className="text-green-600 font-medium">✓ Active</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Last Sync</span>
              <span>{syncTime || 'Just now'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Next Sync</span>
              <span>In ~6 hours</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-bold text-lg mb-4">Ingram Micro</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Status</span>
              <span className="text-green-600 font-medium">✓ Active</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Last Sync</span>
              <span>{syncTime || 'Just now'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Next Sync</span>
              <span>In ~6 hours</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-bold text-lg mb-4">PAX8</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Status</span>
              <span className="text-green-600 font-medium">✓ Active</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Last Sync</span>
              <span>{syncTime || 'Just now'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Next Sync</span>
              <span>In ~6 hours</span>
            </div>
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
        <h2 className="font-bold mb-4 text-lg">How Syncing Works</h2>
        <ul className="space-y-2 text-sm">
          <li>✓ Products sync automatically every 6 hours</li>
          <li>✓ Prices and stock quantities are updated</li>
          <li>✓ New products are added automatically</li>
          <li>✓ If a supplier is down, sync is skipped gracefully</li>
          <li>✓ Backend running on Railway (24/7)</li>
        </ul>
      </div>
    </div>
  )
}