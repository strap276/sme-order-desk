import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { fcfa, shortDate } from '@/lib/format'
import { StatusBadge, PayBadge } from '@/components/StatusBadge'
import { importDemoData } from '@/actions/orders'
import type { OrderListRow } from '@/lib/types'

export const dynamic = 'force-dynamic'

function startOfToday(): number {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: ordersData } = await supabase
    .from('orders')
    .select('id, order_code, status, payment_status, total_fcfa, balance_fcfa, created_at, customers(name)')
    .order('created_at', { ascending: false })
    .limit(100)
    .overrideTypes<OrderListRow[], { merge: false }>()
  const orders: OrderListRow[] = ordersData ?? []

  const active = orders.filter((o) => !['delivered', 'cancelled', 'returned'].includes(o.status))
  const unpaid = orders.filter((o) => o.payment_status !== 'paid' && o.status !== 'cancelled')
  const receivables = unpaid.reduce((s, o) => s + (o.balance_fcfa ?? 0), 0)
  const todayStart = startOfToday()
  const salesToday = orders
    .filter((o) => new Date(o.created_at).getTime() >= todayStart && o.status !== 'cancelled')
    .reduce((s, o) => s + (o.total_fcfa ?? 0), 0)

  const { data: productsData } = await supabase
    .from('products')
    .select('id, name, stock_qty, low_stock_threshold')
    .order('stock_qty', { ascending: true })
    .limit(50)
  const lowStock = (productsData ?? []).filter((p) => p.stock_qty <= p.low_stock_threshold)

  return (
    <>
      <h1>Tableau de bord</h1>

      <div className="kpis">
        <div className="kpi">
          <div className="label">Ventes du jour</div>
          <div className="value">{fcfa(salesToday)}</div>
        </div>
        <div className="kpi">
          <div className="label">À encaisser</div>
          <div className="value">{fcfa(receivables)}</div>
        </div>
        <div className="kpi">
          <div className="label">Commandes en cours</div>
          <div className="value">{active.length}</div>
        </div>
        <div className="kpi">
          <div className="label">Stock bas</div>
          <div className="value">{lowStock.length}</div>
        </div>
      </div>

      {orders.length === 0 && (
        <div className="card" style={{ marginTop: 14 }}>
          <h2>Aucune commande pour l'instant</h2>
          <p className="muted small">
            Chargez un catalogue de démonstration pour tester, ou créez votre première commande depuis WhatsApp.
          </p>
          <form action={importDemoData}>
            <button className="btn" type="submit">
              Importer des données de démonstration
            </button>
          </form>
        </div>
      )}

      <div className="card" style={{ marginTop: 14 }}>
        <h2>Dernières commandes</h2>
        {orders.length === 0 && <p className="empty">—</p>}
        {orders.slice(0, 8).map((o) => (
          <Link key={o.id} href={`/orders/${o.id}`} className="row">
            <span>
              <strong>{o.order_code}</strong>{' '}
              <span className="muted small">
                {o.customers?.name ?? 'Sans client'} · {shortDate(o.created_at)}
              </span>
              <br />
              <StatusBadge status={o.status} /> <PayBadge status={o.payment_status} />
            </span>
            <span>
              <strong>{fcfa(o.total_fcfa)}</strong>
              {o.balance_fcfa > 0 && <span className="muted small"> — reste {fcfa(o.balance_fcfa)}</span>}
            </span>
          </Link>
        ))}
      </div>

      <div className="card">
        <h2>Stock bas</h2>
        {lowStock.length === 0 && <p className="empty">Aucun produit en stock bas.</p>}
        {lowStock.slice(0, 8).map((p) => (
          <div className="row" key={p.id}>
            <span>{p.name}</span>
            <span className="muted small">{p.stock_qty} restant(s)</span>
          </div>
        ))}
      </div>
    </>
  )
}
