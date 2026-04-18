'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editStatus, setEditStatus] = useState('')

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
      setOrders(data || [])
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (order: any) => {
    setEditingId(order.id)
    setEditStatus(order.status)
  }

  const handleSave = async (id: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: editStatus })
        .eq('id', id)

      if (error) throw error

      setOrders(orders.map(o =>
        o.id === id ? { ...o, status: editStatus } : o
      ))
      setEditingId(null)
    } catch (error) {
      console.error('Error updating order:', error)
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditStatus('')
  }

  if (loading) return <div>Loading orders...</div>

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Orders ({orders.length})</h1>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="text-left py-3 px-6">Order #</th>
              <th className="text-left py-3 px-6">Date</th>
              <th className="text-right py-3 px-6">Amount (SGD)</th>
              <th className="text-left py-3 px-6">Status</th>
              <th className="text-center py-3 px-6">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-600">
                  No orders yet
                </td>
              </tr>
            ) : (
              orders.map(order => (
                <tr key={order.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-6 font-mono text-sm">{order.order_number}</td>
                  <td className="py-3 px-6">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-6 text-right font-bold">
                    ${order.total_sgd.toFixed(2)}
                  </td>
                  <td className="py-3 px-6">
                    {editingId === order.id ? (
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        className="border rounded px-2 py-1"
                      >
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    ) : (
                      <span className={`px-3 py-1 rounded text-sm font-medium ${
                        order.status === 'confirmed'
                          ? 'bg-green-100 text-green-800'
                          : order.status === 'shipped'
                          ? 'bg-blue-100 text-blue-800'
                          : order.status === 'delivered'
                          ? 'bg-green-100 text-green-800'
                          : order.status === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.status}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-6 text-center">
                    {editingId === order.id ? (
                      <>
                        <button
                          onClick={() => handleSave(order.id)}
                          className="text-green-600 hover:text-green-800 mr-3"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancel}
                          className="text-red-600 hover:text-red-800"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleEdit(order)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}