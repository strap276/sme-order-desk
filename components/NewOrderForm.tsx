'use client'

import { useState } from 'react'
import { parseOrder, type CatalogProduct, type ParsedLine } from '@/lib/whatsapp/parse'
import { fcfa } from '@/lib/format'
import { createOrder } from '@/actions/orders'

type Customer = { id: string; name: string; phone: string | null }

const EMPTY_LINE: ParsedLine = { raw: '', qty: 1, query: '', name: '', product_id: null, unit_price_fcfa: 0, matched: false }

export default function NewOrderForm({ products, customers }: { products: CatalogProduct[]; customers: Customer[] }) {
  const [text, setText] = useState('')
  const [lines, setLines] = useState<ParsedLine[]>([])
  const [skipped, setSkipped] = useState<string[]>([])
  const [customerId, setCustomerId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [zone, setZone] = useState('')
  const [channel, setChannel] = useState('whatsapp')
  const [deliveryFee, setDeliveryFee] = useState(0)
  const [onCredit, setOnCredit] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const subtotal = lines.reduce((s, l) => s + Math.round(l.qty || 0) * Math.round(l.unit_price_fcfa || 0), 0)
  const total = subtotal + Math.round(deliveryFee || 0)

  function analyze() {
    const parsed = parseOrder(text, products)
    setLines(parsed.lines.length ? parsed.lines : [{ ...EMPTY_LINE }])
    setSkipped(parsed.skipped)
    setDeliveryFee(parsed.delivery_fee_fcfa)
    if (!customerId && parsed.customer_hint) setCustomerName(parsed.customer_hint)
    if (parsed.phone) setPhone(parsed.phone)
  }

  function updateLine(i: number, patch: Partial<ParsedLine>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }

  function pickProduct(i: number, productId: string) {
    const p = products.find((x) => x.id === productId)
    if (!p) {
      updateLine(i, { product_id: null })
      return
    }
    updateLine(i, { product_id: p.id, name: p.name, unit_price_fcfa: p.unit_price_fcfa, matched: true })
  }

  async function save() {
    setError(null)
    setSaving(true)
    try {
      await createOrder({
        customer_id: customerId || null,
        customer_name: customerId ? null : customerName.trim() || null,
        phone: phone.trim() || null,
        channel,
        delivery_fee_fcfa: Math.round(deliveryFee || 0),
        delivery_zone: zone.trim() || null,
        delivery_address: null,
        raw_message: text.trim() || null,
        notes: null,
        on_credit: onCredit,
        lines: lines.map((l) => ({
          name: l.name,
          qty: l.qty,
          unit_price_fcfa: l.unit_price_fcfa,
          product_id: l.product_id,
        })),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="card">
        <label htmlFor="chat">1. Collez la conversation WhatsApp (ou la commande)</label>
        <textarea
          id="chat"
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'[05/11/2024, 09:12] Clarisse Mbah: Bonjour mami, je veux 2 riz 25kg et 1 bidon huile'}
        />
        <div style={{ marginTop: 10 }}>
          <button type="button" className="btn" onClick={analyze} disabled={!text.trim()}>
            2. Analyser le message
          </button>
        </div>
        {skipped.length > 0 && (
          <p className="small muted" style={{ marginTop: 10 }}>
            Lignes ignorées (salutations/ok): {skipped.slice(0, 3).join(' | ')}
            {skipped.length > 3 ? ` +${skipped.length - 3}` : ''}
          </p>
        )}
      </div>

      {lines.length > 0 && (
        <div className="card">
          <h2>3. Vérifiez la commande</h2>
          <table>
            <thead>
              <tr>
                <th>Qté</th>
                <th>Article</th>
                <th>PU (FCFA)</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i}>
                  <td style={{ width: 64 }}>
                    <input
                      type="number"
                      min={1}
                      value={l.qty}
                      onChange={(e) => updateLine(i, { qty: parseInt(e.target.value || '1', 10) })}
                    />
                  </td>
                  <td>
                    <input value={l.name} onChange={(e) => updateLine(i, { name: e.target.value })} />
                    <select value={l.product_id ?? ''} onChange={(e) => pickProduct(i, e.target.value)} style={{ marginTop: 6 }}>
                      <option value="">— choisir dans le catalogue —</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({fcfa(p.unit_price_fcfa)})
                        </option>
                      ))}
                    </select>
                    {!l.matched && <span className="small muted">à vérifier</span>}
                  </td>
                  <td style={{ width: 110 }}>
                    <input
                      type="number"
                      min={0}
                      value={l.unit_price_fcfa}
                      onChange={(e) => updateLine(i, { unit_price_fcfa: parseInt(e.target.value || '0', 10) })}
                    />
                  </td>
                  <td style={{ width: 40 }}>
                    <button
                      type="button"
                      className="btn small secondary"
                      onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: 8 }}>
            <button type="button" className="btn small secondary" onClick={() => setLines((prev) => [...prev, { ...EMPTY_LINE }])}>
              + Ligne
            </button>
          </div>
        </div>
      )}

      {lines.length > 0 && (
        <div className="card">
          <h2>4. Client & livraison</h2>
          <label htmlFor="cust">Client existant</label>
          <select id="cust" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">— nouveau client / sans nom —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.phone ? `· ${c.phone}` : ''}
              </option>
            ))}
          </select>
          {!customerId && (
            <div className="grid2">
              <div>
                <label htmlFor="cname">Nom du client</label>
                <input id="cname" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
              <div>
                <label htmlFor="cphone">Téléphone</label>
                <input id="cphone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+237..." />
              </div>
            </div>
          )}
          <div className="grid2">
            <div>
              <label htmlFor="zone">Zone de livraison</label>
              <input id="zone" value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Mvog-Mbi, Yaoundé" />
            </div>
            <div>
              <label htmlFor="fee">Frais de livraison (FCFA)</label>
              <input id="fee" type="number" min={0} value={deliveryFee} onChange={(e) => setDeliveryFee(parseInt(e.target.value || '0', 10))} />
            </div>
          </div>
          <div className="grid2">
            <div>
              <label htmlFor="chan">Canal</label>
              <select id="chan" value={channel} onChange={(e) => setChannel(e.target.value)}>
                <option value="whatsapp">WhatsApp</option>
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="tiktok">TikTok</option>
                <option value="phone">Téléphone</option>
                <option value="in_person">En boutique</option>
                <option value="other">Autre</option>
              </select>
            </div>
            <div>
              <label htmlFor="credit">Paiement</label>
              <label htmlFor="credit" className="pill" style={{ color: 'inherit' }}>
                <input
                  id="credit"
                  type="checkbox"
                  checked={onCredit}
                  onChange={(e) => setOnCredit(e.target.checked)}
                  style={{ width: 'auto' }}
                />{' '}
                Vente à crédit (dette client)
              </label>
            </div>
          </div>

          <div className="row" style={{ marginTop: 10 }}>
            <span className="muted">Sous-total {fcfa(subtotal)} · Livraison {fcfa(deliveryFee)}</span>
            <strong>{fcfa(total)}</strong>
          </div>

          {error && <p className="badge pay-unpaid">{error}</p>}

          <div style={{ marginTop: 12 }}>
            <button type="button" className="btn" onClick={save} disabled={saving}>
              {saving ? 'Enregistrement…' : '5. Enregistrer la commande'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
