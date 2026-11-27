import { createClient } from '@/lib/supabase/server'

/**
 * Returns the signed-in user (or null) plus their `businesses` row.
 * Creates the business row on first call after sign-up, so every new shop
 * starts with a valid tenant to hang orders off.
 */
export async function ensureBusiness() {
  let user = null
  let business = null

  try {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    user = data.user ?? null
    if (!user) return { user: null, business: null }

    const { data: existing } = await supabase.from('businesses').select('*').eq('id', user.id).maybeSingle()
    if (existing) return { user, business: existing }

    const name = user.email ? user.email.split('@')[0] : 'Ma Boutique'
    const { data: created } = await supabase.from('businesses').insert({ id: user.id, name }).select('*').single()
    business = created ?? null
  } catch {
    return { user: null, business: null }
  }

  return { user, business }
}
