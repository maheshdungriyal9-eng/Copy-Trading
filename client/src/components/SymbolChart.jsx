import React, { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries } from 'lightweight-charts';
import { socket } from '../socket';
import { supabase } from '../supabase';
import { X, Maximize2, Minimize2, Clock } from 'lucide-react';

const SymbolChart = ({ script, onClose }) => {
    const chartContainerRef = useRef();
    const chartRef = useRef();
    const candleSeriesRef = useRef();
    const [interval, setInterval] = useState('ONE_MINUTE');
    const [loading, setLoading] = useState(true);

    const intervals = [
        { label: '1m', value: 'ONE_MINUTE' },
        { label: '5m', value: 'FIVE_MINUTE' },
        { label: '15m', value: 'FIFTEEN_MINUTE' },
        { label: '1h', value: 'ONE_HOUR' },
        { label: '1D', value: 'ONE_DAY' }
    ];

    useEffect(() => {
        if (!script) return;

        const initChart = async () => {
            setLoading(true);

            // Cleanup previous chart
            if (chartRef.current) {
                chartRef.current.remove();
            }

            // Create Chart
            const chart = createChart(chartContainerRef.current, {
                layout: {
                    background: { color: 'transparent' },
                    textColor: '#94a3b8',
                },
                grid: {
                    vertLines: { color: 'rgba(30, 41, 59, 0.5)' },
                    horzLines: { color: 'rgba(30, 41, 59, 0.5)' },
                },
                crosshair: {
                    mode: 0,
                    vertLine: { color: '#6366f1', labelBackgroundColor: '#6366f1' },
                    horzLine: { color: '#6366f1', labelBackgroundColor: '#6366f1' },
                },
                timeScale: {
                    borderColor: 'rgba(30, 41, 59, 0.5)',
                    timeVisible: true,
                    secondsVisible: false,
                },
                handleScroll: true,
                handleScale: true,
            });

            const candleSeries = chart.addSeries(CandlestickSeries, {
                upColor: '#10b981',
                downColor: '#ef4444',
                borderVisible: false,
                wickUpColor: '#10b981',
                wickDownColor: '#ef4444',
            });

            chartRef.current = chart;
            candleSeriesRef.current = candleSeries;

            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const toDate = new Date();
                const fromDate = new Date();

                // Adjust fromDate based on interval
                if (interval === 'ONE_DAY') fromDate.setDate(toDate.getDate() - 365);
                else if (interval === 'ONE_HOUR') fromDate.setDate(toDate.getDate() - 30);
                else fromDate.setDate(toDate.getDate() - 5);

                const formatDate = (date) => {
                    const y = date.getFullYear();
                    const m = String(date.getMonth() + 1).padStart(2, '0');
                    const d = String(date.getDate()).padStart(2, '0');
                    const hh = String(date.getHours()).padStart(2, '0');
                    const mm = String(date.getMinutes()).padStart(2, '0');
                    return `${y}-${m}-${d} ${hh}:${mm}`;
                };

                const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                const response = await fetch(`${API_URL}/api/market/historical`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: user.id,
                        exchange: script.exchange,
                        symboltoken: script.symbol_token,
                        interval: interval,
                        fromdate: formatDate(fromDate),
                        todate: formatDate(toDate)
                    })
                });

                const result = await response.json();

                if (result.status && result.data) {
                    const formattedData = result.data.map(item => ({
                        time: Math.floor(new Date(item[0]).getTime() / 1000),
                        open: item[1],
                        high: item[2],
                        low: item[3],
                        close: item[4]
                    }));

                    // Sort by time as required by lightweight-charts
                    formattedData.sort((a, b) => a.time - b.time);

                    // Remove duplicates if any
                    const uniqueData = [];
                    const seenTimes = new Set();
                    for (const d of formattedData) {
                        if (!seenTimes.has(d.time)) {
                            uniqueData.push(d);
                            seenTimes.add(d.time);
                        }
                    }

                    candleSeries.setData(uniqueData);
                    chart.timeScale().fitContent();
                }
            } catch (err) {
                console.error("Chart init failed:", err);
            } finally {
                setLoading(false);
            }

            const handleResize = () => {
                chart.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                    height: chartContainerRef.current.clientHeight,
                });
            };

            window.addEventListener('resize', handleResize);
            return () => {
                window.removeEventListener('resize', handleResize);
                chart.remove();
            };
        };

        const cleanup = initChart();
        return () => {
            if (typeof cleanup === 'function') cleanup();
        };
    }, [script, interval]);

    // Handle Live Updates
    useEffect(() => {
        if (!candleSeriesRef.current || !script) return;

        const handleMarketData = (tick) => {
            const token = String(tick.tk || tick.token || tick.symboltoken);
            if (token === String(script.symbol_token)) {
                const ltp = Number(tick.lp || tick.ltp || tick.last_traded_price) / 100;
                const high = Number(tick.h || tick.high) / 100;
                const low = Number(tick.l || tick.low) / 100;
                const open = Number(tick.o || tick.open) / 100;

                if (ltp) {
                    // Update current candle
                    const now = Math.floor(Date.now() / 1000);
                    // Round down to the interval start
                    let candleTime = now;
                    if (interval === 'ONE_MINUTE') candleTime = Math.floor(now / 60) * 60;
                    else if (interval === 'FIVE_MINUTE') candleTime = Math.floor(now / (5 * 60)) * (5 * 60);
                    else if (interval === 'FIFTEEN_MINUTE') candleTime = Math.floor(now / (15 * 60)) * (15 * 60);
                    else if (interval === 'ONE_HOUR') candleTime = Math.floor(now / 3600) * 3600;
                    else if (interval === 'ONE_DAY') candleTime = Math.floor(now / 86400) * 86400;

                    candleSeriesRef.current.update({
                        time: candleTime,
                        open: open || ltp,
                        high: high || ltp,
                        low: low || ltp,
                        close: ltp
                    });
                }
            }
        };

        socket.on('market_data', handleMarketData);
        return () => socket.off('market_data', handleMarketData);
    }, [script, interval]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-6xl h-[80vh] flex flex-col overflow-hidden shadow-2xl relative">
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-indigo-500/10 p-2 rounded-xl">
                            <Maximize2 size={24} className="text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">
                                {script?.exchange}:{script?.symbol}
                            </h2>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
                                <Clock size={12} /> Live Historical Analysis
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="bg-slate-800/50 p-1 rounded-xl flex gap-1 mr-4">
                            {intervals.map((int) => (
                                <button
                                    key={int.value}
                                    onClick={() => setInterval(int.value)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${interval === int.value ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                                >
                                    {int.label}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2.5 bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Chart Area */}
                <div className="flex-1 relative">
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 z-10 backdrop-blur-[2px]">
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Loading Chart Data...</span>
                            </div>
                        </div>
                    )}
                    <div ref={chartContainerRef} className="w-full h-full" />
                </div>

                {/* Footer Info */}
                <div className="px-6 py-4 bg-slate-950/20 border-t border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                            <span className="text-[9px] text-slate-600 font-black uppercase tracking-tighter">Powered By</span>
                            <span className="text-xs font-black text-slate-400 uppercase tracking-tight">TradingView Lightweight Charts</span>
                        </div>
                        <div className="w-[1px] h-6 bg-slate-800"></div>
                        <div className="flex flex-col">
                            <span className="text-[9px] text-slate-600 font-black uppercase tracking-tighter">Source</span>
                            <span className="text-xs font-black text-slate-400 uppercase tracking-tight">Angel One Historical API</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest">Real-time Sync Active</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SymbolChart;
