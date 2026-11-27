import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, PAYMENT_TX_LABELS } from '@/lib/format'

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge-${status}`}>{ORDER_STATUS_LABELS[status] ?? status}</span>
}

export function PayBadge({ status }: { status: string }) {
  return <span className={`badge pay-${status}`}>{PAYMENT_STATUS_LABELS[status] ?? status}</span>
}

export function TxBadge({ status }: { status: string }) {
  return <span className={`badge tx-${status}`}>{PAYMENT_TX_LABELS[status] ?? status}</span>
}
