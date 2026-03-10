'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export type WalletState = {
    balance: number
    demo_balance: number
    is_demo: boolean // This might be better as a UI state, but fetching the wallet returns both balances
}

export async function getWallet() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return null

    const { data: wallet, error } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single()

    if (error) {
        console.error('Error fetching wallet:', error)
        return null
    }

    return wallet
}

export async function processTransaction(
    amount: number,
    type: 'deposit' | 'withdrawal' | 'bet' | 'win' | 'loss',
    mode: 'real' | 'demo',
    gameType?: string
) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Unauthorized' }

    const balanceField = mode === 'real' ? 'balance' : 'demo_balance'

    // fetch current wallet
    const { data: wallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single()

    if (!wallet) return { error: 'Wallet not found' }

    // Check sufficient funds for outgoing
    if (type === 'bet' || type === 'withdrawal' || type === 'loss') {
        if (wallet[balanceField] < amount) {
            return { error: 'Insufficient funds' }
        }
    }

    // Calculate new balance
    let change = 0
    if (type === 'deposit' || type === 'win') {
        change = amount
    } else {
        change = -amount
    }

    const { error: txError } = await supabase
        .from('transactions')
        .insert({
            wallet_id: wallet.id,
            type,
            amount,
            is_demo: mode === 'demo',
            game_type: gameType,
        })

    if (txError) return { error: txError.message }

    // Update wallet
    // Note: For production, use RPC or database functions for atomicity to avoid race conditions
    const { error: updateError } = await supabase
        .from('wallets')
        .update({ [balanceField]: wallet[balanceField] + change })
        .eq('id', wallet.id)

    if (updateError) return { error: updateError.message }

    revalidatePath('/dashboard')
    return { success: true, newBalance: wallet[balanceField] + change }
}
