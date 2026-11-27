import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { fcfa, shortDate, ORDER_STATUSES, ORDER_STATUS_LABELS } from '@/lib/format'
import { StatusBadge, PayBadge } from '@/components/StatusBadge'

export const dynamic = 'force-dynamic'

export default async function OrdersPage({ searchParams }: { searchParams: { status?: string } }) {
  const supabase = await createClient()
  const requested = searchParams?.status
  const status = requested && (ORDER_STATUSES as readonly string[]).includes(requested) ? requested : undefined

  let query = supabase
    .from('orders')
    .select('id, order_code, status, payment_status, total_fcfa, balance_fcfa, channel, created_at, customers(name)')
    .order('created_at', { ascending: false })
    .limit(100)
  if (status) query = query.eq('status', status)

  const { data } = await query
  const orders = data ?? []

  return (
    <>
      <h1>Commandes</h1>

      <div className="card">
        <Link href="/orders/new" className="btn">
          + Nouvelle commande (WhatsApp)
        </Link>
      </div>

      <div className="card" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Link href="/orders" className="badge">
          Toutes
        </Link>
        {ORDER_STATUSES.map((s) => (
          <Link key={s} href={`/orders?status=${s}`} className="badge">
            {ORDER_STATUS_LABELS[s]}
          </Link>
        ))}
      </div>

      <div className="card">
        {orders.length === 0 && <p className="empty">Aucune commande.</p>}
        {orders.map((o) => (
          <Link key={o.id} href={`/orders/${o.id}`} className="row">
            <span>
              <strong>{o.order_code}</strong>{' '}
              <span className="muted small">
                {o.customers?.name ?? 'Sans client'} · {o.channel} · {shortDate(o.created_at)}
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
    </>
  )
}
