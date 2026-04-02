"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.credit = exports.debit = exports.getBalance = void 0;
const supabase_1 = require("../lib/supabase");
const logger_1 = require("../utils/logger");
/**
 * Service to handle atomic wallet transactions interacting via Supabase RPCs
 */
const getBalance = async (userId, mode) => {
    const balanceField = mode === 'real' ? 'balance' : 'demo_balance';
    let { data, error } = await supabase_1.supabase
        .from('wallets')
        .select(balanceField)
        .eq('user_id', userId)
        .single();
    if (error && error.code === 'PGRST116') {
        // Wallet doesn't exist, create it with default balances
        const { data: newData, error: createError } = await supabase_1.supabase
            .from('wallets')
            .insert([{
                user_id: userId,
                balance: 0,
                demo_balance: 10000
            }])
            .select(balanceField)
            .single();
        if (createError) {
            logger_1.logger.error({ createError, userId }, 'Failed to create wallet');
            return null;
        }
        data = newData;
    }
    else if (error || !data) {
        logger_1.logger.error({ error, userId, mode }, 'Failed to fetch wallet balance');
        return null;
    }
    return data[balanceField];
};
exports.getBalance = getBalance;
const debit = async (userId, amount, mode, description) => {
    if (amount <= 0)
        return { success: false, error: 'Amount must be greater than zero' };
    logger_1.logger.info({ userId, amount, mode, description }, 'Initiating debit...');
    try {
        // 1. Redundant Safety Check: Verify balance before calling RPC
        const balance = await (0, exports.getBalance)(userId, mode);
        if (balance === null || balance < amount) {
            logger_1.logger.warn({ userId, balance, amount, mode }, 'Debit blocked: Insufficient funds (redundant check)');
            return { success: false, error: 'Insufficient funds' };
        }
        // 2. Atomic Database Operation
        const { data, error } = await supabase_1.supabase.rpc('debit_wallet', {
            p_user_id: userId,
            p_amount: amount,
            p_mode: mode,
            p_description: description
        });
        if (error) {
            logger_1.logger.warn({ error, userId, amount, description }, 'Debit RPC failed');
            return { success: false, error: error.message };
        }
        if (data === null) {
            logger_1.logger.error({ userId, amount, mode }, 'Debit RPC returned null without an error object');
            return { success: false, error: 'Insufficient funds' };
        }
        logger_1.logger.info({ userId, amount, mode, newBalance: data }, 'Debit successful');
        return { success: true, newBalance: data };
    }
    catch (error) {
        logger_1.logger.error(error, 'Exception in debit operation');
        return { success: false, error: 'Internal server error' };
    }
};
exports.debit = debit;
const credit = async (userId, amount, mode, description) => {
    if (amount <= 0)
        return { success: false, error: 'Amount must be greater than zero' };
    try {
        const { data, error } = await supabase_1.supabase.rpc('credit_wallet', {
            p_user_id: userId,
            p_amount: amount,
            p_mode: mode,
            p_description: description
        });
        if (error) {
            logger_1.logger.warn({ error, userId, amount, description }, 'Credit failed');
            return { success: false, error: error.message };
        }
        return { success: true, newBalance: data };
    }
    catch (error) {
        logger_1.logger.error(error, 'Exception in credit operation');
        return { success: false, error: 'Internal server error' };
    }
};
exports.credit = credit;
