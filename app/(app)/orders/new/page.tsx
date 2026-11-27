import { createClient } from '@/lib/supabase/server'
import NewOrderForm from '@/components/NewOrderForm'
import type { CatalogProduct } from '@/lib/whatsapp/parse'

export const dynamic = 'force-dynamic'

export default async function NewOrderPage() {
  const supabase = await createClient()
  const { data: products } = await supabase
    .from('products')
    .select('id, name, sku, unit_price_fcfa')
    .eq('is_active', true)
    .order('name')
  const { data: customers } = await supabase.from('customers').select('id, name, phone').order('name')

  return (
    <>
      <h1>Nouvelle commande</h1>
      <p className="muted small">
        Collez la conversation WhatsApp : l&apos;appli repère les articles, les quantités et les frais de livraison, puis vous validez.
      </p>
      <NewOrderForm products={(products ?? []) as CatalogProduct[]} customers={customers ?? []} />
    </>
  )
}
