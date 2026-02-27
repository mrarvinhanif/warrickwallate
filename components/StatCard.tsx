import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, PaymentMethod } from '../types';

interface StatCardProps {
  label: string;
  type: 'balance' | 'income' | 'expense';
  currencySymbol: string;
  transactions: Transaction[];
  style?: React.CSSProperties;
}

const StatCard: React.FC<StatCardProps> = ({ label, type, currencySymbol, transactions, style }) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(PaymentMethod.CASH);

  const getStyle = () => {
    switch (type) {
      case 'income': return 'bg-green-100/60 text-emerald-600 border border-white';
      case 'expense': return 'bg-red-100/60 text-rose-600 border border-white';
      case 'balance': return 'bg-blue-100/60 text-blue-700 border border-white';
      default: return 'bg-white text-slate-800 border border-white';
    }
  };

  const toggleReveal = () => setIsRevealed(!isRevealed);

  const methodTotals = useMemo(() => {
    const res = { CASH: 0, BKASH: 0, NAGAD: 0, BANK: 0 };
    transactions.forEach(t => {
      const val = (t.type === TransactionType.INCOME) ? t.amount : -t.amount;
      if (res.hasOwnProperty(t.method)) res[t.method] += val;
      else res['CASH'] += val;
    });
    return res;
  }, [transactions]);

  const displayAmount = useMemo(() => {
    if (type === 'balance') return methodTotals[selectedMethod];
    return transactions
      .filter(t => (type === 'income' ? t.type === TransactionType.INCOME : t.type === TransactionType.EXPENSE) && (t.method === selectedMethod || (!t.method && selectedMethod === 'CASH')))
      .reduce((acc, t) => acc + t.amount, 0);
  }, [type, methodTotals, transactions, selectedMethod]);

  return (
    <div style={style} className={`ios-widget p-6 md:p-7 ios-glass ${getStyle()} flex flex-col justify-between h-44 md:h-48 shadow-2xl animate-ios relative overflow-hidden`}>
      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-center w-full">
          <p className={`text-[10px] md:text-[11px] font-black uppercase tracking-widest ${type === 'balance' ? 'text-blue-500' : (type === 'income' ? 'text-emerald-500' : 'text-rose-500')}`}>{label}</p>
          <div className="flex gap-1 p-1 bg-white/40 rounded-xl border border-white/60 overflow-x-auto scrollbar-hide">
            {[PaymentMethod.CASH, PaymentMethod.BKASH, PaymentMethod.NAGAD, PaymentMethod.BANK].map(m => (
              <button 
                key={m} 
                onClick={() => setSelectedMethod(m as PaymentMethod)} 
                className={`px-2.5 py-1 rounded-lg text-[8px] font-black tracking-tight transition-all flex-shrink-0 ${selectedMethod === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3">
          <div onClick={toggleReveal} className={`balance-slider-bg type-${type} ${isRevealed ? 'active' : ''} cursor-pointer relative h-[28px] w-[110px] rounded-full bg-white/40 backdrop-blur-md border border-white/60 overflow-hidden shadow-sm`}>
            <div className="balance-slider-text absolute w-full text-center text-[8px] font-extrabold uppercase tracking-widest top-1/2 -translate-y-1/2 pl-[22px] pointer-events-none transition-opacity opacity-60">
              {isRevealed ? 'REVEALED' : `TAP TO ${selectedMethod}`}
            </div>
            <div className={`balance-slider-thumb absolute top-[2px] left-[2px] h-[22px] w-[22px] rounded-full flex items-center justify-center text-white text-[11px] shadow-md transition-transform duration-500 ease-out ${isRevealed ? 'translate-x-[84px]' : 'translate-x-0'} ${type === 'balance' ? 'bg-blue-600' : type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
              ৳
            </div>
          </div>
        </div>
      </div>
      <h2 className={`text-2xl md:text-3xl font-extrabold tabular-nums tracking-tighter leading-none transition-all duration-500 ${!isRevealed ? 'blur-md opacity-20' : 'opacity-100'}`}>
        <span className="text-lg md:text-xl mr-1 font-medium opacity-70">{currencySymbol}</span>
        {displayAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
      </h2>
    </div>
  );
};

export default StatCard;
