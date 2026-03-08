import React, { useState, useEffect } from 'react';
import { Plus, RefreshCcw, ShieldCheck, Trash2, Power, AlertCircle, LayoutGrid, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../supabase';

const DematPage = () => {
    const [accounts, setAccounts] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showPin, setShowPin] = useState(false);
    const [formData, setFormData] = useState({
        broker_name: 'Angel One',
        nickname: '',
        client_id: '',
        api_key: '',
        totp_secret: '',
        mobile: '',
        email: '',
        connect_with_ip: false
    });

    useEffect(() => {
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setLoading(false);
            return;
        }

        const { data, error } = await supabase
            .from('demat_accounts')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching accounts:', error);
        } else {
            setAccounts(data || []);
        }
        setLoading(false);
    };

    const handleAddAccount = async (e) => {
        e.preventDefault();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert('Please log in again.');
            return;
        }

        const { data, error } = await supabase
            .from('demat_accounts')
            .insert([{
                ...formData,
                user_id: user.id,
                status: 'Active',
                expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            }])
            .select();

        if (error) {
            alert('Error adding account: ' + error.message);
        } else {
            setShowModal(false);
            fetchAccounts();
            setFormData({
                broker_name: 'Angel One',
                nickname: '',
                client_id: '',
                api_key: '',
                totp_secret: '',
                mobile: '',
                email: '',
                connect_with_ip: false
            });
        }
    };

    const deleteAccount = async (id) => {
        if (window.confirm('Are you sure you want to delete this account?')) {
            const { error } = await supabase
                .from('demat_accounts')
                .delete()
                .eq('id', id);

            if (error) alert('Error deleting account');
            else fetchAccounts();
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Demat Accounts</h1>
                    <p className="text-slate-500 mt-1">Manage and monitor your connected broker accounts.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg transition-all border border-slate-700">
                        <RefreshCcw size={18} />
                        Relogin All
                    </button>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                    >
                        <Plus size={18} />
                        Add Demat Account
                    </button>
                </div>
            </header>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-800/50 border-b border-slate-800">
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Broker / Nickname</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">With IP</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {loading ? (
                            <tr><td colSpan="4" className="px-6 py-12 text-center text-slate-500 italic">Finding your accounts...</td></tr>
                        ) : accounts.map((acc) => (
                            <tr key={acc.id} className="hover:bg-slate-800/30 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-white uppercase">{acc.broker_name}</span>
                                        <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-tighter">{acc.nickname}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${acc.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                        {acc.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className={`w-2 h-2 rounded-full mx-auto ${acc.connect_with_ip ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-slate-700'}`}></div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="p-2 text-slate-500 hover:text-white transition-colors">
                                            <Power size={18} />
                                        </button>
                                        <button onClick={() => deleteAccount(acc.id)} className="p-2 text-slate-500 hover:text-rose-400 transition-colors">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {!loading && accounts.length === 0 && (
                            <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-500 italic">No accounts linked yet.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">
                        <form onSubmit={handleAddAccount}>
                            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-indigo-600/5">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <ShieldCheck className="text-indigo-400" />
                                    Add Demat Account
                                </h3>
                                <button type="button" onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white transition-colors text-2xl">×</button>
                            </div>
                            <div className="p-6 space-y-6">
                                {/* Top Row: Broker, Nickname, Mobile No, Extra No */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="space-y-1.5">
                                        <select
                                            value={formData.broker_name}
                                            onChange={(e) => setFormData({ ...formData, broker_name: e.target.value })}
                                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-medium text-sm"
                                        >
                                            <option>angelone</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <input
                                            type="text"
                                            value={formData.nickname}
                                            onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                                            placeholder="Enter Nickname"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <input
                                            type="text"
                                            value={formData.mobile}
                                            onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                                            placeholder="Enter Mobile No."
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                                            placeholder="Enter Email"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Second Row: Connect with IP Setting */}
                                <div className="flex items-center gap-8">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1 text-slate-400">
                                            <AlertCircle size={14} />
                                            <span className="text-xs font-medium text-slate-300">Connect with IP?</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, connect_with_ip: !formData.connect_with_ip })}
                                            className={`w-10 h-5 rounded-full relative transition-colors ${formData.connect_with_ip ? 'bg-indigo-600' : 'bg-slate-700'}`}
                                        >
                                            <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${formData.connect_with_ip ? 'left-6' : 'left-1'}`}></div>
                                        </button>
                                    </div>
                                </div>

                                {/* Third Block: Angelone Details */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Enter Angelone Details</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <input
                                            type="text"
                                            value={formData.client_id}
                                            onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                                            placeholder="Angel ID"
                                            maxLength={7}
                                            required
                                        />
                                        <div className="relative group/pin">
                                            <input
                                                type={showPin ? "text" : "password"}
                                                value={formData.password || ''}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg pl-4 pr-10 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                                                placeholder="Angel 4 Digit pin"
                                                maxLength={4}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPin(!showPin)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-400 transition-colors"
                                            >
                                                {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            value={formData.api_key}
                                            onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                                            placeholder="API Key"
                                            required
                                        />
                                        <input
                                            type="text"
                                            value={formData.totp_secret}
                                            onChange={(e) => setFormData({ ...formData, totp_secret: e.target.value })}
                                            className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                                            placeholder="TOTP Key"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-slate-800/20 flex justify-end gap-3 border-t border-slate-800/50">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-6 py-1.5 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-md transition-all text-sm"
                                >
                                    Close
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-1.5 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-md transition-all text-sm"
                                >
                                    Add
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DematPage;
