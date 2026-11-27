'use client'

import { useState } from 'react'
import { parseMomoSms, type ParsedMomoSms } from '@/lib/whatsapp/parse'
import { fcfa, PROVIDER_LABELS } from '@/lib/format'
import { reconcilePayment } from '@/actions/payments'

type UnpaidOrder = {
  id: string
  order_code: string
  total_fcfa: number
  balance_fcfa: number
  payment_status: string
  created_at: string
  customers?: { name: string } | null
}

export default function ReconcileForm({ orders }: { orders: UnpaidOrder[] }) {
  const [sms, setSms] = useState('')
  const [parsed, setParsed] = useState<ParsedMomoSms | null>(null)
  const [orderId, setOrderId] = useState('')

  function analyze() {
    const p = parseMomoSms(sms)
    setParsed(p)
    const match = p.amount_fcfa ? orders.find((o) => o.balance_fcfa === p.amount_fcfa) : undefined
    setOrderId(match ? match.id : '')
  }

  const selected = orders.find((o) => o.id === orderId) ?? null

  return (
    <div>
      <div className="card">
        <label htmlFor="sms">Collez le SMS MoMo reçu (MTN ou Orange)</label>
        <textarea
          id="sms"
          rows={4}
          value={sms}
          onChange={(e) => setSms(e.target.value)}
          placeholder={'Vous avez recu 23 500 FCFA de Tonton Pascal. Ref MP241102.0002.'}
        />
        <div style={{ marginTop: 10 }}>
          <button type="button" className="btn" onClick={analyze} disabled={!sms.trim()}>
            Analyser le SMS
          </button>
        </div>
        {parsed && (
          <p className="small muted" style={{ marginTop: 10 }}>
            Détecté : {parsed.amount_fcfa ? fcfa(parsed.amount_fcfa) : 'montant inconnu'} ·{' '}
            {PROVIDER_LABELS[parsed.provider] ?? parsed.provider}
            {parsed.reference ? ` · Réf ${parsed.reference}` : ''}
            {parsed.phone ? ` · ${parsed.phone}` : ''}
          </p>
        )}
      </div>

      {parsed && (
        <form className="card" action={reconcilePayment}>
          <h2>Associer à une commande non soldée</h2>
          <input type="hidden" name="raw_sms" value={sms} />
          <input type="hidden" name="amount_fcfa" value={parsed.amount_fcfa ?? 0} />
          <input type="hidden" name="provider" value={parsed.provider} />
          <input type="hidden" name="momo_reference" value={parsed.reference ?? ''} />
          <input type="hidden" name="momo_number" value={parsed.phone ?? ''} />
          <label htmlFor="order">Commande</label>
          <select id="order" name="order_id" value={orderId} onChange={(e) => setOrderId(e.target.value)}>
            <option value="">— choisir —</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.order_code} · {o.customers?.name ?? 'Sans client'} · reste {fcfa(o.balance_fcfa)}
              </option>
            ))}
          </select>
          <div style={{ marginTop: 10 }}>
            <button type="submit" className="btn" disabled={!orderId || !parsed.amount_fcfa}>
              Confirmer le paiement
            </button>
          </div>
          {selected && parsed.amount_fcfa ? (
            <p className="small muted" style={{ marginTop: 8 }}>
              Enregistrer {fcfa(parsed.amount_fcfa)} sur {selected.order_code} → nouveau solde{' '}
              {fcfa(Math.max(0, selected.balance_fcfa - parsed.amount_fcfa))}.
            </p>
          ) : null}
        </form>
      )}

      <div className="card">
        <h2>Commandes non soldées ({orders.length})</h2>
        {orders.length === 0 && <p className="empty">Tout est encaissé. 🎉</p>}
        {orders.map((o) => (
          <div className="row" key={o.id}>
            <span>
              <strong>{o.order_code}</strong> <span className="muted small">{o.customers?.name ?? 'Sans client'}</span>
            </span>
            <span>{fcfa(o.balance_fcfa)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
