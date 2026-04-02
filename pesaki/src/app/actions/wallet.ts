import { revalidatePath } from 'next/cache'
import { apiServerRequest } from '@/utils/api-server';

export type WalletState = {
    balance: number
    demo_balance: number
    is_demo: boolean
}

export async function getWallet() {
    try {
        const demoData = await apiServerRequest('/wallet/balance?mode=demo');
        const realData = await apiServerRequest('/wallet/balance?mode=real');

        if (!demoData.success || !realData.success) return null;

        return {
            balance: realData.data.balance,
            demo_balance: demoData.data.balance,
            is_demo: true
        };
    } catch (err) {
        console.error('Wallet fetch error:', err);
        return null;
    }
}

export async function processTransaction(
    amount: number,
    type: 'deposit' | 'withdrawal' | 'bet' | 'win' | 'loss',
    mode: 'real' | 'demo',
    gameType?: string
) {
    try {
        let endpoint = '/wallet/deposit';
        if (type === 'bet' || type === 'withdrawal' || type === 'loss') {
            endpoint = '/wallet/withdraw';
        }

        const data = await apiServerRequest(endpoint, {
            method: 'POST',
            body: JSON.stringify({ amount, mode })
        });

        if (data.success) {
            revalidatePath('/dashboard');
            return { success: true, newBalance: data.newBalance };
        }
        return { error: data.error };
    } catch (err: any) {
        return { error: err.message };
    }
}
