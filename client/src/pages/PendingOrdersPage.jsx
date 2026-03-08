import React from 'react';
import { ListTodo, CheckCircle2, XCircle, Clock, ArrowRight, ExternalLink, Download } from 'lucide-react';

const PendingOrdersPage = () => {
    const pendingOrders = [
        { id: 'ORD-1002', group: 'Retail Clients', symbol: 'NSE:HDFCBANK', exchange: 'NSE', side: 'Buy', type: 'Limit', price: 1640.50, quantity: 250, status: 'Pending' },
        { id: 'ORD-1005', group: 'Scalping Group', symbol: 'NSE:SBIN', exchange: 'NSE', side: 'Sell', type: 'SL-L', price: 785.00, trigger: 782.00, quantity: 1200, status: 'Trigger Pending' },
    ];

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Group Pending Orders</h1>
                    <p className="text-slate-500 mt-1">Monitor and manage orders that are currently waiting for execution.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg border border-slate-700 transition-all text-sm">
                        <Download size={16} />
                        Export to Excel
                    </button>
                    <button className="px-4 py-2 bg-amber-600/10 text-amber-500 hover:bg-amber-600 hover:text-white font-bold rounded-lg border border-amber-500/20 transition-all text-sm uppercase">
                        Convert to Market All
                    </button>
                    <button className="px-4 py-2 bg-rose-600 text-white font-bold rounded-lg shadow-lg shadow-rose-900/20 hover:bg-rose-500 transition-all text-sm uppercase">
                        Cancel All
                    </button>
                </div>
            </header>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-800/50 border-b border-slate-800">
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Order ID</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Group</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Symbol</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Side</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Type</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Price</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Qty</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {pendingOrders.map((order) => (
                            <tr key={order.id} className="hover:bg-slate-800/30 transition-colors group">
                                <td className="px-6 py-4 font-mono font-bold text-indigo-400 text-sm">{order.id}</td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded text-[10px] font-bold uppercase">{order.group}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-white uppercase text-sm">{order.symbol}</span>
                                        <span className="text-[10px] text-slate-500 font-bold uppercase">{order.exchange}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${order.side === 'Buy' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>{order.side}</span>
                                </td>
                                <td className="px-6 py-4 font-bold text-slate-400 text-xs">{order.type}</td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-mono font-bold text-white text-sm">₹{order.price.toFixed(2)}</span>
                                        {order.trigger && <span className="text-[10px] text-slate-500 font-bold">Trg: ₹{order.trigger.toFixed(2)}</span>}
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-mono font-bold text-white text-sm">{order.quantity}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-1.5 text-amber-500 font-bold text-xs">
                                        <Clock size={14} />
                                        {order.status}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="p-2 text-slate-500 hover:text-rose-400 transition-colors">
                                        <XCircle size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PendingOrdersPage;
