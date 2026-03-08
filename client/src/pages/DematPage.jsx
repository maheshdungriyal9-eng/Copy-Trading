import React, { useState, useEffect } from 'react';
import {
    Plus,
    RefreshCw,
    ShieldCheck,
    Trash2,
    Power,
    AlertCircle,
    LayoutGrid,
    List,
    Eye,
    EyeOff,
    MoreVertical,
    LogOut,
    Youtube,
    Search,
    ChevronDown,
    ArrowUp,
    CheckCircle2,
    XCircle,
    Clock,
    Calendar,
    Monitor
} from 'lucide-react';
import { supabase } from '../supabase';

const DematAccountCard = ({ acc, onDelete }) => {
    const [showMenu, setShowMenu] = useState(false);
    const [tradingEnabled, setTradingEnabled] = useState(true);
    const [mtlEnabled, setMtlEnabled] = useState(false);

    return (
        <div className="bg-[#1a1f2e] border border-slate-800 rounded-xl p-5 relative group animate-in zoom-in-95 duration-300">
            {/* Header: Status, Name, Date and Top Actions */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                    <div className={`mt-1.5 w-3 h-3 rounded-full ${acc.status === 'Active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-rose-500'}`}></div>
                    <div>
                        <h3 className="text-slate-100 font-bold text-sm truncate max-w-[150px]">{acc.nickname || acc.client_id}</h3>
                        <div className="flex items-center gap-1.5 text-slate-500 mt-1">
                            <Calendar size={12} />
                            <span className="text-[10px] font-medium">{new Date(acc.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1.5">
                    {/* Action Menu Button */}
                    <div className="relative">
                        <button
                            onClick={() => setShowMenu(!showMenu)}
                            className="p-1.5 bg-slate-800/50 hover:bg-slate-700 rounded-md text-slate-300 transition-colors border border-slate-700/50"
                        >
                            <MoreVertical size={16} />
                        </button>

                        {showMenu && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)}></div>
                                <div className="absolute right-0 mt-2 w-48 bg-[#1a1f2e] border border-slate-700/50 rounded-lg shadow-2xl z-20 py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                    <button className="w-full flex items-center gap-3 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
                                        <RefreshCw size={14} className="text-amber-500" />
                                        Reconnect
                                    </button>
                                    <button className="w-full flex items-center gap-3 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
                                        <Calendar size={14} className="text-emerald-500" />
                                        Extend
                                    </button>
                                    <button
                                        onClick={() => { onDelete(acc.id); setShowMenu(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
                                    >
                                        <Trash2 size={14} className="text-rose-500" />
                                        Delete
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    <button className="p-1.5 bg-indigo-500/80 hover:bg-indigo-500 rounded-md text-white transition-colors">
                        <LogOut size={16} />
                    </button>
                    <button className="p-1.5 bg-sky-500 hover:bg-sky-400 rounded-md text-white transition-colors">
                        <Eye size={16} />
                    </button>
                </div>
            </div>

            {/* Trading Toggle & Margin */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Trading</span>
                    <button
                        onClick={() => setTradingEnabled(!tradingEnabled)}
                        className={`w-9 h-4.5 rounded-full relative transition-colors ${tradingEnabled ? 'bg-indigo-600' : 'bg-slate-700'}`}
                    >
                        <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all ${tradingEnabled ? 'left-5' : 'left-0.5'}`}></div>
                    </button>
                </div>
                <div className="text-right">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-2">Margin</span>
                    <span className="text-sm font-bold text-slate-100">0</span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-y-6 gap-x-2 border-t border-slate-800/50 pt-4 mb-6 relative">
                {/* Vertical Divider Line */}
                <div className="absolute left-1/4 top-4 bottom-6 w-[1px] bg-slate-800/50"></div>
                <div className="absolute left-2/4 top-4 bottom-6 w-[1px] bg-slate-800/50"></div>
                <div className="absolute left-3/4 top-4 bottom-6 w-[1px] bg-slate-800/50"></div>

                <div className="text-center">
                    <div className="text-[10px] font-bold text-slate-500 uppercase leading-tight mb-1">In<br />Group</div>
                    <div className="text-sm font-bold text-slate-100">0</div>
                </div>
                <div className="text-center">
                    <div className="text-[10px] font-bold text-slate-500 uppercase leading-tight mb-1">P&L</div>
                    <div className="text-sm font-bold text-emerald-500">0</div>
                </div>
                <div className="text-center">
                    <div className="text-[10px] font-bold text-slate-500 uppercase leading-tight mb-1">POS</div>
                    <div className="text-sm font-bold text-slate-100">0</div>
                </div>
                <div className="text-center">
                    <div className="text-[10px] font-bold text-slate-500 uppercase leading-tight mb-1">Orders</div>
                    <div className="text-sm font-bold text-slate-100">0</div>
                </div>

                <div className="text-center">
                    <div className="text-[9px] font-bold text-slate-500 uppercase mb-1">Pending</div>
                    <div className="text-sm font-bold text-slate-100">0</div>
                </div>
                <div className="text-center">
                    <div className="text-[9px] font-bold text-slate-500 uppercase mb-1">Complete</div>
                    <div className="text-sm font-bold text-slate-100">0</div>
                </div>
                <div className="text-center">
                    <div className="text-[9px] font-bold text-slate-500 uppercase mb-1">Reject</div>
                    <div className="text-sm font-bold text-slate-100">0</div>
                </div>
                <div className="text-center">
                    <div className="text-[9px] font-bold text-slate-500 uppercase mb-1">Cancel</div>
                    <div className="text-sm font-bold text-slate-100">0</div>
                </div>
            </div>

            {/* Bottom Toggles */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-slate-800 rounded border border-slate-700 flex items-center justify-center">
                        <Monitor size={12} className="text-slate-400" />
                    </div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">MTL</span>
                    <button
                        onClick={() => setMtlEnabled(!mtlEnabled)}
                        className={`w-9 h-4.5 rounded-full relative transition-colors ${mtlEnabled ? 'bg-indigo-600' : 'bg-slate-700'}`}
                    >
                        <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all ${mtlEnabled ? 'left-5' : 'left-0.5'}`}></div>
                    </button>
                </div>
            </div>
        </div>
    );
};

const DematPage = () => {
    const [accounts, setAccounts] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showPin, setShowPin] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('grid');
    const [isValidating, setIsValidating] = useState(false);
    const [formData, setFormData] = useState({
        broker_name: 'angelone',
        nickname: '',
        client_id: '',
        api_key: '',
        totp_secret: '',
        password: '',
        mobile: '',
        email: '',
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

        setIsValidating(true);
        try {
            console.log('[Demat] Starting validation for:', formData.client_id);
            const API_BASE_URL = import.meta.env.VITE_API_URL || '';
            const validateRes = await fetch(`${API_BASE_URL}/api/demat/validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_id: formData.client_id,
                    totp_secret: formData.totp_secret,
                    api_key: formData.api_key,
                    password: formData.password
                })
            });

            console.log('[Demat] Validation response status:', validateRes.status);

            if (!validateRes.ok) {
                const errorData = await validateRes.json().catch(() => ({ message: 'Network error or invalid server response' }));
                console.error('[Demat] Validation Failed (HTTP Error):', errorData);
                alert(`Validation Failed: ${errorData.message || 'Server error'}`);
                setIsValidating(false);
                return; // STRICT BLOCK
            }

            const validation = await validateRes.json();
            console.log('[Demat] Validation JSON content:', validation);

            if (!validation.success) {
                console.error('[Demat] Validation Failed (Logic Error):', validation.message);
                alert(`Validation Failed: ${validation.message}`);
                setIsValidating(false);
                return; // STRICT BLOCK
            }

            console.log('[Demat] Validation passed. Proceeding to save to Supabase...');

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
                console.error('[Supabase] Error adding account:', error);
                alert('Error adding account: ' + error.message);
            } else {
                console.log('[Supabase] Account added successfully:', data);
                setShowModal(false);
                fetchAccounts();
                setFormData({
                    broker_name: 'angelone',
                    nickname: '',
                    client_id: '',
                    api_key: '',
                    totp_secret: '',
                    password: '',
                    mobile: '',
                    email: '',
                });
            }
        } catch (err) {
            console.error('[Demat] Unexpected error during validation:', err);
            alert('Error validating credentials. Please try again.');
        } finally {
            setIsValidating(false);
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

    const filteredAccounts = accounts.filter(acc =>
        (acc.nickname || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        acc.client_id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header: Title, Add Button, View Toggles, How to Connect */}
            <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-white tracking-tight">Demat</h1>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-[#0088ff] hover:bg-[#0077ee] text-white font-bold rounded-lg transition-all shadow-lg shadow-sky-500/10 active:scale-95 text-xs whitespace-nowrap"
                    >
                        <Plus size={16} strokeWidth={3} />
                        Add Demat Account
                    </button>
                </div>

                <div className="flex items-center flex-wrap gap-4">
                    {/* View Toggle */}
                    <div className="flex items-center bg-[#1a1f2e] border border-slate-800 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-[#0088ff] text-white' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-[#0088ff] text-white' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <List size={18} />
                        </button>
                    </div>

                    {/* How to Connect */}
                    <a
                        href="#"
                        className="flex items-center gap-2 text-slate-100 hover:text-white transition-colors text-sm font-bold border-b-2 border-slate-700 pb-0.5"
                    >
                        How To Connect
                        <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center">
                            <Youtube size={14} fill="white" className="text-red-600" />
                        </div>
                    </a>

                    {/* Relogin All */}
                    <button className="flex items-center gap-2 px-4 py-2 bg-[#00c853] hover:bg-[#00b24a] text-white font-bold rounded-lg transition-all shadow-lg shadow-emerald-500/10 active:scale-95 text-xs">
                        <LogOut size={16} className="rotate-180" />
                        Relogin All Demat
                    </button>
                </div>
            </header>

            {/* Sub-Header: Search and Filters */}
            <div className="flex flex-col md:flex-row items-center gap-3">
                <div className="relative flex-1 group">
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#1a1f2e] border border-slate-800 rounded-lg pl-4 pr-10 py-2.5 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all text-sm font-medium"
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative group w-full md:w-48">
                        <select className="w-full appearance-none bg-[#1a1f2e] border border-slate-800 rounded-lg px-4 py-2.5 text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all text-sm font-medium cursor-pointer">
                            <option>Sort By</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none group-focus-within:text-sky-500 transition-colors" size={16} />
                    </div>

                    <button className="p-2.5 bg-sky-500 hover:bg-sky-400 text-white rounded-lg transition-colors flex-shrink-0">
                        <ArrowUp size={18} />
                    </button>

                    <button className="p-2.5 bg-[#8e24aa] hover:bg-[#7b1fa2] text-white rounded-lg transition-colors flex-shrink-0">
                        <RefreshCw size={18} />
                    </button>
                </div>
            </div>

            {/* Main Content: Grid or Empty State */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-[340px] bg-[#1a1f2e]/50 border border-slate-800 rounded-xl animate-pulse"></div>
                    ))}
                </div>
            ) : filteredAccounts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredAccounts.map((acc) => (
                        <DematAccountCard key={acc.id} acc={acc} onDelete={deleteAccount} />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-24 bg-[#1a1f2e]/30 border border-slate-800 border-dashed rounded-2xl">
                    <ShieldCheck size={48} className="text-slate-700 mb-4" />
                    <p className="text-slate-500 font-medium">No demat accounts found matching your search.</p>
                </div>
            )}

            {/* Add Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#1a1f2e] border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">
                        <form onSubmit={handleAddAccount}>
                            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-sky-500/5">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Plus className="text-sky-400" strokeWidth={3} />
                                    Add Demat Account
                                </h3>
                                <button type="button" onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white transition-colors text-2xl">×</button>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="space-y-1.5">
                                        <select
                                            value={formData.broker_name}
                                            onChange={(e) => setFormData({ ...formData, broker_name: e.target.value })}
                                            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all font-medium text-sm"
                                        >
                                            <option value="angelone">angelone</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <input
                                            type="text"
                                            value={formData.nickname}
                                            onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                                            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all text-sm"
                                            placeholder="Enter Nickname"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <input
                                            type="text"
                                            value={formData.mobile}
                                            onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                                            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all text-sm"
                                            placeholder="Enter Mobile No."
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all text-sm"
                                            placeholder="Enter Email"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Enter Angelone Details</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <input
                                            type="text"
                                            value={formData.client_id}
                                            onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                                            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all text-sm"
                                            placeholder="Angel ID"
                                            maxLength={7}
                                            required
                                        />
                                        <div className="relative group/pin">
                                            <input
                                                type={showPin ? "text" : "password"}
                                                value={formData.password || ''}
                                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                className="w-full bg-slate-800/50 border border-slate-700 rounded-lg pl-4 pr-10 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all text-sm"
                                                placeholder="Angel 4 Digit pin"
                                                maxLength={4}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPin(!showPin)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-sky-400 transition-colors"
                                            >
                                                {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            value={formData.api_key}
                                            onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                                            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all text-sm"
                                            placeholder="API Key"
                                            required
                                        />
                                        <input
                                            type="text"
                                            value={formData.totp_secret}
                                            onChange={(e) => setFormData({ ...formData, totp_secret: e.target.value })}
                                            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all text-sm"
                                            placeholder="TOTP Key"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-black/20 flex justify-end gap-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-8 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-lg transition-all text-sm"
                                >
                                    Close
                                </button>
                                <button
                                    type="submit"
                                    disabled={isValidating}
                                    className={`px-8 py-2 ${isValidating ? 'bg-slate-700 cursor-not-allowed' : 'bg-sky-500 hover:bg-sky-600'} text-white font-bold rounded-lg transition-all text-sm flex items-center gap-2`}
                                >
                                    {isValidating && <RefreshCw size={14} className="animate-spin" />}
                                    {isValidating ? 'Validating...' : 'Add'}
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
