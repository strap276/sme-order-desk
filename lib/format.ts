export function fcfa(amount: number | null | undefined): string {
  const n = Number(amount ?? 0)
  if (!Number.isFinite(n)) return '0 FCFA'
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Math.round(n)) + ' FCFA'
}

export function shortDate(value: string | null | undefined): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d)
}

export const ORDER_STATUSES = ['new', 'confirmed', 'packed', 'out_for_delivery', 'delivered', 'cancelled', 'returned'] as const

export const ORDER_STATUS_LABELS: Record<string, string> = {
  new: 'Nouvelle',
  confirmed: 'Confirmée',
  packed: 'Emballée',
  out_for_delivery: 'En livraison',
  delivered: 'Livrée',
  cancelled: 'Annulée',
  returned: 'Retournée',
}

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: 'Non payé',
  partial: 'Partiel',
  paid: 'Payé',
  refunded: 'Remboursé',
}

export const PROVIDER_LABELS: Record<string, string> = {
  mtn_momo: 'MTN MoMo',
  orange_money: 'Orange Money',
  cash: 'Espèces',
  bank_transfer: 'Virement',
  other: 'Autre',
}

export const PAYMENT_TX_LABELS: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmé',
  failed: 'Échoué',
  reversed: 'Annulé',
}
