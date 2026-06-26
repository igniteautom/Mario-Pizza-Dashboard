'use client'
export const dynamic = 'force-dynamic'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'

const API = process.env.NEXT_PUBLIC_API_URL!
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID!

interface Order {
  id: string
  channel: string
  customer_name: string
  customer_phone: string
  items_description: string
  total: number
  status: string
  created_at: string
}

interface Stats {
  orders_30d: number
  revenue_30d: number
  by_channel: Record<string, number>
}

const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready: 'Listo',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-blue-500/20 text-blue-400',
  preparing: 'bg-yellow-500/20 text-yellow-400',
  ready: 'bg-green-500/20 text-green-400',
  delivered: 'bg-gray-500/20 text-gray-400',
  cancelled: 'bg-red-500/20 text-red-400',
}

const CHANNEL_ICONS: Record<string, string> = {
  sms: '💬', voice: '📞', telegram: '✈️', whatsapp: '📱', web: '🌐',
}

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      setToken(session.access_token)
    })
  }, [])

  const fetchData = useCallback(async () => {
    if (!token) return
    const headers = { Authorization: `Bearer ${token}` }
    const [ordersRes, statsRes] = await Promise.all([
      fetch(`${API}/api/orders?limit=50`, { headers }),
      fetch(`${API}/api/tenants/me/stats`, { headers }),
    ])
    if (ordersRes.ok) setOrders((await ordersRes.json()).orders ?? [])
    if (statsRes.ok) setStats(await statsRes.json())
    setLoading(false)
  }, [token])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  async function updateStatus(orderId: string, status: string) {
    if (!token) return
    await fetch(`${API}/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    fetchData()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-400">Cargando...</div>
    </div>
  )

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white"/>
            </svg>
          </div>
          <span className="font-semibold text-white">Ignite Automations</span>
        </div>
        <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white transition">
          Salir
        </button>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-gray-400 text-xs mb-1">Pedidos (30 días)</p>
              <p className="text-2xl font-semibold text-white">{stats.orders_30d}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-gray-400 text-xs mb-1">Ingresos (30 días)</p>
              <p className="text-2xl font-semibold text-green-400">${stats.revenue_30d.toFixed(2)}</p>
            </div>
            {Object.entries(stats.by_channel).map(([ch, count]) => (
              <div key={ch} className="bg-white/5 rounded-xl p-4">
                <p className="text-gray-400 text-xs mb-1">{CHANNEL_ICONS[ch]} {ch}</p>
                <p className="text-2xl font-semibold text-white">{count}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-white">Pedidos</h2>
          <div className="flex gap-2">
            {['all', 'confirmed', 'preparing', 'ready'].map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-3 py-1 rounded-lg text-xs transition ${filter === s ? 'bg-brand text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
              >
                {s === 'all' ? 'Todos' : STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-600">No hay pedidos</div>
          )}
          {filtered.map(order => (
            <div key={order.id} className="bg-white/5 rounded-xl p-4 flex items-start gap-4">
              <div className="text-2xl">{CHANNEL_ICONS[order.channel] ?? '📋'}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-white text-sm">{order.customer_name || 'Cliente'}</span>
                  <span className="text-gray-600 text-xs">{order.customer_phone}</span>
                  <span className={`px-2 py-0.5 rounded-md text-xs ${STATUS_COLORS[order.status]}`}>
                    {STATUS_LABELS[order.status]}
                  </span>
                </div>
                <p className="text-gray-400 text-sm truncate">{order.items_description}</p>
                <p className="text-xs text-gray-600 mt-1">
                  {new Date(order.created_at).toLocaleString('es-MX')}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-green-400 font-semibold text-sm mb-2">${order.total?.toFixed(2)}</p>
                <select
                  value={order.status}
                  onChange={e => updateStatus(order.id, e.target.value)}
                  className="text-xs bg-white/5 border border-white/10 text-gray-300 rounded-lg px-2 py-1 focus:outline-none"
                >
                  {Object.entries(STATUS_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
