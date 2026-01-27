import { supabase } from './supabase';

export interface Transaction {
  id: string;
  buyer_user_id?: string;
  seller_user_id?: string;
  listing_id?: string;
  amount: number;
  platform_fee: number;
  status: 'pending' | 'paid' | 'shipped' | 'completed' | 'canceled';
  created_at: string;
}

/**
 * Create transaction shell row (no real checkout)
 * This is a placeholder for future checkout implementation
 */
export async function createTransaction(
  buyerId: string,
  sellerId: string,
  listingId: string,
  amount: number,
  platformFee: number = 0
): Promise<{
  data: Transaction | null;
  error: any;
}> {
  try {
    const { data: transaction, error } = await supabase
      .from('transactions')
      .insert({
        buyer_user_id: buyerId,
        seller_user_id: sellerId,
        listing_id: listingId,
        amount: amount,
        platform_fee: platformFee,
        status: 'pending', // MVP: stays pending (no real checkout)
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { data: transaction, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Get user's transactions (as buyer)
 */
export async function getUserBuyerTransactions(userId: string): Promise<{
  data: Transaction[];
  error: any;
}> {
  try {
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*, listings(*, wardrobe_items(*))')
      .eq('buyer_user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return { data: (transactions as any) || [], error: null };
  } catch (error: any) {
    return { data: [], error };
  }
}

/**
 * Get user's transactions (as seller)
 */
export async function getUserSellerTransactions(userId: string): Promise<{
  data: Transaction[];
  error: any;
}> {
  try {
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*, listings(*, wardrobe_items(*))')
      .eq('seller_user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return { data: (transactions as any) || [], error: null };
  } catch (error: any) {
    return { data: [], error };
  }
}

/**
 * Get transaction by ID
 */
export async function getTransaction(transactionId: string): Promise<{
  data: Transaction | null;
  error: any;
}> {
  try {
    const { data: transaction, error } = await supabase
      .from('transactions')
      .select('*, listings(*, wardrobe_items(*))')
      .eq('id', transactionId)
      .single();

    if (error) {
      throw error;
    }

    return { data: transaction as any, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Update transaction status (for future use with real checkout)
 */
export async function updateTransactionStatus(
  transactionId: string,
  status: 'pending' | 'paid' | 'shipped' | 'completed' | 'canceled'
): Promise<{
  data: Transaction | null;
  error: any;
}> {
  try {
    const { data: transaction, error } = await supabase
      .from('transactions')
      .update({ status })
      .eq('id', transactionId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { data: transaction, error: null };
  } catch (error: any) {
    return { data: null, error };
  }
}
