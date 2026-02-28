import { supabase } from '../lib/supabase';
import { Transaction, UserProfile, TransactionType } from '../types';

export const CloudSync = {
  async migrateLocalData(userId: string) {
    const localKey = `GLOBAL_TX_${userId}`;
    const localData = localStorage.getItem(localKey);
    if (localData) {
      try {
        const txs = JSON.parse(localData);
        for (const tx of txs) {
          await supabase.from('transactions').upsert({
            id: tx.id,
            user_id: userId,
            description: tx.description,
            amount: tx.amount,
            type: tx.type,
            method: tx.method || 'CASH',
            date: tx.date
          });
        }
        localStorage.removeItem(localKey);
      } catch (e) {
        console.error("Migration to Supabase failed", e);
      }
    }
  },

  async getAllUsers(): Promise<UserProfile[]> {
    const { data, error } = await supabase.from('users').select('*');
    if (error) {
      console.error("Fetch Users Failed:", error);
      return JSON.parse(localStorage.getItem('GLOBAL_WARRICK_USERS') || '[]');
    }
    return data || [];
  },

  async saveUser(user: UserProfile) {
    const { error } = await supabase.from('users').upsert({
      email: user.email,
      name: user.name,
      mobile: user.mobile,
      pass: user.pass,
      role: user.role,
      username: user.username,
      avatar: user.avatar || '👤',
      bio: user.bio || ''
    });

    if (error) {
      console.error("Error saving user to Supabase:", error);
      throw error;
    }

    // Local fallback sync
    const users = JSON.parse(localStorage.getItem('GLOBAL_WARRICK_USERS') || '[]');
    const idx = users.findIndex((u: UserProfile) => u.email === user.email);
    if (idx > -1) users[idx] = user;
    else users.push(user);
    localStorage.setItem('GLOBAL_WARRICK_USERS', JSON.stringify(users));
    return user;
  },

  async getTransactions(userId: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });
    
    if (error) {
      console.error("Fetch Transactions Failed:", error);
      return [];
    }
    return (data || []).map(t => ({ ...t, amount: parseFloat(t.amount) }));
  },

  async syncTransactions(userId: string, txs: Transaction[]) {
    const { error } = await supabase.from('transactions').upsert(
      txs.map(t => ({
        id: t.id,
        user_id: userId,
        description: t.description,
        amount: t.amount,
        type: t.type,
        method: t.method || 'CASH',
        date: t.date
      }))
    );
    if (error) {
      console.error("Transaction Sync Failed:", error);
      return false;
    }
    return true;
  },

  async deleteTransaction(id: string) {
    const { error } = await supabase.from('transactions').delete().eq('id', id);
    if (error) {
      console.error("Transaction Delete Failed:", error);
      throw error;
    }
  },

  async getAds(): Promise<import('../types').Advertisement[]> {
    const { data, error } = await supabase.from('advertisements').select('*').order('createdAt', { ascending: false });
    if (error) {
      console.error("Fetch Ads Failed:", error);
      return JSON.parse(localStorage.getItem('GLOBAL_WARRICK_ADS') || '[]');
    }
    return data || [];
  },

  async saveAd(ad: import('../types').Advertisement) {
    const { error } = await supabase.from('advertisements').upsert(ad);
    if (error) {
      console.error("Save Ad Failed:", error);
      // Fallback
      const ads = JSON.parse(localStorage.getItem('GLOBAL_WARRICK_ADS') || '[]');
      const idx = ads.findIndex((a: any) => a.id === ad.id);
      if (idx > -1) ads[idx] = ad;
      else ads.push(ad);
      localStorage.setItem('GLOBAL_WARRICK_ADS', JSON.stringify(ads));
      return ad;
    }
    return ad;
  },

  async deleteAd(id: string) {
    const { error } = await supabase.from('advertisements').delete().eq('id', id);
    if (error) {
      console.error("Delete Ad Failed:", error);
      const ads = JSON.parse(localStorage.getItem('GLOBAL_WARRICK_ADS') || '[]');
      const filtered = ads.filter((a: any) => a.id !== id);
      localStorage.setItem('GLOBAL_WARRICK_ADS', JSON.stringify(filtered));
    }
  }
};
