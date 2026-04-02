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

    // Also verify external server connectivity by checking wallet
    const wallet = await getWallet()
    if (!wallet) {
        // If wallet can't be loaded, server is likely down - redirect to login
        return redirect('/login?error=server_unavailable')
    }

    return (
        <SidebarShell wallet={wallet}>
            {children}
        </SidebarShell>
    )
}
