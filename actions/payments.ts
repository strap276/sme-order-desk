'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

function parseAmount(value: FormDataEntryValue | null): number {
  return parseInt(String(value ?? '0').replace(/[^\d]/g, ''), 10) || 0
}

/** Adds a payment to an order (default: confirmed, so it counts toward the balance). */
export async function addPayment(formData: FormData) {
  const supabase = await createClient()
  const orderId = String(formData.get('order_id') ?? '')
  const amount = parseAmount(formData.get('amount_fcfa'))
  const provider = String(formData.get('provider') ?? 'mtn_momo')
  const status = String(formData.get('status') ?? 'confirmed')
  const momo_reference = String(formData.get('momo_reference') ?? '').trim() || null
  const momo_number = String(formData.get('momo_number') ?? '').trim() || null
  if (!orderId || amount <= 0) return

  const { data: order } = await supabase.from('orders').select('customer_id').eq('id', orderId).maybeSingle()

  await supabase.from('payments').insert({
    order_id: orderId,
    customer_id: order?.customer_id ?? null,
    amount_fcfa: amount,
    provider,
    status,
    momo_reference,
    momo_number,
  })

  revalidatePath('/orders/' + orderId)
  revalidatePath('/orders')
  revalidatePath('/')
}

/** Confirms / fails / reverses a payment. Confirmed payments drive the order balance (via trigger). */
export async function setPaymentStatus(formData: FormData) {
  const supabase = await createClient()
  const paymentId = String(formData.get('payment_id') ?? '')
  const status = String(formData.get('status') ?? 'confirmed')
  const orderId = String(formData.get('order_id') ?? '')
  if (!paymentId) return
  await supabase.from('payments').update({ status }).eq('id', paymentId)
  if (orderId) revalidatePath('/orders/' + orderId)
  revalidatePath('/orders')
  revalidatePath('/reconcile')
  revalidatePath('/')
}

/** Pasted-MoMo-SMS reconciliation: creates a confirmed payment against the chosen order. */
export async function reconcilePayment(formData: FormData) {
  const supabase = await createClient()
  const orderId = String(formData.get('order_id') ?? '')
  const amount = parseAmount(formData.get('amount_fcfa'))
  const provider = String(formData.get('provider') ?? 'mtn_momo')
  const momo_reference = String(formData.get('momo_reference') ?? '').trim() || null
  const momo_number = String(formData.get('momo_number') ?? '').trim() || null
  const raw_sms = String(formData.get('raw_sms') ?? '').trim() || null
  if (!orderId || amount <= 0) return

  const { data: order } = await supabase.from('orders').select('customer_id').eq('id', orderId).maybeSingle()

  await supabase.from('payments').insert({
    order_id: orderId,
    customer_id: order?.customer_id ?? null,
    amount_fcfa: amount,
    provider,
    status: 'confirmed',
    momo_reference,
    momo_number,
    raw_sms,
  })

  revalidatePath('/orders/' + orderId)
  revalidatePath('/orders')
  revalidatePath('/reconcile')
  revalidatePath('/')
}
