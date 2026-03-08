import React, { useState, useEffect } from 'react';
import { History, CheckCircle2, XCircle, Search, Download, Calendar, Filter, RefreshCcw } from 'lucide-react';
import { supabase } from '../supabase';

const OrderHistoryPage = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('order_history')
                .select(`
                    *,
                    groups (group_name),
                    demat_accounts (nickname)
                `)
                .eq('user_id', user.id)
                .order('executed_at', { ascending: false });

            if (!error) setHistory(data || []);
        } catch (err) {
            console.error('Fetch history error:', err);
        } finally {
            setLoading(false);
        }
    };

    const syncWithBroker = async () => {
        setSyncing(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const API_BASE_URL = import.meta.env.VITE_API_URL;
            const response = await fetch(`${API_BASE_URL}/api/orders/tradebook?user_id=${user.id}`);
            const result = await response.json();

            if (result.status && result.data) {
                const { data: existing } = await supabase
                    .from('order_history')
                    .select('broker_order_id')
                    .eq('user_id', user.id);

                const existingIds = new Set(existing?.map(e => e.broker_order_id) || []);

                const { data: accounts } = await supabase
                    .from('demat_accounts')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('broker_name', 'angelone')
                    .limit(1);

                if (!accounts?.[0]) return alert('No Angel One account found to sync.');
                const accountId = accounts[0].id;

                const newTrades = result.data.filter(t => !existingIds.has(t.orderid));

                if (newTrades.length > 0) {
                    const inserts = newTrades.map(t => ({
                        user_id: user.id,
                        symbol: `${t.exchange}:${t.tradingsymbol}`,
                        buy_sell: t.transactiontype,
                        quantity: parseInt(t.fillsize),
                        price: parseFloat(t.fillprice),
                        status: 'Success',
                        broker_order_id: t.orderid,
                        executed_at: new Date().toISOString(),
                        demat_account_id: accountId
                    }));

                    const { error } = await supabase.from('order_history').insert(inserts);
                    if (error) throw error;
                    alert(`Successfully synced ${newTrades.length} new trades from broker.`);
                    fetchHistory();
                } else {
                    alert('Your history is already up to date.');
                }
            } else {
                alert('No trade data received from broker.');
            }
        } catch (err) {
            console.error('Sync error:', err);
            alert('Failed to sync history: ' + err.message);
        } finally {
            setSyncing(false);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Order History</h1>
                    <p className="text-slate-500 mt-1 font-medium">Review all your past trade executions across clustered accounts.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={syncWithBroker}
                        disabled={syncing}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                    >
                        <RefreshCcw size={14} className={syncing ? 'animate-spin' : ''} />
                        {syncing ? 'Syncing...' : 'Sync with Broker'}
                    </button>
                    <button
                        onClick={fetchHistory}
                        className="p-2 bg-slate-800 text-slate-400 rounded-lg border border-slate-700 hover:text-white transition-colors"
                    >
                        <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input type="text" placeholder="Search orders..." className="bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                    </div>
                </div>
            </header>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-800/50 border-b border-slate-800">
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Broker ID</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Symbol / Group</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Side</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Price</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Qty</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Executed At</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {loading ? (
                            <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-500 font-bold uppercase tracking-widest">Loading Records...</td></tr>
                        ) : history.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                                <td className="px-6 py-4 font-mono font-bold text-indigo-400 text-xs">
                                    {item.broker_order_id || 'N/A'}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-white text-sm uppercase">{item.symbol}</span>
                                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">
                                            {item.groups?.group_name || 'Individual'} • {item.demat_accounts?.nickname}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${item.buy_sell === 'BUY' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                        {item.buy_sell}
                                    </span>
                                </td>
                                <td className="px-6 py-4 font-mono font-bold text-white text-sm">₹{Number(item.price).toFixed(2)}</td>
                                <td className="px-6 py-4 font-mono font-bold text-white text-sm">{item.quantity}</td>
                                <td className="px-6 py-4">
                                    <div className={`flex items-center gap-1.5 font-black text-[10px] uppercase ${item.status === 'Success' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                        {item.status === 'Success' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                        {item.status}
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-mono text-[10px] text-slate-500">
                                    {new Date(item.executed_at).toLocaleString()}
                                </td>
                            </tr>
                        ))}
                        {!loading && history.length === 0 && (
                            <tr><td colSpan="7" className="px-6 py-12 text-center text-slate-600 font-black uppercase tracking-widest italic">No orders found in history</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default OrderHistoryPage;
