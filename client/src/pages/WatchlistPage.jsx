import React, { useState, useEffect } from 'react';
import { Plus, Zap, Globe, ShieldCheck, MoreVertical, Search, Star, ArrowUpRight, ArrowDownRight, RefreshCcw } from 'lucide-react';
import { supabase } from '../supabase';
import { socket } from '../socket';

const WatchlistPage = () => {
    const [scripts, setScripts] = useState([]);
    const [prices, setPrices] = useState({});
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [filteredInstruments, setFilteredInstruments] = useState([]);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        const searchTimer = setTimeout(async () => {
            if (searchQuery.length > 1) {
                setSearching(true);
                try {
                    const response = await fetch(`http://localhost:5000/api/instruments/search?query=${searchQuery}`);
                    const data = await response.json();
                    setFilteredInstruments(data);
                } catch (error) {
                    console.error('Search failed:', error);
                } finally {
                    setSearching(false);
                }
            } else {
                setFilteredInstruments([]);
            }
        }, 300);

        return () => clearTimeout(searchTimer);
    }, [searchQuery]);

    useEffect(() => {
        fetchWatchlist();
        setupSocket();
    }, []);

    const setupSocket = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            socket.emit('init_market_data', user.id);
        }

        socket.on('market_data', (data) => {
            if (data && data.token) {
                setPrices(prev => ({
                    ...prev,
                    [data.token]: data.last_traded_price / 100 // Angel One gives price in paise
                }));
            }
        });

        return () => {
            socket.off('market_data');
        };
    };

    const fetchWatchlist = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        const { data, error } = await supabase
            .from('watchlist')
            .select('*')
            .eq('user_id', user?.id)
            .order('created_at', { ascending: false });

        if (!error) {
            setScripts(data || []);
            // Subscribe to all tokens in the watchlist
            const tokens = data.filter(s => s.symbol_token).map(s => ({
                exchangeType: s.exchange === 'NFO' ? 2 : 1, // 1 for NSE, 2 for NFO
                tokens: [s.symbol_token]
            }));
            if (tokens.length > 0) {
                socket.emit('subscribe_symbols', tokens);
            }
        }
        setLoading(false);
    };

    const handleAddScript = async (symbol, exchange, token) => {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from('watchlist').insert({
            user_id: user?.id,
            symbol,
            exchange,
            symbol_token: token,
            script_type: 'Equity'
        });
        setSearchQuery('');
        fetchWatchlist();
        setShowAddModal(false);
    };

    const handleDeleteScript = async (id) => {
        await supabase.from('watchlist').delete().eq('id', id);
        fetchWatchlist();
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col md:items-center md:flex-row justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white uppercase tracking-tight">Market Analytics</h1>
                    <p className="text-slate-500 mt-1 font-medium font-mono text-xs uppercase tracking-widest italic">Live institutional data feed active.</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                        onClick={fetchWatchlist}
                        className="p-2.5 bg-slate-900 border border-slate-800 text-slate-500 hover:text-indigo-400 rounded-xl transition-all"
                    >
                        <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95 whitespace-nowrap"
                    >
                        <Plus size={18} />
                        Add Scripts
                    </button>
                </div>
            </header>

            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-800/30 border-b border-slate-800">
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Symbol</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Last Price</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Type</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Exchange</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {loading ? (
                            <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-500 font-bold uppercase tracking-widest italic">Synchronizing Feed...</td></tr>
                        ) : scripts.map((script) => (
                            <tr key={script.id} className="hover:bg-white/[0.02] transition-all group">
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-black text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight text-sm">{script.symbol}</span>
                                        <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest font-mono">Real-time</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`font-mono font-black text-sm transition-colors duration-300 ${prices[script.symbol_token] ? 'text-emerald-400' : 'text-slate-600'}`}>
                                        ₹{prices[script.symbol_token]?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-1 bg-slate-950 border border-slate-800 text-[10px] text-slate-500 rounded-lg font-black uppercase tracking-widest">{script.script_type || 'EQUITY'}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{script.exchange}</span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-3 translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
                                        <button className="px-4 py-1.5 bg-emerald-600/10 text-emerald-500 hover:bg-emerald-600 hover:text-white rounded-lg transition-all font-black text-[10px] uppercase tracking-widest">Buy</button>
                                        <button className="px-4 py-1.5 bg-rose-600/10 text-rose-500 hover:bg-rose-600 hover:text-white rounded-lg transition-all font-black text-[10px] uppercase tracking-widest">Sell</button>
                                        <button onClick={() => handleDeleteScript(script.id)} className="p-2 text-slate-600 hover:text-rose-500 transition-colors bg-slate-800 rounded-lg">×</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {!loading && scripts.length === 0 && (
                    <div className="p-20 text-center opacity-30 flex flex-col items-center grayscale">
                        <Star size={48} className="text-slate-600 mb-4" />
                        <p className="text-xs font-black uppercase tracking-widest text-slate-500">Your tracking hub is empty - Deploy new scripts to begin</p>
                    </div>
                )}
            </div>

            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden ring-1 ring-white/10">
                        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-800/30">
                            <h3 className="text-lg font-black text-white uppercase tracking-widest">Script Deployment</h3>
                            <button onClick={() => { setShowAddModal(false); setSearchQuery(''); }} className="text-slate-500 hover:text-white transition-colors">
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Symbol Identification</label>
                                <div className="relative">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-12 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-black placeholder:text-slate-700"
                                        placeholder="Search symbol (e.g. SBIN, RELIANCE)..."
                                        autoFocus
                                    />
                                    {searching && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                            <RefreshCcw size={16} className="text-indigo-500 animate-spin" />
                                        </div>
                                    )}
                                </div>

                                {filteredInstruments.length > 0 && (
                                    <div className="mt-4 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden max-h-48 overflow-y-auto">
                                        {filteredInstruments.map((inst) => (
                                            <button
                                                key={inst.token}
                                                onClick={() => handleAddScript(inst.symbol, inst.exch_seg, inst.token)}
                                                className="w-full px-6 py-3 text-left hover:bg-indigo-600/10 flex items-center justify-between group transition-colors border-b border-slate-800 last:border-0"
                                            >
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-white group-hover:text-indigo-400 uppercase tracking-tight">{inst.symbol}</span>
                                                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{inst.exch_seg} | {inst.instrumenttype}</span>
                                                </div>
                                                <div className="text-[10px] font-black text-slate-600 bg-slate-900 px-2 py-1 rounded-md">Token: {inst.token}</div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl">
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Deployment Tip</p>
                                <p className="text-xs text-slate-500 font-medium italic">Selecting a symbol will instantly link it to your live tracking matrix.</p>
                            </div>
                        </div>
                        <div className="p-6 bg-slate-800/30 border-t border-slate-800 flex justify-end gap-3">
                            <button onClick={() => { setShowAddModal(false); setSearchQuery(''); }} className="px-10 py-3 bg-slate-950 text-slate-300 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all border border-slate-800">Dismiss</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WatchlistPage;
