import { createClient } from '@/lib/supabase/server'
import { fcfa } from '@/lib/format'
import { recordRepayment } from '@/actions/orders'

export const dynamic = 'force-dynamic'

export default async function CustomersPage() {
  const supabase = await createClient()
  const { data: customersData } = await supabase.from('customers').select('*').order('name')
  const { data: ledger } = await supabase
    .from('credit_ledger')
    .select('customer_id, balance_after_fcfa, created_at')
    .order('created_at', { ascending: true })

  const balances = new Map<string, number>()
  for (const e of ledger ?? []) {
    if (e.balance_after_fcfa !== null && e.balance_after_fcfa !== undefined) {
      balances.set(e.customer_id, e.balance_after_fcfa)
    }
  }

  const customers = customersData ?? []

  return (
    <>
      <h1>Clients & crédit</h1>
      <div className="card">
        <p className="muted small">
          Le solde affiché est la dette du client : ventes à crédit moins remboursements (registre de crédit).
        </p>
      </div>

      {customers.length === 0 && (
        <div className="card">
          <p className="empty">Aucun client.</p>
        </div>
      )}

      {customers.map((c) => {
        const balance = balances.get(c.id) ?? 0
        return (
          <div className="card" key={c.id}>
            <div className="row">
              <span>
                <strong>{c.name}</strong>
                <br />
                <span className="muted small">
                  {c.phone ?? '—'} · {c.zone ?? 'zone inconnue'} · {c.momo_provider ?? 'MoMo ?'}
                </span>
              </span>
              <span className={balance > 0 ? 'badge pay-unpaid' : 'badge pay-paid'}>
                {balance > 0 ? `Doit ${fcfa(balance)}` : 'À jour'}
              </span>
            </div>
            {balance > 0 && (
              <form action={recordRepayment} style={{ marginTop: 8 }}>
                <input type="hidden" name="customer_id" value={c.id} />
                <div className="grid2">
                  <div>
                    <label htmlFor={`amt-${c.id}`}>Remboursement (FCFA)</label>
                    <input id={`amt-${c.id}`} name="amount_fcfa" type="number" min={1} placeholder={String(balance)} />
                  </div>
                  <div>
                    <label htmlFor={`note-${c.id}`}>Note</label>
                    <input id={`note-${c.id}`} name="note" placeholder="Espèces / MoMo" />
                  </div>
                </div>
                <div style={{ marginTop: 8 }}>
                  <button className="btn small" type="submit">
                    Enregistrer
                  </button>
                </div>
              </form>
            )}
          </div>
        )
      })}
    </>
  )
}
