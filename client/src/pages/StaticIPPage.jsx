import React, { useState, useEffect } from 'react';
import { ShieldCheck, Plus, Zap, Globe, MoreVertical, Trash2, Edit3, Clock, RefreshCcw } from 'lucide-react';
import { supabase } from '../supabase';

const StaticIPPage = () => {
    const [ips, setIps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        fetchIps();
    }, []);

    const fetchIps = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('static_ips')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error) setIps(data || []);
        setLoading(false);
    };

    const handlePurchase = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('static_ips').insert({
            user_id: user?.id,
            ip_address: `182.16.45.${Math.floor(Math.random() * 255)}`,
            ip_type: 'IPv4',
            auto_renew: true,
            expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });
        fetchIps();
        setShowModal(false);
    };

    const handleDelete = async (id) => {
        await supabase.from('static_ips').delete().eq('id', id);
        fetchIps();
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white uppercase tracking-tight">IP Infrastructure</h1>
                    <p className="text-slate-500 mt-1 font-medium font-mono text-xs uppercase tracking-widest italic">Dedicated whitelisting array active.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchIps}
                        className="p-2.5 bg-slate-900 border border-slate-800 text-slate-500 hover:text-indigo-400 rounded-xl transition-all"
                    >
                        <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                    >
                        <Plus size={18} />
                        Purchase IP
                    </button>
                </div>
            </header>

            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-800/30 border-b border-slate-800">
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Identify</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">IP Address</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Type</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {loading ? (
                            <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-500 font-bold uppercase tracking-widest italic">Scanning Network...</td></tr>
                        ) : ips.map((ip) => (
                            <tr key={ip.id} className="hover:bg-white/[0.02] transition-all group">
                                <td className="px-6 py-4 font-mono font-black text-indigo-400 text-xs">#{ip.id.slice(0, 8)}</td>
                                <td className="px-6 py-4">
                                    <span className="font-mono text-white text-sm break-all font-black">{ip.ip_address}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 bg-slate-950 border border-slate-800 text-[10px] text-slate-500 rounded-lg font-black uppercase tracking-widest">{ip.ip_type}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${ip.status === 'active' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {ip.status}
                                        </span>
                                        <span className="text-[10px] text-slate-600 font-bold font-mono">EXP: {new Date(ip.expiry_date).toLocaleDateString()}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-3 translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
                                        <button className="p-2 text-slate-600 hover:text-indigo-400 transition-colors bg-slate-800 rounded-lg"><Edit3 size={18} /></button>
                                        <button onClick={() => handleDelete(ip.id)} className="p-2 text-slate-600 hover:text-rose-500 transition-colors bg-slate-800 rounded-lg"><Trash2 size={18} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {!loading && ips.length === 0 && (
                    <div className="p-20 text-center opacity-30 flex flex-col items-center grayscale">
                        <Globe size={48} className="text-slate-600 mb-4" />
                        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Infrastructure offline - Deploy static IPs for whitelisting</p>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden ring-1 ring-white/10">
                        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-800/30">
                            <h3 className="text-lg font-black text-white uppercase tracking-widest">IP Acquisition</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white transition-colors">
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </div>
                        <div className="p-8 space-y-8">
                            <div className="p-6 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl text-center shadow-inner">
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Standard Rate</p>
                                <h4 className="text-4xl font-black text-white tracking-tighter">₹400<span className="text-xs font-medium text-slate-500 ml-1">/ IP / Mo</span></h4>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Network Protocol</span>
                                        <span className="text-xs font-black text-white">IPv4 DEDICATED</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Initial Term</span>
                                        <span className="text-xs font-black text-white">30 DAYS</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between pt-4 px-1">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Investment</span>
                                    <span className="text-2xl font-black text-emerald-400 tracking-tighter">₹400.00</span>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 bg-slate-800/30 border-t border-slate-800 flex gap-4">
                            <button onClick={() => setShowModal(false)} className="flex-1 py-3.5 bg-slate-950 text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all border border-slate-800">Abort</button>
                            <button onClick={handlePurchase} className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95">Confirm</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaticIPPage;
