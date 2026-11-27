'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type DraftLine = {
  name: string
  qty: number
  unit_price_fcfa: number
  product_id: string | null
}

export type CreateOrderInput = {
  customer_id: string | null
  customer_name: string | null
  phone: string | null
  channel: string
  delivery_fee_fcfa: number
  delivery_zone: string | null
  delivery_address: string | null
  raw_message: string | null
  notes: string | null
  on_credit: boolean
  lines: DraftLine[]
}

/** Creates an order (+ items) from a reviewed WhatsApp draft, then opens its detail page. */
export async function createOrder(input: CreateOrderInput) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) redirect('/login')

  let customerId: string | null = input.customer_id
  if (!customerId && input.customer_name) {
    const { data: cust } = await supabase
      .from('customers')
      .insert({ name: input.customer_name, phone: input.phone })
      .select('id')
      .single()
    customerId = cust?.id ?? null
  }

  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      customer_id: customerId,
      channel: input.channel,
      status: 'new',
      delivery_fee_fcfa: Math.max(0, Math.round(input.delivery_fee_fcfa || 0)),
      delivery_zone: input.delivery_zone,
      delivery_address: input.delivery_address,
      raw_message: input.raw_message,
      notes: input.notes,
    })
    .select('id')
    .single()

  if (error || !order) throw new Error(error?.message ?? "Impossible de créer la commande")

  const items = (input.lines || [])
    .filter((l) => l.qty > 0 && l.name.trim().length > 0)
    .map((l) => ({
      order_id: order.id,
      product_id: l.product_id,
      name_snapshot: l.name.trim(),
      qty: Math.round(l.qty),
      unit_price_fcfa: Math.max(0, Math.round(l.unit_price_fcfa || 0)),
    }))

  if (items.length > 0) {
    const { error: itemsError } = await supabase.from('order_items').insert(items)
    if (itemsError) throw new Error(itemsError.message)
  }

  if (input.on_credit && customerId) {
    const subtotal = items.reduce((s, l) => s + l.qty * l.unit_price_fcfa, 0)
    const total = subtotal + Math.max(0, Math.round(input.delivery_fee_fcfa || 0))
    if (total > 0) {
      await supabase.from('credit_ledger').insert({
        customer_id: customerId,
        order_id: order.id,
        entry_type: 'debit',
        amount_fcfa: total,
        note: 'Vente à crédit',
      })
    }
  }

  revalidatePath('/')
  revalidatePath('/orders')
  revalidatePath('/customers')
  redirect('/orders/' + order.id)
}

export async function updateOrderStatus(formData: FormData) {
  const supabase = await createClient()
  const orderId = String(formData.get('order_id') ?? '')
  const status = String(formData.get('status') ?? '')
  if (!orderId || !status) return
  await supabase.from('orders').update({ status }).eq('id', orderId)
  revalidatePath('/orders/' + orderId)
  revalidatePath('/orders')
  revalidatePath('/')
}

/** Records a debt repayment (a `credit` entry) against a customer's credit ledger. */
export async function recordRepayment(formData: FormData) {
  const supabase = await createClient()
  const customerId = String(formData.get('customer_id') ?? '')
  const amount = parseInt(String(formData.get('amount_fcfa') ?? '0').replace(/[^\d]/g, ''), 10) || 0
  const note = String(formData.get('note') ?? '').trim() || 'Remboursement'
  if (!customerId || amount <= 0) return
  await supabase.from('credit_ledger').insert({
    customer_id: customerId,
    entry_type: 'credit',
    amount_fcfa: amount,
    note,
  })
  revalidatePath('/customers')
  revalidatePath('/')
}

/** One-click sample catalogue + customers so a new shop has something to play with. */
export async function importDemoData() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) redirect('/login')

  await supabase.from('products').insert([
    { name: 'Riz parfumé 25kg', sku: 'RIZ25', unit: 'sac', unit_price_fcfa: 13500, stock_qty: 40, low_stock_threshold: 10 },
    { name: 'Huile végétale 5L', sku: 'HUI5', unit: 'bidon', unit_price_fcfa: 6500, stock_qty: 25, low_stock_threshold: 8 },
    { name: 'Savon de ménage (carton de 12)', sku: 'SAV12', unit: 'carton', unit_price_fcfa: 9000, stock_qty: 8, low_stock_threshold: 10 },
    { name: 'Sucre en poudre 1kg', sku: 'SUC1', unit: 'paquet', unit_price_fcfa: 900, stock_qty: 60, low_stock_threshold: 20 },
    { name: 'Lait en poudre 400g', sku: 'LAI400', unit: 'boite', unit_price_fcfa: 2500, stock_qty: 30, low_stock_threshold: 10 },
    { name: 'Eau minérale 10L', sku: 'EAU10', unit: 'bidon', unit_price_fcfa: 1500, stock_qty: 50, low_stock_threshold: 15 },
  ])

  await supabase.from('customers').insert([
    { name: 'Clarisse Mbah', phone: '+237671234567', whatsapp_handle: 'Clarisse M', momo_provider: 'mtn_momo', momo_number: '+237671234567', zone: 'Mvog-Mbi, Yaoundé' },
    { name: 'Tonton Pascal', phone: '+237680112233', whatsapp_handle: 'Pascal Dla', momo_provider: 'mtn_momo', momo_number: '+237680112233', zone: 'Bonabéri, Douala' },
    { name: 'Aïcha Bouba', phone: '+237691223344', whatsapp_handle: 'Aicha B', momo_provider: 'orange_money', momo_number: '+237691223344', zone: 'Mokolo, Yaoundé' },
    { name: 'Eric Fotso', phone: '+237655998877', whatsapp_handle: 'Eric F', momo_provider: 'mtn_momo', momo_number: '+237655998877', zone: 'Biyem-Assi, Yaoundé' },
  ])

  revalidatePath('/')
  revalidatePath('/orders')
  revalidatePath('/customers')
  redirect('/orders/new')
}
