'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ensureBusiness } from '@/lib/business'

export async function signIn(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) redirect('/login?error=' + encodeURIComponent(error.message))
  await ensureBusiness()
  redirect('/')
}

export async function signUp(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const shopName = String(formData.get('shop_name') ?? '').trim() || 'Ma Boutique'
  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({ email, password })
  if (error) redirect('/login?error=' + encodeURIComponent(error.message))

  const { data } = await supabase.auth.getUser()
  if (data.user) {
    await supabase.from('businesses').upsert({ id: data.user.id, name: shopName })
  }
  redirect('/')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
