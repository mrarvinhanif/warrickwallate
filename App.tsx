import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, TransactionType, UserRole, PaymentMethod, UserProfile } from './types';
import { CloudSync } from './services/cloudSync';
import StatCard from './components/StatCard';
import TransactionForm from './components/TransactionForm';
import TransactionList from './components/TransactionList';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Extend jsPDF type for autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

const Logo = ({ className = "" }: { className?: string }) => (
  <div className={`brand-container ${className}`}>
    <h1 className="text-3xl md:text-4xl brand-text">WARRICK<span className="brand-dot">.</span></h1>
    <div className="brand-underline"></div>
    <div className="powered-tag text-[7px]">POWERED BY ARVIN</div>
  </div>
);

const AdBanner = () => (
  <a href="https://www.cellexbd.online" target="_blank" rel="noopener noreferrer" className="ad-banner">
    <span className="ad-label">Advertisement</span>
    <div className="ad-content-text">
      <img src="https://api.dicebear.com/7.x/shapes/svg?seed=cellex" alt="Cellex" className="ad-image" />
      <div className="ad-dot-pulse"></div>
      PREMIUM CLOUD SYNC ACTIVE
    </div>
  </a>
);

const App: React.FC = () => {
  const [view, setView] = useState<'signin' | 'signup' | 'admin' | 'dashboard'>('signin');
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filterType, setFilterType] = useState<TransactionType>(TransactionType.ALL);
  const [timeRange, setTimeRange] = useState('ALL');
  const [entryType, setEntryType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [isLoading, setIsLoading] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<Partial<UserProfile>>({});
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const session = localStorage.getItem('W_SESSION');
    if (session) {
      try {
        const user = JSON.parse(session);
        loadUserData(user);
      } catch (e) {
        localStorage.removeItem('W_SESSION');
      }
    }
  }, []);

  const loadUserData = async (user: UserProfile) => {
    setIsLoading(true);
    const userId = user.username || user.email;
    await CloudSync.migrateLocalData(userId);
    const txs = await CloudSync.getTransactions(userId);
    setTransactions(txs);
    setCurrentUser(user);
    setProfileForm({ 
      name: user.name, 
      email: user.email, 
      mobile: user.mobile || '', 
      username: user.username || '', 
      pass: user.pass, 
      avatar: user.avatar || '👤',
      bio: user.bio || 'A Finance Enthusiast focused on smart money management.'
    });
    setView('dashboard');
    setIsLoading(false);
  };

  const handleSignin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const fd = new FormData(e.currentTarget);
    const login = fd.get('login') as string;
    const pass = fd.get('pass') as string;
    try {
      const users = await CloudSync.getAllUsers();
      const user = users.find(u => (u.email === login || u.mobile === login || u.username === login) && u.pass === pass);
      if (user) {
        localStorage.setItem('W_SESSION', JSON.stringify(user));
        await loadUserData(user);
      } else {
        alert('Invalid Credentials');
      }
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const fd = new FormData(e.currentTarget);
    const email = fd.get('email') as string;
    const name = fd.get('name') as string;
    const mobile = fd.get('mobile') as string;
    const pass = fd.get('pass') as string;
    
    const newUser: UserProfile = {
      name, email, username: email,
      mobile, pass,
      role: UserRole.USER, avatar: '👤',
      bio: ''
    };
    
    try {
      await CloudSync.saveUser(newUser);
      localStorage.setItem('W_SESSION', JSON.stringify(newUser));
      await loadUserData(newUser);
    } catch (e) {
      console.error("Signup failed:", e);
      alert("Account creation failed. Please check your connection.");
    }
    setIsLoading(false);
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsLoading(true);
    const updatedUser = { ...currentUser, ...profileForm } as UserProfile;
    await CloudSync.saveUser(updatedUser);
    setCurrentUser(updatedUser);
    localStorage.setItem('W_SESSION', JSON.stringify(updatedUser));
    setIsEditingProfile(false);
    setIsLoading(false);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileForm({ ...profileForm, avatar: reader.result as string });
    };
    reader.readAsDataURL(file);
  };

  const filteredTxs = useMemo(() => {
    let list = [...transactions];
    if (filterType !== TransactionType.ALL) list = list.filter(t => t.type === filterType);
    if (timeRange !== 'ALL' && timeRange !== 'Custom') {
      const now = new Date().getTime();
      const ranges: Record<string, number> = { '24H': 86400000, '7D': 604800000, '30D': 2592000000, '3M': 7776000000, '6M': 15552000000, '1Y': 31536000000, '2Y': 63072000000, '5Y': 157680000000 };
      const limit = now - (ranges[timeRange] || 0);
      if (ranges[timeRange]) list = list.filter(t => new Date(t.date).getTime() >= limit);
    }
    if (historySearch.trim() !== '') {
      const query = historySearch.toLowerCase();
      list = list.filter(t => t.description.toLowerCase().includes(query) || (t.method && t.method.toLowerCase().includes(query)));
    }
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, filterType, timeRange, historySearch]);

  const handleDelete = async (id: string) => {
    const updated = transactions.filter(tx => tx.id !== id);
    setTransactions(updated);
    await CloudSync.deleteTransaction(id);
  };

  const handleAddTransaction = async (newTxData: Omit<Transaction, 'id' | 'user_id'>) => {
    if (!currentUser) return;
    const newTx: Transaction = {
      ...newTxData,
      id: Date.now().toString(),
      user_id: currentUser.username || currentUser.email
    };
    const updated = [newTx, ...transactions];
    setTransactions(updated);
    await CloudSync.syncTransactions(currentUser.username || currentUser.email, updated);
  };

  const handleUpdateTransaction = async (updatedTx: Transaction) => {
    if (!currentUser) return;
    const updated = transactions.map(tx => tx.id === updatedTx.id ? updatedTx : tx);
    setTransactions(updated);
    await CloudSync.syncTransactions(currentUser.username || currentUser.email, updated);
    setEditingTransaction(null);
  };

  const exportToPDF = () => {
    if (!currentUser) return;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const darkColor: [number, number, number] = [30, 41, 59], accentColor: [number, number, number] = [251, 191, 36];
    doc.setFillColor(...darkColor); doc.rect(0, 0, pageWidth, 50, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(28); doc.text("WARRICK.", 15, 25);
    doc.setFontSize(8); doc.text("POWERED BY ARVIN", 15, 30);
    doc.setFontSize(9); doc.text(`User: ${currentUser.name}`, pageWidth - 15, 20, { align: 'right' });
    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - 15, 30, { align: 'right' });
    const tableData = transactions.map(t => [new Date(t.date).toLocaleDateString(), t.description, t.method || 'CASH', t.type, `৳${t.amount.toFixed(2)}`]);
    doc.autoTable({
      startY: 110, head: [['DATE', 'ITEM DESCRIPTION', 'METHOD', 'TYPE', 'TOTAL']], body: tableData, theme: 'plain',
      headStyles: { fillColor: accentColor, textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
    });
    doc.save(`Warrick_Wallet_Report_${currentUser.name.replace(/\s+/g, '_')}.pdf`);
  };

  if (view !== 'dashboard') {
    return (
      <div className="fixed inset-0 flex items-center justify-center p-6 bg-[#e0e5ec]">
        <div className="w-full max-w-[400px] animate-ios">
          <div className="text-center mb-10"><Logo /></div>
          <div className="neumorphic-card p-10 md:p-12">
            {view === 'signin' && (
              <form onSubmit={handleSignin} className="space-y-6 text-center flex flex-col items-center">
                <input name="login" required placeholder="Email or Mobile" className="neumorphic-input w-full font-medium" />
                <input name="pass" type="password" required placeholder="Password" className="neumorphic-input w-full font-medium" />
                <button disabled={isLoading} className="px-10 glassy-admin-btn mt-2">
                  {isLoading ? 'SIGNING IN...' : 'Sign In'}
                </button>
                <div className="flex flex-col items-center mt-6 pt-6 border-t border-slate-300 w-full">
                  <button type="button" onClick={() => setView('admin')} className="glassy-admin-btn mb-4 px-10">Admin Portal</button>
                  <div className="reg-teaser"><p className="text-xs font-bold text-slate-500">New to Warrick?</p><button type="button" onClick={() => setView('signup')}>Register</button></div>
                </div>
              </form>
            )}
            {view === 'admin' && (
              <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); if (fd.get('id') === 'arvin_hanif' && fd.get('pw') === 'arvin_hanif') { loadUserData({ name: 'Arvin Hanif', email: 'admin@warrick.io', role: UserRole.ADMIN, username: 'arvin_hanif', avatar: '👤', mobile: '', pass: 'arvin_hanif', bio: '' }); } }} className="space-y-6 flex flex-col items-center">
                <input name="id" required placeholder="Admin ID" className="neumorphic-input w-full font-medium" />
                <input name="pw" type="password" required placeholder="Secret" className="neumorphic-input w-full font-medium" />
                <button className="px-10 glassy-admin-btn mt-2">Authorize</button>
                <div className="flex flex-col items-center mt-6 pt-6 border-t border-slate-300 w-full">
                  <div className="reg-teaser"><p className="text-xs font-bold text-slate-500">Mistake?</p><button type="button" onClick={() => setView('signin')}>Back to Login</button></div>
                </div>
              </form>
            )}
            {view === 'signup' && (
              <form onSubmit={handleSignup} className="space-y-5">
                <input name="name" required placeholder="Full Name" className="neumorphic-input" />
                <input name="email" required type="email" placeholder="Email" className="neumorphic-input" />
                <input name="mobile" required placeholder="Mobile" className="neumorphic-input" />
                <input name="pass" type="password" required placeholder="Password" className="neumorphic-input" />
                <button disabled={isLoading} className="w-full py-4 neumorphic-button font-bold text-lg">
                  {isLoading ? 'CREATING ACCOUNT...' : 'Join Warrick'}
                </button>
                <div className="flex flex-col items-center mt-6 pt-6 border-t border-slate-300">
                  <div className="reg-teaser"><p className="text-xs font-bold text-slate-500">Already a member?</p><button type="button" onClick={() => setView('signin')}>Login</button></div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  const incTotal = transactions.filter(t => t.type === TransactionType.INCOME).reduce((a, b) => a + b.amount, 0);
  const expTotal = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((a, b) => a + b.amount, 0);

  if (showProfileModal && currentUser) {
    return (
      <div className="fixed inset-0 bg-white z-[100] overflow-y-auto animate-ios">
        <div className={`w-full min-h-screen flex items-center justify-center ${isEditingProfile ? 'p-0' : 'p-4 md:p-6'}`}>
          <div className={`${isEditingProfile ? 'w-full h-full' : 'max-w-[400px] w-full'} animate-ios`}>
            {!isEditingProfile ? (
              <div className="profile-card-container group">
                <button onClick={() => setShowProfileModal(false)} className="absolute top-6 right-6 z-30 p-2.5 bg-white/10 backdrop-blur-xl rounded-full text-white/90 hover:bg-white/20 transition-all border border-white/20">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
                
                {profileForm.avatar?.startsWith('data:image') ? (
                  <img src={profileForm.avatar} alt="Profile" className="profile-card-image" />
                ) : (
                  <div className="profile-card-image bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-8xl">👤</div>
                )}
                
                <div className="profile-card-gradient"></div>
                
                <div className="profile-card-overlay">
                  <div className="flex items-center mb-1">
                    <h2 className="text-2xl font-black tracking-tight drop-shadow-md">{profileForm.name}</h2>
                    <span className="verified-badge !w-4 !h-4 !ml-2">
                      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"></path></svg>
                    </span>
                  </div>
                  <p className="text-[13px] text-white/80 mb-6 leading-snug font-semibold line-clamp-2 drop-shadow-sm">
                    {profileForm.bio}
                  </p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <div className="flex gap-5">
                      <div className="profile-stat-item !text-xs">
                        <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center mr-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 005.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                        </div>
                        {transactions.length}
                      </div>
                    </div>
                    <button onClick={() => setIsEditingProfile(true)} className="px-5 py-2.5 bg-white text-black rounded-xl font-black text-[10px] uppercase tracking-wider shadow-lg hover:scale-105 active:scale-95 transition-all">Edit Profile</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[#f8fafc] w-full h-full p-6 md:p-12 overflow-y-auto relative flex flex-col items-center">
                <div className="max-w-[700px] w-full animate-ios">
                  <div className="flex justify-between items-center mb-12">
                    <div>
                      <h2 className="text-4xl font-black text-slate-900 tracking-tight">Settings</h2>
                      <p className="text-slate-500 font-medium mt-1">Manage your account and preferences</p>
                    </div>
                    <button onClick={() => setIsEditingProfile(false)} className="p-4 bg-white rounded-2xl text-slate-400 hover:text-slate-600 shadow-sm border border-slate-100 transition-all hover:scale-105 active:scale-95">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                  </div>

                  <form onSubmit={handleProfileUpdate} className="space-y-12 pb-20">
                    <div className="flex flex-col items-center">
                      <div className="avatar-edit-container">
                        <div className="avatar-edit-preview">
                          {profileForm.avatar?.startsWith('data:image') ? <img src={profileForm.avatar} alt="Current" /> : (profileForm.avatar || '👤')}
                        </div>
                        <div className="avatar-edit-badge" onClick={() => avatarInputRef.current?.click()}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                        </div>
                        <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                      </div>
                    </div>

                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-8">
                      <h3 className="form-section-title">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                        Personal Information
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2 space-y-1">
                          <label className="smart-label">About You</label>
                          <textarea className="smart-input min-h-[100px] resize-none" value={profileForm.bio} onChange={e => setProfileForm({...profileForm, bio: e.target.value})} placeholder="Tell us about yourself..." />
                        </div>
                        <div className="space-y-1">
                          <label className="smart-label">Full Name</label>
                          <input required className="smart-input" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} placeholder="Full Name" />
                        </div>
                        <div className="space-y-1">
                          <label className="smart-label">Username</label>
                          <input required className="smart-input" value={profileForm.username} onChange={e => setProfileForm({...profileForm, username: e.target.value})} placeholder="Username" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-8">
                      <h3 className="form-section-title">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
                        Contact & Security
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <label className="smart-label">Email Address</label>
                          <input required className="smart-input" type="email" value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})} placeholder="Email Address" />
                        </div>
                        <div className="space-y-1">
                          <label className="smart-label">Mobile Number</label>
                          <input required className="smart-input" value={profileForm.mobile} onChange={e => setProfileForm({...profileForm, mobile: e.target.value})} placeholder="Mobile Number" />
                        </div>
                        <div className="md:col-span-2 space-y-1">
                          <label className="smart-label">Account Password</label>
                          <input required className="smart-input" type="password" value={profileForm.pass} onChange={e => setProfileForm({...profileForm, pass: e.target.value})} placeholder="New Password" />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <button type="button" onClick={() => setIsEditingProfile(false)} className="flex-1 py-5 bg-slate-100 text-slate-600 font-bold rounded-[2rem] uppercase tracking-widest text-[12px] transition-all hover:bg-slate-200">
                        Cancel
                      </button>
                      <button disabled={isLoading} className="flex-[2] py-5 bg-blue-600 text-white font-black rounded-[2rem] uppercase tracking-widest text-[12px] shadow-2xl shadow-blue-200 hover:bg-blue-700 transition-all hover:scale-[1.02] active:scale-[0.98]">
                        {isLoading ? 'Syncing Changes...' : 'Save Preferences'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen py-4 px-4 md:px-8 lg:px-12">
      <header className="max-w-[1100px] mx-auto mb-6 flex flex-col md:flex-row md:justify-between items-center gap-6 text-center md:text-left animate-ios">
        <div className="flex items-center gap-4">
          <Logo className="header-logo" />
        </div>
        <AdBanner />
        <div className="flex items-center gap-3">
          <div className="avatar-circle-display" onClick={() => setShowProfileModal(true)}>
            {currentUser?.avatar?.startsWith('data:image') ? <img src={currentUser.avatar} alt="Profile" /> : (currentUser?.avatar || '👤')}
          </div>
          <button onClick={() => {localStorage.removeItem('W_SESSION'); setView('signin'); setCurrentUser(null);}} className="px-5 py-2.5 bg-white rounded-2xl text-rose-500 font-black text-[10px] uppercase tracking-widest border border-rose-100 shadow-sm">Logout</button>
        </div>
      </header>
      <main className="max-w-[1100px] mx-auto space-y-8 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard label="Net Balance" type="balance" currencySymbol="৳" transactions={transactions} style={{ animationDelay: '0.1s' }} />
          <StatCard label="Total Income" type="income" currencySymbol="৳" transactions={transactions} style={{ animationDelay: '0.2s' }} />
          <StatCard label="Total Expenses" type="expense" currencySymbol="৳" transactions={transactions} style={{ animationDelay: '0.3s' }} />
        </div>
        
        <div className={`ios-widget p-5 md:p-8 border border-white/40 shadow-2xl transition-all duration-500 animate-ios ${entryType === TransactionType.EXPENSE ? 'ios-glass-red' : 'ios-glass-green'}`} style={{ animationDelay: '0.35s' }}>
          <div className="flex flex-col md:flex-row md:justify-between items-center gap-4 mb-6">
            <div className="flex flex-col">
              <h3 className="text-xl md:text-2xl font-black bg-gradient-to-r from-slate-800 to-slate-500 bg-clip-text text-transparent uppercase tracking-[0.2em] leading-none">ADD NEW</h3>
              <div className="h-1 w-10 bg-gradient-to-r from-slate-800/20 to-transparent rounded-full mt-2"></div>
            </div>
            <div className="p-1 bg-slate-200/50 rounded-2xl flex border border-white relative w-56 h-10 overflow-hidden">
              <motion.div 
                className="absolute top-1 bottom-1 left-1 bg-white rounded-xl shadow-md"
                initial={false}
                animate={{ 
                  x: entryType === TransactionType.EXPENSE ? 0 : '100%',
                  width: 'calc(50% - 4px)'
                }}
                transition={{ type: "spring", stiffness: 400, damping: 35 }}
              />
              <button 
                onClick={() => setEntryType(TransactionType.EXPENSE)} 
                className={`relative z-10 flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${entryType === TransactionType.EXPENSE ? 'text-rose-600' : 'text-slate-400'}`}
              >
                Expense
              </button>
              <button 
                onClick={() => setEntryType(TransactionType.INCOME)} 
                className={`relative z-10 flex-1 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors duration-300 ${entryType === TransactionType.INCOME ? 'text-emerald-600' : 'text-slate-400'}`}
              >
                Income
              </button>
            </div>
          </div>
          <TransactionForm onAdd={handleAddTransaction} initialType={entryType} />
        </div>

        <div className="ios-glass rounded-[2rem] border border-white shadow-2xl overflow-hidden mb-12 animate-ios" style={{ animationDelay: '0.4s' }}>
          <div className="p-6 md:p-8 border-b border-white/40 bg-white/30 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6">
            <div className="flex flex-col md:flex-row flex-1 items-center gap-4">
              <input type="text" placeholder="Search activity..." value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} className="history-search-input flex-1" />
              <div className="ios-glass p-1 rounded-full border border-white shadow-sm flex items-center gap-1">
                {['ALL', 'INCOME', 'EXPENSE'].map(f => (
                  <button key={f} onClick={() => setFilterType(TransactionType[f as keyof typeof TransactionType])} className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${filterType === TransactionType[f as keyof typeof TransactionType] ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>{f}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center p-1 bg-slate-200/30 rounded-2xl border border-white/50 overflow-x-auto scrollbar-hide gap-1">
              {['ALL', '24H', '7D', '30D', '3M', '6M', '1Y', '2Y', '5Y', 'Custom'].map(range => (
                <button key={range} onClick={() => setTimeRange(range)} className={`time-range-btn px-4 py-2.5 rounded-xl text-[9px] font-black uppercase ${timeRange === range ? 'active text-blue-600' : 'text-slate-400'}`}>{range}</button>
              ))}
            </div>
          </div>
          <TransactionList 
            transactions={filteredTxs} 
            onDelete={handleDelete} 
            onEdit={(tx) => setEditingTransaction(tx)}
            currencySymbol="৳" 
            role={currentUser?.role || UserRole.USER} 
          />
        </div>

        {editingTransaction && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-ios">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
              <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest">Edit Entry</h3>
                <button onClick={() => setEditingTransaction(null)} className="p-2 text-slate-400 hover:text-slate-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-1">
                  <label className="smart-label">Description</label>
                  <input 
                    className="smart-input" 
                    value={editingTransaction.description} 
                    onChange={e => setEditingTransaction({...editingTransaction, description: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="smart-label">Amount</label>
                  <input 
                    type="number"
                    className="smart-input" 
                    value={editingTransaction.amount} 
                    onChange={e => setEditingTransaction({...editingTransaction, amount: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="smart-label">Type</label>
                    <select 
                      className="smart-input"
                      value={editingTransaction.type}
                      onChange={e => setEditingTransaction({...editingTransaction, type: e.target.value as TransactionType})}
                    >
                      <option value={TransactionType.INCOME}>Income</option>
                      <option value={TransactionType.EXPENSE}>Expense</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="smart-label">Method</label>
                    <select 
                      className="smart-input"
                      value={editingTransaction.method}
                      onChange={e => setEditingTransaction({...editingTransaction, method: e.target.value as PaymentMethod})}
                    >
                      {Object.values(PaymentMethod).map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <button 
                  onClick={() => handleUpdateTransaction(editingTransaction)}
                  className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 uppercase tracking-widest mt-4"
                >
                  Update Entry
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
