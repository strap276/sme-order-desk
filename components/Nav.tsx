import Link from 'next/link'
import { signOut } from '@/actions/auth'

export default function Nav({ businessName }: { businessName?: string | null }) {
  return (
    <header className="nav">
      <div className="nav-inner">
        <Link href="/" className="brand">🧾 {businessName ?? 'Order Desk'}</Link>
        <nav className="links">
          <Link href="/orders">Commandes</Link>
          <Link href="/orders/new">+ Nouvelle</Link>
          <Link href="/customers">Clients</Link>
          <Link href="/reconcile">Paiements</Link>
        </nav>
        <form action={signOut}>
          <button className="btn ghost small" type="submit">Quitter</button>
        </form>
      </div>
    </header>
  )
}
