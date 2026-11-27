import { createClient } from '@/lib/supabase/server'
import ReconcileForm from '@/components/ReconcileForm'
import type { OrderListRow } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function ReconcilePage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('orders')
    .select('id, order_code, total_fcfa, balance_fcfa, payment_status, created_at, customers(name)')
    .neq('payment_status', 'paid')
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })
    .limit(50)
    .overrideTypes<OrderListRow[], { merge: false }>()

  return (
    <>
      <h1>Paiements MoMo à rapprocher</h1>
      <ReconcileForm orders={data ?? []} />
    </>
  )
}
