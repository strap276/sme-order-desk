import { signIn, signUp } from '@/actions/auth'

export const dynamic = 'force-dynamic'

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  const error = searchParams?.error

  return (
    <div className="login-wrap">
      <div className="card">
        <h1>🧾 SME Order Desk</h1>
        <p className="muted small">
          Transformez les commandes WhatsApp en ventes suivies. Mobile Money, crédit client et livraison compris.
        </p>
        {error && <p className="badge pay-unpaid">{decodeURIComponent(error)}</p>}
        <form action={signIn}>
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" />
          <label htmlFor="password">Mot de passe</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" />
          <div style={{ marginTop: 12 }}>
            <button className="btn" type="submit">
              Se connecter
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <h2>Créer une boutique</h2>
        <form action={signUp}>
          <label htmlFor="shop_name">Nom de la boutique</label>
          <input id="shop_name" name="shop_name" placeholder="Mami Ngono Boutique" />
          <label htmlFor="email2">Email</label>
          <input id="email2" name="email" type="email" required autoComplete="email" />
          <label htmlFor="password2">Mot de passe</label>
          <input id="password2" name="password" type="password" required autoComplete="new-password" minLength={6} />
          <div style={{ marginTop: 12 }}>
            <button className="btn secondary" type="submit">
              Créer le compte
            </button>
          </div>
        </form>
        <p className="small muted" style={{ marginTop: 10 }}>
          Astuce : désactivez « Confirm email » dans Supabase Authentication pour un dev local plus rapide.
        </p>
      </div>
    </div>
  )
}
