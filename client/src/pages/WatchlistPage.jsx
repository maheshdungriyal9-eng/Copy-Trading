import React, { useState, useEffect } from 'react';
import { Plus, Zap, Globe, ShieldCheck, MoreVertical, Search, Star, ArrowUpRight, ArrowDownRight, RefreshCcw, Trash2 } from 'lucide-react';
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
                    const API_BASE_URL = import.meta.env.VITE_API_URL;
                    const response = await fetch(`${API_BASE_URL}/api/instruments/search?query=${searchQuery}`);
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
            const token = data.tk || data.token;
            if (token) {
                setPrices(prev => ({
                    ...prev,
                    [token]: {
                        ...prev[token],
                        ...data
                    }
                }));
            }
        });

        return () => {
            socket.off('market_data');
        };
    };

    const fetchWatchlist = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from('watchlist')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching watchlist:', error);
                setLoading(false);
                return;
            }

            setScripts(data || []);

            // Subscribe to all tokens in the watchlist with correct exchange types
            const tokens = (data || []).filter(s => s.symbol_token).map(s => {
                let exchangeType = 1; // NSE Equity
                if (s.exchange === 'NFO') exchangeType = 2;
                else if (s.exchange === 'BSE') exchangeType = 3;
                else if (s.exchange === 'MCX') exchangeType = 5;

                return {
                    exchangeType,
                    tokens: [s.symbol_token]
                };
            });

            if (tokens.length > 0) {
                console.log('Requesting subscription for tokens:', tokens);
                socket.emit('subscribe_symbols', tokens);
            }
        } catch (err) {
            console.error('Unexpected error in fetchWatchlist:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddScript = async (symbol, exchange, token) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                alert('Please login to add scripts');
                return;
            }

            const { error } = await supabase.from('watchlist').insert({
                user_id: user.id,
                symbol,
                exchange,
                symbol_token: token,
                script_type: 'Equity'
            });

            if (error) {
                console.error('Error adding script:', error);
                alert(`Error adding script: ${error.message}`);
                return;
            }

            setSearchQuery('');
            await fetchWatchlist();
            setShowAddModal(false);
        } catch (err) {
            console.error('Unexpected error adding script:', err);
            alert('An unexpected error occurred. Please try again.');
        }
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

            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-800/30 border-b border-slate-800">
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center w-24">Action</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest min-w-[200px]">Symbol</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Last Price</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Change</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Open</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">High</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Low</th>
                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Prev Close</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {loading ? (
                            <tr><td colSpan="8" className="px-6 py-12 text-center text-slate-500 font-bold uppercase tracking-widest italic">Synchronizing Feed...</td></tr>
                        ) : scripts.map((script) => {
                            const data = prices[script.symbol_token] || {};
                            const ltp = data.ltp ? Number(data.ltp) / 100 : 0;
                            const prevClose = data.c ? Number(data.c) / 100 : 0;
                            const open = data.o ? Number(data.o) / 100 : 0;
                            const high = data.h ? Number(data.h) / 100 : 0;
                            const low = data.l ? Number(data.l) / 100 : 0;

                            const change = ltp - prevClose;
                            const changePercent = prevClose ? (change / prevClose) * 100 : 0;
                            const isPositive = change >= 0;

                            return (
                                <tr key={script.id} className="hover:bg-indigo-500/[0.03] transition-all group border-l-2 border-transparent hover:border-indigo-500">
                                    <td className="px-6 py-3">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <button className="w-7 h-7 flex items-center justify-center bg-emerald-600/90 text-white rounded text-[10px] font-black shadow-lg shadow-emerald-500/20 hover:scale-110 transition-transform">B</button>
                                            <button className="w-7 h-7 flex items-center justify-center bg-rose-600/90 text-white rounded text-[10px] font-black shadow-lg shadow-rose-500/20 hover:scale-110 transition-transform">S</button>
                                            <button
                                                onClick={() => handleDeleteScript(script.id)}
                                                className="w-7 h-7 flex items-center justify-center bg-slate-800 text-slate-500 hover:text-rose-400 rounded transition-colors"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight text-sm">
                                                {script.exchange}-{script.symbol}
                                            </span>
                                            <span className="text-[9px] text-slate-600 font-black uppercase tracking-tighter">Equity Segment</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-center">
                                        <div className={`flex flex-col items-center gap-0.5 font-bold text-sm ${isPositive ? 'text-emerald-400' : 'text-rose-500'}`}>
                                            <div className="flex items-center gap-1">
                                                {ltp.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-3 text-center">
                                        <span className={`text-[11px] font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-500'}`}>
                                            {isPositive ? '+' : ''}{change.toFixed(2)} ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-center">
                                        <span className="text-xs font-medium text-slate-300">{open.toFixed(2)}</span>
                                    </td>
                                    <td className="px-6 py-3 text-center">
                                        <span className="text-xs font-medium text-slate-300">{high.toFixed(2)}</span>
                                    </td>
                                    <td className="px-6 py-3 text-center">
                                        <span className="text-xs font-medium text-slate-300">{low.toFixed(2)}</span>
                                    </td>
                                    <td className="px-6 py-3 text-center">
                                        <span className="text-xs font-medium text-slate-500">{prevClose.toFixed(2)}</span>
                                    </td>
                                </tr>
                            );
                        })}
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
