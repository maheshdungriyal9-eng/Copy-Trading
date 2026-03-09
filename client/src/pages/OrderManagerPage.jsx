import React, { useState, useEffect } from 'react';
import { Settings, Zap, Play, Square, RefreshCcw, Search, ChevronDown, Info, AlertCircle, ShieldCheck } from 'lucide-react';
import { supabase } from '../supabase';
import { socket } from '../socket';
import axios from 'axios';

const OrderManagerPage = () => {
    const [groups, setGroups] = useState([]);
    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [orderType, setOrderType] = useState('Market');
    const [buySell, setBuySell] = useState('Buy');
    const [symbol, setSymbol] = useState('NSE:INFY');
    const [exchange, setExchange] = useState('NSE');
    const [product, setProduct] = useState('MIS');
    const [quantity, setQuantity] = useState(1);
    const [price, setPrice] = useState(0);
    const [ltp, setLtp] = useState(0);
    const [loading, setLoading] = useState(false);
    const [executionLogs, setExecutionLogs] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredInstruments, setFilteredInstruments] = useState([]);
    const [searching, setSearching] = useState(false);
    const [selectedInstrument, setSelectedInstrument] = useState(null);

    useEffect(() => {
        fetchGroups();
    }, []);

    useEffect(() => {
        const searchTimer = setTimeout(async () => {
            if (searchQuery.length > 1) {
                setSearching(true);
                try {
                    const API_BASE_URL = import.meta.env.VITE_API_URL || '';
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
        const handleMarketData = (data) => {
            const token = String(data.tk || data.token || data.symboltoken);
            const targetToken = selectedInstrument?.token || '';

            if (token === targetToken) {
                const tickLtp = data.lp || data.last_traded_price || data.ltp;
                if (tickLtp) setLtp(Number(tickLtp) / 100);
            }
        };

        socket.on('market_data', handleMarketData);
        return () => socket.off('market_data', handleMarketData);
    }, [selectedInstrument]);

    const fetchGroups = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: groupsData } = await supabase.from('groups').select('*').eq('user_id', user.id);
        setGroups(groupsData || []);
        if (groupsData && groupsData.length > 0) setSelectedGroupId(groupsData[0].id);
    };

    const handleExecute = async () => {
        if (!selectedGroupId) return alert('Select a group first');

        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
            const response = await axios.post(`${API_URL}/api/orders/execute-group`, {
                userId: user.id,
                groupId: selectedGroupId,
                symbol: selectedInstrument ? selectedInstrument.symbol : symbol,
                tradingsymbol: selectedInstrument ? selectedInstrument.symbol : symbol.split(':')[1] || symbol,
                symboltoken: selectedInstrument ? selectedInstrument.token : '',
                exchange: selectedInstrument ? (selectedInstrument.exch_seg === 'NFO' ? 'NFO' : selectedInstrument.exch_seg) : exchange,
                transactionType: buySell.toUpperCase(),
                orderType: orderType.toUpperCase(),
                productType: product.includes('Intraday') ? 'INTRADAY' : (product.includes('Delivery') ? 'DELIVERY' : 'CARRYFORWARD'),
                quantity,
                price: orderType === 'Market' ? 0 : price
            });

            setExecutionLogs(prev => [{
                id: Date.now(),
                time: new Date().toLocaleTimeString(),
                status: 'Success',
                msg: `Order executed for group. IDs: ${response.data.orderIds.join(', ')}`
            }, ...prev]);

            alert('Orders placed successfully!');
        } catch (error) {
            console.error('Execution error:', error);
            setExecutionLogs(prev => [{
                id: Date.now(),
                time: new Date().toLocaleTimeString(),
                status: 'Error',
                msg: error.response?.data?.error || 'Failed to execute orders'
            }, ...prev]);
        }
        setLoading(false);
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white uppercase tracking-tight">Order Execution Hub</h1>
                    <p className="text-slate-500 mt-1 font-medium italic">Multi-account instant execution engine active.</p>
                </div>
                <div className="flex items-center gap-4 bg-slate-900 border border-slate-800 px-6 py-3 rounded-2xl">
                    <div className="text-right">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Live Feed</p>
                        <p className="text-xl font-black text-emerald-400 font-mono tracking-tighter">₹{ltp.toFixed(2)}</p>
                    </div>
                    <div className="w-[1px] h-8 bg-slate-800 mx-2"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
                        <div className={`absolute top-0 left-0 w-full h-1.5 transition-all duration-500 ${buySell === 'Buy' ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]'}`}></div>

                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-lg font-black text-white flex items-center gap-2 uppercase tracking-tighter">
                                <Zap size={18} className="text-indigo-400" />
                                Execution Entry
                            </h2>
                            <div className="bg-slate-950 rounded-xl p-1 flex border border-slate-800">
                                <button
                                    onClick={() => setBuySell('Buy')}
                                    className={`px-6 py-2 rounded-lg text-xs font-black uppercase transition-all duration-300 ${buySell === 'Buy' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    Buy
                                </button>
                                <button
                                    onClick={() => setBuySell('Sell')}
                                    className={`px-6 py-2 rounded-lg text-xs font-black uppercase transition-all duration-300 ${buySell === 'Sell' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    Sell
                                </button>
                            </div>
                        </div>

                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 space-y-1.5">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Symbol Search</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => {
                                                setSearchQuery(e.target.value);
                                                if (selectedInstrument) setSelectedInstrument(null);
                                            }}
                                            placeholder="E.g. RELIANCE, SBIN..."
                                            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold placeholder:text-slate-600 transition-all font-mono"
                                        />
                                        {searching && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                <RefreshCcw size={14} className="text-indigo-400 animate-spin" />
                                            </div>
                                        )}

                                        {filteredInstruments.length > 0 && !selectedInstrument && (
                                            <div className="absolute top-full left-0 w-full mt-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden z-50 shadow-2xl max-h-48 overflow-y-auto custom-scrollbar">
                                                {filteredInstruments.map(inst => (
                                                    <button
                                                        key={inst.token}
                                                        onClick={() => {
                                                            setSelectedInstrument(inst);
                                                            setSearchQuery(inst.symbol);
                                                            setSymbol(inst.symbol);
                                                            setExchange(inst.exch_seg);
                                                            setFilteredInstruments([]);
                                                        }}
                                                        className="w-full px-4 py-3 text-left hover:bg-slate-800 flex items-center justify-between group border-b border-slate-800/50 last:border-0"
                                                    >
                                                        <div>
                                                            <p className="text-sm font-bold text-white group-hover:text-indigo-400">{inst.symbol}</p>
                                                            <p className="text-[10px] text-slate-500 font-bold uppercase">{inst.exch_seg} | {inst.instrumenttype}</p>
                                                        </div>
                                                        <span className="text-[9px] font-black text-slate-600">TOKEN: {inst.token}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {selectedInstrument && (
                                        <div className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-indigo-600/10 border border-indigo-500/20 rounded-lg max-w-max">
                                            <ShieldCheck size={12} className="text-indigo-400" />
                                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">Verified Node: {selectedInstrument.token}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Exchange</label>
                                    <select
                                        value={exchange}
                                        onChange={(e) => setExchange(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none font-bold appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:20px] bg-[right_12px_center] bg-no-repeat"
                                    >
                                        <option>NSE</option>
                                        <option>BSE</option>
                                        <option>NFO</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Product</label>
                                    <select
                                        value={product}
                                        onChange={(e) => setProduct(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none font-bold appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:20px] bg-[right_12px_center] bg-no-repeat"
                                    >
                                        <option>MIS (Intraday)</option>
                                        <option>NRML</option>
                                        <option>CNC (Delivery)</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Order Type</label>
                                    <select
                                        value={orderType}
                                        onChange={(e) => setOrderType(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none font-bold appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%2364748B%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:20px] bg-[right_12px_center] bg-no-repeat"
                                    >
                                        <option>Market</option>
                                        <option>Limit</option>
                                        <option>SL-M</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Quantity</label>
                                    <input
                                        type="number"
                                        value={quantity}
                                        onChange={(e) => setQuantity(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none font-bold font-mono"
                                    />
                                </div>
                            </div>

                            {orderType === 'Limit' && (
                                <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Limit Price</label>
                                    <input
                                        type="number"
                                        step="0.05"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none font-bold font-mono"
                                    />
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Target Cluster</label>
                                <select
                                    value={selectedGroupId}
                                    onChange={(e) => setSelectedGroupId(e.target.value)}
                                    className="w-full bg-indigo-600/10 border border-indigo-500/30 rounded-xl px-4 py-3.5 text-indigo-400 focus:outline-none font-black text-xs uppercase tracking-widest appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207.5L10%2012.5L15%207.5%22%20stroke%3D%22%236366F1%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:18px] bg-[right_16px_center] bg-no-repeat"
                                >
                                    {groups.map(g => (
                                        <option key={g.id} value={g.id}>{g.group_name}</option>
                                    ))}
                                    {groups.length === 0 && <option>No Groups Found</option>}
                                </select>
                            </div>

                            <div className="pt-4">
                                <button
                                    disabled={loading || groups.length === 0}
                                    onClick={handleExecute}
                                    className={`w-full py-4 rounded-2xl text-white font-black text-sm uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 ${buySell === 'Buy' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40' : 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/40'}`}
                                >
                                    {loading ? (
                                        <RefreshCcw size={20} className="animate-spin" />
                                    ) : (
                                        <>
                                            <Play size={18} fill="currentColor" />
                                            Execute {buySell} Cluster
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900/50 border border-slate-800 p-5 rounded-2xl flex items-start gap-4 backdrop-blur-sm">
                        <Info size={20} className="text-indigo-400 mt-1 shrink-0" />
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Execution Protocol</p>
                            <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                Orders are distributed via ultra-low latency WebSocket clusters. Multiplier logic is applied per account.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[600px]">
                        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/30">
                            <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                Live Execution Queue
                            </h2>
                            <button className="p-2 text-slate-500 hover:text-white transition-colors bg-slate-800 rounded-lg"><RefreshCcw size={16} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {executionLogs.map(log => (
                                <div key={log.id} className={`p-4 rounded-xl border flex items-start gap-4 animate-in slide-in-from-right-4 duration-300 ${log.status === 'Success' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
                                    <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${log.status === 'Success' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${log.status === 'Success' ? 'text-emerald-400' : 'text-rose-400'}`}>{log.status}</span>
                                            <span className="text-[10px] text-slate-600 font-bold">{log.time}</span>
                                        </div>
                                        <p className="text-xs text-slate-300 font-medium font-mono break-all">{log.msg}</p>
                                    </div>
                                </div>
                            ))}
                            {executionLogs.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-30 grayscale">
                                    <Play size={64} className="text-slate-700" />
                                    <div>
                                        <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">Awaiting Command</h3>
                                        <p className="text-xs text-slate-500 max-w-xs mx-auto mt-2 font-bold uppercase">System initialized and ready for deployment.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center justify-between group hover:border-emerald-500/50 transition-all cursor-default">
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Engine Health</p>
                                <p className="text-2xl font-black text-white">OPTIMAL</p>
                            </div>
                            <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500">
                                <ShieldCheck size={32} />
                            </div>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex items-center justify-between group hover:border-indigo-500/50 transition-all cursor-default">
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Latency (Cluster)</p>
                                <p className="text-2xl font-black text-white">42ms</p>
                            </div>
                            <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-500">
                                <Zap size={32} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderManagerPage;
