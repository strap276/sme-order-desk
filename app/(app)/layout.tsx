import { redirect } from 'next/navigation'
import Nav from '@/components/Nav'
import { ensureBusiness } from '@/lib/business'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, business } = await ensureBusiness()
  if (!user) redirect('/login')

  return (
    <>
      <Nav businessName={business?.name} />
      <main className="container">{children}</main>
    </>
  )
}
