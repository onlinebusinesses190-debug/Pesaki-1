import { getWallet } from '@/app/actions/wallet'
import { SidebarShell } from '@/components/dashboard/SidebarShell'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    // Fetch wallet data server-side
    const wallet = await getWallet()

    return (
        <SidebarShell wallet={wallet}>
            {children}
        </SidebarShell>
    )
}
