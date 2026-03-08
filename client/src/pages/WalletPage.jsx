import React from 'react';
import { Wallet, ArrowUpCircle, ArrowDownCircle, CreditCard, History, Plus } from 'lucide-react';

const WalletPage = () => {
    const transactions = [
        { id: 'TXN-4051', type: 'Debit', amount: 400.00, desc: 'Static IP Purchase (IP-9021)', date: '2026-03-05' },
        { id: 'TXN-4050', type: 'Credit', amount: 1000.00, desc: 'Wallet Recharge - UPI', date: '2026-03-05' },
        { id: 'TXN-4048', type: 'Debit', amount: 450.00, desc: 'Demat Subscription Renewal', date: '2026-03-01' },
    ];

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header>
                <h1 className="text-3xl font-bold text-white">Wallet & Billing</h1>
                <p className="text-slate-500 mt-1">Manage your platform credits and subscription payments.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1 space-y-6">
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 rounded-3xl shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-700">
                            <Wallet size={120} />
                        </div>
                        <p className="text-indigo-100 font-bold opacity-80 uppercase tracking-widest text-xs mb-2">Available Credits</p>
                        <h2 className="text-5xl font-black text-white mb-8 tracking-tighter">₹150.00</h2>
                        <button className="w-full py-4 bg-white text-indigo-600 font-black rounded-2xl shadow-xl hover:scale-[1.02] transition-all active:scale-95 flex items-center justify-center gap-2">
                            <Plus size={20} />
                            Recharge Now
                        </button>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <CreditCard size={16} className="text-indigo-400" />
                            Quick Actions
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                            <button className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors group">
                                <span className="text-sm font-bold text-slate-300">Set Auto-Recharge</span>
                                <div className="w-10 h-5 bg-slate-700 rounded-full relative">
                                    <div className="absolute left-1 top-1 w-3 h-3 bg-slate-500 rounded-full"></div>
                                </div>
                            </button>
                            <button className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition-colors group">
                                <span className="text-sm font-bold text-slate-300">Download Invoices</span>
                                <History size={16} className="text-slate-500 group-hover:text-white transition-colors" />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="md:col-span-2">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl h-full">
                        <div className="px-6 py-5 border-b border-slate-800">
                            <h3 className="text-lg font-bold text-white">Recent Transactions</h3>
                        </div>
                        <div className="divide-y divide-slate-800">
                            {transactions.map((txn) => (
                                <div key={txn.id} className="p-6 flex items-center justify-between hover:bg-slate-800/20 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-xl ${txn.type === 'Credit' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                            {txn.type === 'Credit' ? <ArrowUpCircle size={24} /> : <ArrowDownCircle size={24} />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-white text-sm">{txn.desc}</p>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{txn.id} • {txn.date}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-lg font-black ${txn.type === 'Credit' ? 'text-emerald-500' : 'text-white'}`}>
                                            {txn.type === 'Credit' ? '+' : '-'} ₹{txn.amount.toFixed(2)}
                                        </p>
                                        <p className="text-[10px] font-bold text-slate-600 uppercase">Successful</p>
                                    </div>
                                </div>
                            ))}
                            {transactions.length === 0 && (
                                <div className="p-12 text-center text-slate-500">
                                    <History size={48} className="mx-auto mb-4 opacity-20" />
                                    <p>No transactions found in your history.</p>
                                </div>
                            )}
                        </div>
                        <div className="p-6 border-t border-slate-800 text-center">
                            <button className="text-sm font-bold text-indigo-400 hover:text-indigo-300 transition-colors">View All Transactions</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WalletPage;
