export type Business = {
  id: string
  name: string
  country: string
  currency: string
  whatsapp_number: string | null
  momo_mtn_number: string | null
  momo_orange_number: string | null
}

export type Customer = {
  id: string
  owner_id: string
  name: string
  phone: string | null
  whatsapp_handle: string | null
  momo_provider: string | null
  momo_number: string | null
  zone: string | null
  notes: string | null
}

export type Product = {
  id: string
  owner_id: string
  name: string
  sku: string | null
  unit: string
  unit_price_fcfa: number
  stock_qty: number
  low_stock_threshold: number
  is_active: boolean
}

export type Order = {
  id: string
  owner_id: string
  order_code: string
  customer_id: string | null
  channel: string
  status: string
  payment_status: string
  subtotal_fcfa: number
  delivery_fee_fcfa: number
  discount_fcfa: number
  total_fcfa: number
  amount_paid_fcfa: number
  balance_fcfa: number
  delivery_address: string | null
  delivery_zone: string | null
  rider_name: string | null
  raw_message: string | null
  notes: string | null
  created_at: string
}

export type OrderItem = {
  id: string
  order_id: string
  product_id: string | null
  name_snapshot: string
  qty: number
  unit_price_fcfa: number
  line_total_fcfa: number
}

export type Payment = {
  id: string
  order_id: string | null
  customer_id: string | null
  amount_fcfa: number
  provider: string
  momo_reference: string | null
  momo_number: string | null
  status: string
  raw_sms: string | null
  paid_at: string
}

export type CreditLedgerEntry = {
  id: string
  customer_id: string
  order_id: string | null
  entry_type: 'debit' | 'credit'
  amount_fcfa: number
  balance_after_fcfa: number | null
  note: string | null
  created_at: string
}
