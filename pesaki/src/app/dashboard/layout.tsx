import { getWallet } from '@/app/actions/wallet'
import { SidebarShell } from '@/components/dashboard/SidebarShell'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (!user || error) {
        return redirect('/login')
    }

    const wallet = await getWallet()

    return (
        <SidebarShell wallet={wallet}>
            {children}
        </SidebarShell>
    )
}
