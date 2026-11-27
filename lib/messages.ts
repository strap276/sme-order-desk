import { fcfa } from '@/lib/format'

export type ConfirmationItem = {
  name_snapshot: string
  qty: number
  unit_price_fcfa: number
  line_total_fcfa?: number | null
}

export type ConfirmationOrder = {
  order_code: string
  status: string
  payment_status: string
  subtotal_fcfa: number
  delivery_fee_fcfa: number
  total_fcfa: number
  balance_fcfa: number
  delivery_zone: string | null
}

export type ConfirmationBusiness = {
  name: string
  momo_mtn_number: string | null
  momo_orange_number: string | null
  whatsapp_number: string | null
}

/** Builds the message the shopkeeper pastes back into WhatsApp. */
export function buildConfirmationMessage(
  order: ConfirmationOrder,
  items: ConfirmationItem[],
  business: ConfirmationBusiness,
  customerName?: string | null
): string {
  const lines: string[] = []
  lines.push(`Bonjour${customerName ? ' ' + customerName : ''} 🙌`)
  lines.push(`Votre commande *${order.order_code}* est confirmée ✅`)
  lines.push('')
  for (const it of items) {
    const lt = it.line_total_fcfa ?? it.qty * it.unit_price_fcfa
    lines.push(`• ${it.qty} × ${it.name_snapshot} = ${fcfa(lt)}`)
  }
  if (order.delivery_zone) lines.push(`Livraison: ${order.delivery_zone}`)
  lines.push('')
  lines.push(`Sous-total: ${fcfa(order.subtotal_fcfa)}`)
  if (order.delivery_fee_fcfa > 0) lines.push(`Frais de livraison: ${fcfa(order.delivery_fee_fcfa)}`)
  lines.push(`*TOTAL: ${fcfa(order.total_fcfa)}*`)
  if (order.balance_fcfa > 0) lines.push(`Reste à payer: ${fcfa(order.balance_fcfa)}`)
  lines.push('')
  lines.push('Paiement Mobile Money:')
  if (business.momo_mtn_number) lines.push(`• MTN MoMo: ${business.momo_mtn_number}`)
  if (business.momo_orange_number) lines.push(`• Orange Money: ${business.momo_orange_number}`)
  lines.push('Après le paiement, envoyez-nous la capture du SMS. Merci! 🙏')
  lines.push(`— ${business.name}`)
  return lines.join('\n')
}
