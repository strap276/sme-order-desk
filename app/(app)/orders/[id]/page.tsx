import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ensureBusiness } from '@/lib/business'
import { fcfa, shortDate, ORDER_STATUSES, ORDER_STATUS_LABELS, PROVIDER_LABELS } from '@/lib/format'
import { StatusBadge, PayBadge, TxBadge } from '@/components/StatusBadge'
import { CopyButton } from '@/components/CopyButton'
import { updateOrderStatus } from '@/actions/orders'
import { addPayment, setPaymentStatus } from '@/actions/payments'
import { buildConfirmationMessage } from '@/lib/messages'
import type { OrderDetail, OrderItem, Payment } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: orderRow } = await supabase
    .from('orders')
    .select(
      'id, owner_id, order_code, customer_id, channel, status, payment_status, subtotal_fcfa, delivery_fee_fcfa, discount_fcfa, total_fcfa, amount_paid_fcfa, balance_fcfa, delivery_zone, delivery_address, rider_name, raw_message, notes, created_at, customers(name, phone, momo_provider, momo_number, zone)'
    )
    .eq('id', params.id)
    .maybeSingle()

  if (!orderRow) notFound()
  const order = orderRow as unknown as OrderDetail

  const { data: itemsData } = await supabase
    .from('order_items')
    .select('id, order_id, product_id, name_snapshot, qty, unit_price_fcfa, line_total_fcfa')
    .eq('order_id', order.id)
    .order('name_snapshot')
  const items = (itemsData ?? []) as unknown as OrderItem[]

  const { data: paymentsData } = await supabase
    .from('payments')
    .select('id, order_id, customer_id, amount_fcfa, provider, momo_reference, momo_number, status, raw_sms, paid_at')
    .eq('order_id', order.id)
    .order('paid_at', { ascending: false })
  const payments = (paymentsData ?? []) as unknown as Payment[]

  const { business } = await ensureBusiness()

  const confirmation = buildConfirmationMessage(
    {
      order_code: order.order_code,
      status: order.status,
      payment_status: order.payment_status,
      subtotal_fcfa: order.subtotal_fcfa,
      delivery_fee_fcfa: order.delivery_fee_fcfa,
      total_fcfa: order.total_fcfa,
      balance_fcfa: order.balance_fcfa,
      delivery_zone: order.delivery_zone,
    },
    items.map((i) => ({
      name_snapshot: i.name_snapshot,
      qty: i.qty,
      unit_price_fcfa: i.unit_price_fcfa,
      line_total_fcfa: i.line_total_fcfa,
    })),
    {
      name: business?.name ?? 'Ma Boutique',
      momo_mtn_number: business?.momo_mtn_number ?? null,
      momo_orange_number: business?.momo_orange_number ?? null,
      whatsapp_number: business?.whatsapp_number ?? null,
    },
    order.customers?.name ?? null
  )

  return (
    <>
      <p className="small muted">
        <Link href="/orders">← Retour aux commandes</Link>
      </p>

      <div className="card">
        <div className="row">
          <span>
            <h1 style={{ margin: 0 }}>{order.order_code}</h1>
            <span className="muted small">
              {order.customers?.name ?? 'Sans client'} · {order.channel} · {shortDate(order.created_at)}
            </span>
            <br />
            <StatusBadge status={order.status} /> <PayBadge status={order.payment_status} />
          </span>
          <span style={{ textAlign: 'right' }}>
            <strong>{fcfa(order.total_fcfa)}</strong>
            <div className="small muted">
              {order.balance_fcfa > 0 ? `Reste ${fcfa(order.balance_fcfa)}` : 'Soldée'}
            </div>
          </span>
        </div>
        {order.delivery_zone || order.delivery_address || order.rider_name ? (
          <p className="small muted" style={{ marginBottom: 0 }}>
            Livraison : {order.delivery_zone ?? '—'}
            {order.delivery_address ? ` · ${order.delivery_address}` : ''}
            {order.rider_name ? ` · Coursier : ${order.rider_name}` : ''}
          </p>
        ) : null}
      </div>

      <div className="card">
        <h2>Articles</h2>
        <table>
          <thead>
            <tr>
              <th>Qté</th>
              <th>Article</th>
              <th>PU</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td>{i.qty}</td>
                <td>{i.name_snapshot}</td>
                <td>{fcfa(i.unit_price_fcfa)}</td>
                <td>{fcfa(i.line_total_fcfa)}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="empty">
                  Aucun article.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="row">
          <span className="muted">Sous-total</span>
          <span>{fcfa(order.subtotal_fcfa)}</span>
        </div>
        <div className="row">
          <span className="muted">Frais de livraison</span>
          <span>{fcfa(order.delivery_fee_fcfa)}</span>
        </div>
        <div className="row">
          <strong>Total</strong>
          <strong>{fcfa(order.total_fcfa)}</strong>
        </div>
        <div className="row">
          <span className="muted">Déjà payé</span>
          <span>{fcfa(order.amount_paid_fcfa)}</span>
        </div>
        <div className="row">
          <span className="muted">Reste à payer</span>
          <span>{fcfa(order.balance_fcfa)}</span>
        </div>
      </div>

      <div className="card">
        <h2>Statut de la commande</h2>
        <form action={updateOrderStatus}>
          <input type="hidden" name="order_id" value={order.id} />
          <label htmlFor="status">Nouveau statut</label>
          <select id="status" name="status" defaultValue={order.status}>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ORDER_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <div style={{ marginTop: 10 }}>
            <button className="btn" type="submit">
              Mettre à jour le statut
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2>Paiements Mobile Money ({payments.length})</h2>
        {payments.length === 0 && <p className="empty">Aucun paiement enregistré.</p>}
        {payments.map((p) => (
          <div className="row" key={p.id}>
            <span>
              <strong>{fcfa(p.amount_fcfa)}</strong> <TxBadge status={p.status} />
              <br />
              <span className="muted small">
                {PROVIDER_LABELS[p.provider] ?? p.provider}
                {p.momo_reference ? ` · Réf ${p.momo_reference}` : ''}
                {p.momo_number ? ` · ${p.momo_number}` : ''} · {shortDate(p.paid_at)}
              </span>
            </span>
            <span style={{ display: 'flex', gap: 6 }}>
              {p.status !== 'confirmed' && (
                <form action={setPaymentStatus}>
                  <input type="hidden" name="payment_id" value={p.id} />
                  <input type="hidden" name="order_id" value={order.id} />
                  <input type="hidden" name="status" value="confirmed" />
                  <button className="btn small" type="submit">
                    Confirmer
                  </button>
                </form>
              )}
              {p.status !== 'failed' && (
                <form action={setPaymentStatus}>
                  <input type="hidden" name="payment_id" value={p.id} />
                  <input type="hidden" name="order_id" value={order.id} />
                  <input type="hidden" name="status" value="failed" />
                  <button className="btn small secondary" type="submit">
                    Échoué
                  </button>
                </form>
              )}
            </span>
          </div>
        ))}

        <h2 style={{ marginTop: 16 }}>Ajouter un paiement</h2>
        <form action={addPayment}>
          <input type="hidden" name="order_id" value={order.id} />
          <input type="hidden" name="status" value="confirmed" />
          <div className="grid2">
            <div>
              <label htmlFor="amount">Montant (FCFA)</label>
              <input
                id="amount"
                name="amount_fcfa"
                type="number"
                min={1}
                defaultValue={order.balance_fcfa > 0 ? order.balance_fcfa : undefined}
              />
            </div>
            <div>
              <label htmlFor="provider">Fournisseur</label>
              <select id="provider" name="provider" defaultValue="mtn_momo">
                <option value="mtn_momo">MTN MoMo</option>
                <option value="orange_money">Orange Money</option>
                <option value="cash">Espèces</option>
                <option value="bank_transfer">Virement</option>
                <option value="other">Autre</option>
              </select>
            </div>
          </div>
          <div className="grid2">
            <div>
              <label htmlFor="ref">Référence MoMo</label>
              <input id="ref" name="momo_reference" placeholder="MP241102.0002" />
            </div>
            <div>
              <label htmlFor="pnum">Numéro MoMo</label>
              <input id="pnum" name="momo_number" placeholder="+237..." />
            </div>
          </div>
          <div style={{ marginTop: 10 }}>
            <button className="btn" type="submit">
              Enregistrer le paiement
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2>Message de confirmation WhatsApp</h2>
        <pre className="msg">{confirmation}</pre>
        <CopyButton text={confirmation} />
      </div>

      {order.raw_message ? (
        <div className="card">
          <h2>Message WhatsApp d&apos;origine</h2>
          <pre className="msg">{order.raw_message}</pre>
        </div>
      ) : null}
    </>
  )
}
