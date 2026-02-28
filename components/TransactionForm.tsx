import React, { useState, useEffect } from 'react';
import { TransactionType, Transaction, PaymentMethod } from '../types';

interface TransactionFormProps {
  onAdd: (transaction: Omit<Transaction, 'id' | 'user_id'>) => void;
  initialType?: TransactionType;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ onAdd, initialType }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>(initialType || TransactionType.EXPENSE);
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.CASH);

  useEffect(() => {
    if (initialType && initialType !== TransactionType.ALL) setType(initialType);
  }, [initialType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;
    onAdd({ 
      description, 
      amount: parseFloat(amount), 
      type, 
      method,
      date: new Date().toISOString() 
    });
    setDescription('');
    setAmount('');
  };

  const inputClass = "w-full px-4 py-3 rounded-xl bg-white border border-slate-100 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-semibold text-slate-800 placeholder:text-slate-300 text-sm";

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <input
        required
        type="text"
        placeholder="Memo / Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className={inputClass}
      />
      <input
        required
        type="number"
        step="0.01"
        placeholder="0.00"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className={inputClass}
      />
      <select
        value={method}
        onChange={(e) => setMethod(e.target.value as PaymentMethod)}
        className={inputClass}
      >
        {Object.values(PaymentMethod).map(m => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
      <button type="submit" className="bg-white text-blue-600 font-black py-3 rounded-xl hover:bg-slate-50 transition-all text-xs ios-button shadow-lg shadow-blue-500/5 border border-blue-100 uppercase tracking-widest">
        Sync Entry
      </button>
    </form>
  );
};

export default TransactionForm;
