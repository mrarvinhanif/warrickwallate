import React from 'react';
import { Transaction, TransactionType, UserRole } from '../types';

interface TransactionListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  currencySymbol: string;
  role: UserRole;
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions, onDelete, currencySymbol, role }) => {
  return (
    <div className="w-full">
      <div className="p-8 border-b border-white/40 flex justify-between items-center bg-white/30">
        <div>
          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Recent Activity</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Live Transaction Stream</p>
        </div>
        <span className="text-[10px] font-black bg-white/80 border border-white px-3 py-1 rounded-full uppercase shadow-sm">{transactions.length} Logs</span>
      </div>
      
      <div className="max-h-[500px] overflow-y-auto px-4 pb-4 scrollbar-hide">
        {transactions.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full mx-auto mb-4 flex items-center justify-center text-slate-200">
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"/></svg>
            </div>
            <p className="text-slate-300 font-bold uppercase text-[11px] tracking-widest">No Activity Records</p>
          </div>
        ) : (
          <div className="space-y-2 mt-4">
            {transactions.map((t) => (
              <div key={t.id} className="group flex items-center justify-between p-5 bg-white/40 rounded-3xl border border-white/60 hover:bg-white/80 transition-all duration-300 ios-button">
                <div className="flex items-center gap-5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${t.type === TransactionType.INCOME ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {t.type === TransactionType.INCOME ? 
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 17l-4 4m0 0l-4-4m4 4V3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"/></svg> : 
                      <svg className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 17l-4 4m0 0l-4-4m4 4V3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5"/></svg>
                    }
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-800 text-base leading-tight">{t.description}</h4>
                      <span className="text-[8px] font-black bg-white/60 px-1.5 py-0.5 rounded-md border border-white/80 text-slate-400 uppercase tracking-tighter">{t.method}</span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{new Date(t.date).toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className={`text-lg font-black tabular-nums tracking-tighter ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-slate-800'}`}>
                      {t.type === TransactionType.INCOME ? '+' : '-'}{currencySymbol}{t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  
                  {role === UserRole.ADMIN && (
                    <button 
                      onClick={() => onDelete(t.id)} 
                      className="p-2 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionList;
