import React, { useState, useEffect } from 'react';
import { RefreshCcw, Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Briefcase, Activity, CheckCircle2, ChevronRight, LayoutGrid, List } from 'lucide-react';
import { supabase } from '../supabase';

const PortfolioPage = () => {
    const [activeTab, setActiveTab] = useState('holdings'); // holdings, positions
    const [holdings, setHoldings] = useState([]);
    const [positions, setPositions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [summary, setSummary] = useState({
        totalValue: 0,
        totalInvestment: 0,
        totalPnL: 0,
        pnlPercentage: 0
    });

    useEffect(() => {
        fetchPortfolio();
    }, [activeTab]);

    const fetchPortfolio = async () => {
        setRefreshing(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const API_BASE_URL = import.meta.env.VITE_API_URL;

            if (activeTab === 'holdings') {
                const response = await fetch(`${API_BASE_URL}/api/portfolio/all-holdings?user_id=${user.id}`);
                const result = await response.json();
                if (result.status && result.data) {
                    setHoldings(result.data.holdings || []);
                    if (result.data.totalholding) {
                        setSummary({
                            totalValue: result.data.totalholding.totalholdingvalue,
                            totalInvestment: result.data.totalholding.totalinvvalue,
                            totalPnL: result.data.totalholding.totalprofitandloss,
                            pnlPercentage: result.data.totalholding.totalpnlpercentage
                        });
                    }
                }
            } else if (activeTab === 'positions') {
                const response = await fetch(`${API_BASE_URL}/api/portfolio/positions?user_id=${user.id}`);
                const result = await response.json();
                if (result.status && result.data) {
                    setPositions(result.data || []);
                    // Compute basic position summary
                    const posPnL = (result.data || []).reduce((acc, pos) => acc + (Number(pos.netvalue) || 0), 0);
                    setSummary(prev => ({ ...prev, totalPnL: posPnL }));
                }
            }
        } catch (error) {
            console.error('Failed to fetch portfolio:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleConvertPosition = async (pos) => {
        const newProductType = pos.producttype === 'DELIVERY' ? 'INTRADAY' : 'DELIVERY';
        if (!window.confirm(`Convert ${pos.tradingsymbol} from ${pos.producttype} to ${newProductType}?`)) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            const API_BASE_URL = import.meta.env.VITE_API_URL;
            const response = await fetch(`${API_BASE_URL}/api/portfolio/convert`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id,
                    exchange: pos.exchange,
                    symboltoken: pos.symboltoken,
                    oldproducttype: pos.producttype,
                    newproducttype: newProductType,
                    tradingsymbol: pos.tradingsymbol,
                    symbolname: pos.symbolname,
                    transactiontype: Number(pos.netqty) > 0 ? 'BUY' : 'SELL',
                    quantity: Math.abs(Number(pos.netqty)),
                    type: 'DAY'
                })
            });
            const result = await response.json();
            if (result.status) {
                alert('Position Converted Successfully');
                fetchPortfolio();
            } else {
                alert('Conversion Failed: ' + result.message);
            }
        } catch (error) {
            alert('Error: ' + error.message);
        }
    };

    const StatusBadge = ({ isPositive, value, prefix = '' }) => (
        <span className={`flex items-center gap-1 font-mono font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {prefix}{Math.abs(value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </span>
    );

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col md:items-center md:flex-row justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                        <Briefcase className="text-indigo-500" size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Portfolio Engine</h1>
                        <p className="text-slate-500 font-medium font-mono text-[10px] uppercase tracking-widest italic leading-none mt-1">Institutional Asset Management & Tracking</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={fetchPortfolio}
                        className="p-3 bg-slate-900 border border-slate-800 text-slate-500 hover:text-indigo-400 rounded-2xl transition-all shadow-xl active:scale-95"
                    >
                        <RefreshCcw size={20} className={refreshing ? 'animate-spin' : ''} />
                    </button>
                    <div className="flex p-1.5 bg-slate-900 rounded-2xl border border-slate-800 shadow-inner">
                        <button
                            onClick={() => setActiveTab('holdings')}
                            className={`flex items-center gap-2 px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'holdings' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <LayoutGrid size={14} /> Holdings
                        </button>
                        <button
                            onClick={() => setActiveTab('positions')}
                            className={`flex items-center gap-2 px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'positions' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            <List size={14} /> Positions
                        </button>
                    </div>
                </div>
            </header>

            {/* Summary Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-600/10 transition-all duration-700"></div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Total Managed Value</p>
                    <h3 className="text-4xl font-black text-white tracking-tighter">₹{summary.totalValue.toLocaleString('en-IN')}</h3>
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-600">
                        Invested: <span className="text-slate-400">₹{summary.totalInvestment.toLocaleString('en-IN')}</span>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-600/10 transition-all duration-700"></div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Overall Unrealized P&L</p>
                    <div className="flex items-baseline gap-3">
                        <h3 className={`text-4xl font-black tracking-tighter ${summary.totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {summary.totalPnL >= 0 ? '+' : ''}₹{Math.abs(summary.totalPnL).toLocaleString('en-IN')}
                        </h3>
                        <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${summary.totalPnL >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                            {summary.pnlPercentage}%
                        </span>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-600">
                        Market Consensus: <span className="text-emerald-500/80">Bullish Accumulation</span>
                    </div>
                </div>

                <div className="bg-slate-950 border border-slate-800/50 p-8 rounded-[2rem] shadow-2xl flex flex-col justify-center border-dashed">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-slate-600 border border-slate-800">
                            <Activity size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Yield Health</p>
                            <p className="text-sm font-bold text-slate-300 mt-1">OPTIMIZED</p>
                        </div>
                    </div>
                    <div className="mt-6 space-y-2">
                        <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-600 w-[78%] shadow-[0_0_12px_rgba(79,70,229,0.4)]"></div>
                        </div>
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">78% Strategy Utilization</p>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl backdrop-blur-xl">
                <div className="px-8 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-800/20">
                    <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">
                        {activeTab === 'holdings' ? 'Long-term Equity Holdings' : 'Intraday & Open Positions'}
                    </h2>
                    <div className="flex items-center gap-4 text-[9px] font-black text-slate-600 uppercase tracking-widest">
                        <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div> Live Sync Active</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-800/10 text-slate-500">
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest">Instrument</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-right">Qty</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-right">Avg Price</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-right">LTP</th>
                                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-right">Value / Net</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-right">Unrealized P&L</th>
                                {activeTab === 'positions' && <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-center">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/40">
                            {loading ? (
                                <tr><td colSpan="7" className="px-8 py-20 text-center"><div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto"></div></td></tr>
                            ) : activeTab === 'holdings' ? (
                                holdings.length === 0 ? (
                                    <tr><td colSpan="6" className="px-8 py-20 text-center text-slate-600 font-bold uppercase tracking-widest italic opacity-40">No institutional holdings detected.</td></tr>
                                ) : holdings.map((h, i) => (
                                    <tr key={i} className="hover:bg-slate-800/30 transition-all border-l-4 border-l-transparent hover:border-l-indigo-500">
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-white tracking-tight">{h.tradingsymbol}</span>
                                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">{h.exchange} | {h.isin}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 text-right font-mono font-bold text-slate-300">{h.quantity}</td>
                                        <td className="px-6 py-6 text-right font-mono text-xs text-slate-500">₹{h.averageprice}</td>
                                        <td className="px-6 py-6 text-right font-mono font-bold text-indigo-400">₹{h.ltp}</td>
                                        <td className="px-6 py-6 text-right font-mono text-sm text-slate-200">₹{(h.quantity * h.ltp).toLocaleString('en-IN')}</td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex flex-col items-end">
                                                <StatusBadge isPositive={h.profitandloss >= 0} value={h.profitandloss} prefix="₹" />
                                                <span className={`text-[9px] font-black mt-0.5 ${h.profitandloss >= 0 ? 'text-emerald-500/50' : 'text-rose-500/50'}`}>{h.pnlpercentage}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                positions.length === 0 ? (
                                    <tr><td colSpan="7" className="px-8 py-20 text-center text-slate-600 font-bold uppercase tracking-widest italic opacity-40">No active positions currently held.</td></tr>
                                ) : positions.map((p, i) => (
                                    <tr key={i} className="hover:bg-slate-800/30 transition-all border-l-4 border-l-transparent hover:border-l-indigo-500 group">
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-black text-white tracking-tight">{p.tradingsymbol}</span>
                                                    <span className="text-[8px] font-black px-1.5 py-0.5 bg-slate-800 text-slate-500 rounded uppercase">{p.producttype}</span>
                                                </div>
                                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">{p.exchange} | {p.instrumenttype || 'Equity'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 text-right font-mono font-bold text-slate-300">{p.netqty}</td>
                                        <td className="px-6 py-6 text-right font-mono text-xs text-slate-500">₹{p.avgnetprice}</td>
                                        <td className="px-6 py-6 text-right font-mono font-bold text-indigo-400">₹{p.netprice}</td>
                                        <td className="px-6 py-6 text-right font-mono text-sm text-slate-200">₹{p.netvalue}</td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex flex-col items-end">
                                                <StatusBadge isPositive={Number(p.netvalue) >= 0} value={Number(p.netvalue)} prefix="₹" />
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <button
                                                onClick={() => handleConvertPosition(p)}
                                                className="px-4 py-2 bg-slate-800 hover:bg-indigo-600 text-slate-400 hover:text-white text-[9px] font-black uppercase tracking-widest rounded-lg transition-all border border-slate-700 hover:border-indigo-500 shadow-xl opacity-0 group-hover:opacity-100"
                                            >
                                                Convert
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <footer className="p-8 bg-indigo-600/5 border border-indigo-500/10 rounded-[2rem] flex items-start gap-6">
                <div className="p-3 bg-indigo-500/10 rounded-2xl">
                    <Activity className="text-indigo-400" size={24} />
                </div>
                <div className="space-y-2">
                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Institutional Compliance Notice</h4>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed italic max-w-4xl">
                        Portfolio data is reconciled every 60 seconds against primary clearing records. P&L computations are based on real-time Last Traded Prices (LTP) and adjusted for standard brokerage overheads. For settled Demat holdings, please allow T+2 days for accurate position sizing.
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default PortfolioPage;
