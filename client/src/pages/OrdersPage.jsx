import React, { useState, useEffect } from 'react';
import { RefreshCcw, Search, Trash2, Clock, CheckCircle2, XCircle, AlertCircle, ExternalLink, Filter } from 'lucide-react';
import { supabase } from '../supabase';

const OrdersPage = () => {
    const [activeTab, setActiveTab] = useState('orders'); // orders, gtt, trades
    const [orders, setOrders] = useState([]);
    const [gttRules, setGttRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setRefreshing(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const API_BASE_URL = import.meta.env.VITE_API_URL;

            if (activeTab === 'orders') {
                const response = await fetch(`${API_BASE_URL}/api/orders/book?user_id=${user.id}`);
                const result = await response.json();
                if (result.status) setOrders(result.data || []);
            } else if (activeTab === 'gtt') {
                const response = await fetch(`${API_BASE_URL}/api/gtt/list?user_id=${user.id}`);
                const result = await response.json();
                if (result.status) setGttRules(result.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch orders/gtt:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleCancelOrder = async (orderid) => {
        if (!window.confirm('Are you sure you want to cancel this order?')) return;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const API_BASE_URL = import.meta.env.VITE_API_URL;
            const response = await fetch(`${API_BASE_URL}/api/orders/cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user.id, orderid })
            });
            const result = await response.json();
            if (result.status) {
                alert('Order Cancelled Successfully');
                fetchData();
            } else {
                alert('Cancel Failed: ' + result.message);
            }
        } catch (error) {
            alert('Error: ' + error.message);
        }
    };

    const handleCancelGTT = async (rule) => {
        if (!window.confirm('Are you sure you want to cancel this GTT rule?')) return;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const API_BASE_URL = import.meta.env.VITE_API_URL;
            const response = await fetch(`${API_BASE_URL}/api/gtt/cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id,
                    id: rule.id,
                    symboltoken: rule.symboltoken,
                    exchange: rule.exchange
                })
            });
            const result = await response.json();
            if (result.status) {
                alert('GTT Rule Cancelled Successfully');
                fetchData();
            } else {
                alert('Cancel Failed: ' + result.message);
            }
        } catch (error) {
            alert('Error: ' + error.message);
        }
    };

    const StatusBadge = ({ status }) => {
        const s = status?.toLowerCase();
        if (s === 'complete' || s === 'success' || s === 'active')
            return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20"><CheckCircle2 size={12} /> {status}</span>;
        if (s === 'rejected' || s === 'failed' || s === 'cancelled')
            return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-widest border border-rose-500/20"><XCircle size={12} /> {status}</span>;
        return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest border border-indigo-500/20"><Clock size={12} /> {status}</span>;
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col md:items-center md:flex-row justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white uppercase tracking-tight">Order Management</h1>
                    <p className="text-slate-500 mt-1 font-medium font-mono text-xs uppercase tracking-widest italic">Trade execution & trigger tracking.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchData}
                        className="p-2.5 bg-slate-900 border border-slate-800 text-slate-500 hover:text-indigo-400 rounded-xl transition-all"
                    >
                        <RefreshCcw size={20} className={refreshing ? 'animate-spin' : ''} />
                    </button>
                    <div className="flex p-1 bg-slate-900 rounded-xl border border-slate-800">
                        {['orders', 'gtt'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                {tab === 'orders' ? 'Order Book' : 'GTT Rules'}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-800/30 border-b border-slate-800">
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Time</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Instrument</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Type</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Qty</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Price</th>
                            {activeTab === 'gtt' && <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Trigger</th>}
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center w-24">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {loading ? (
                            <tr><td colSpan="8" className="px-6 py-12 text-center text-slate-500 font-bold uppercase tracking-widest italic">Fetching Ledger...</td></tr>
                        ) : activeTab === 'orders' ? (
                            orders.length === 0 ? (
                                <tr><td colSpan="8" className="px-6 py-12 text-center text-slate-500 font-bold uppercase tracking-widest italic opacity-30">No executions found today.</td></tr>
                            ) : orders.map((order) => (
                                <tr key={order.orderid} className="hover:bg-slate-800/30 transition-all group">
                                    <td className="px-6 py-4 text-xs font-medium text-slate-500">{order.updatetime || 'N/A'}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-white uppercase tracking-tight">{order.tradingsymbol}</span>
                                            <span className="text-[9px] text-slate-600 font-black uppercase tracking-tighter">{order.exchange} | {order.producttype}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${order.transactiontype === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {order.transactiontype} {order.ordertype}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center text-xs font-bold text-slate-300">{order.filledshares}/{order.quantity}</td>
                                    <td className="px-6 py-4 text-center text-xs font-bold text-indigo-400">₹{order.price}</td>
                                    <td className="px-6 py-4 text-center"><StatusBadge status={order.status} /></td>
                                    <td className="px-6 py-4 text-center">
                                        {(order.status === 'open' || order.status === 'validation pending') && (
                                            <button
                                                onClick={() => handleCancelOrder(order.orderid)}
                                                className="p-2 bg-slate-800 text-slate-500 hover:text-rose-400 rounded transition-colors"
                                            >
                                                <XCircle size={16} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            gttRules.length === 0 ? (
                                <tr><td colSpan="9" className="px-6 py-12 text-center text-slate-500 font-bold uppercase tracking-widest italic opacity-30">No active GTT rules found.</td></tr>
                            ) : gttRules.map((rule) => (
                                <tr key={rule.id} className="hover:bg-slate-800/30 transition-all group">
                                    <td className="px-6 py-4 text-xs font-medium text-slate-500">{rule.createddate?.split('T')[0]}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-white uppercase tracking-tight">{rule.tradingsymbol}</span>
                                            <span className="text-[9px] text-slate-600 font-black uppercase tracking-tighter">{rule.exchange} | {rule.producttype}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${rule.transactiontype === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {rule.transactiontype} GTT
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center text-xs font-bold text-slate-300">{rule.qty}</td>
                                    <td className="px-6 py-4 text-center text-xs font-bold text-indigo-400">₹{rule.price}</td>
                                    <td className="px-6 py-4 text-center text-xs font-bold text-amber-400">₹{rule.triggerprice}</td>
                                    <td className="px-6 py-4 text-center"><StatusBadge status={rule.status} /></td>
                                    <td className="px-6 py-4 text-center">
                                        {rule.status === 'NEW' && (
                                            <button
                                                onClick={() => handleCancelGTT(rule)}
                                                className="p-2 bg-slate-800 text-slate-500 hover:text-rose-400 rounded transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="bg-indigo-600/5 border border-indigo-500/20 rounded-2xl p-6 flex items-start gap-4">
                <AlertCircle className="text-indigo-400 shrink-0 mt-0.5" size={20} />
                <div className="space-y-1">
                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Static IP Policy Reminder</h4>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed italic">
                        All GTT and Live Order requests are validated against your account's registered static IP. Mismatches will result in rejection by Angel One.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default OrdersPage;
