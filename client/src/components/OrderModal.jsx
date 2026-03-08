import React, { useState, useEffect } from 'react';
import { X, Info, Zap, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../supabase';

const OrderModal = ({ isOpen, onClose, script, ltp }) => {
    const [orderType, setOrderType] = useState('MARKET'); // MARKET, LIMIT
    const [variety, setVariety] = useState('NORMAL'); // NORMAL, GTT
    const [transactionType, setTransactionType] = useState('BUY');
    const [quantity, setQuantity] = useState('1');
    const [price, setPrice] = useState(ltp ? (ltp / 100).toFixed(2) : '0.00');
    const [triggerPrice, setTriggerPrice] = useState('');
    const [productType, setProductType] = useState('DELIVERY');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        if (ltp) {
            setPrice((ltp / 100).toFixed(2));
        }
    }, [ltp]);

    if (!isOpen || !script) return null;

    const handleExecute = async () => {
        setLoading(true);
        setMessage(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            const API_BASE_URL = import.meta.env.VITE_API_URL;

            let endpoint = `${API_BASE_URL}/api/orders/execute`;
            let payload = {
                user_id: user.id,
                variety: variety,
                params: {
                    tradingsymbol: script.symbol,
                    symboltoken: script.symbol_token,
                    exchange: script.exchange,
                    transactiontype: transactionType,
                    producttype: productType,
                    quantity: quantity,
                    duration: 'DAY',
                    price: orderType === 'MARKET' ? '0' : price,
                    ordertype: orderType
                }
            };

            if (variety === 'GTT') {
                endpoint = `${API_BASE_URL}/api/gtt/create`;
                payload = {
                    user_id: user.id,
                    params: {
                        tradingsymbol: script.symbol,
                        symboltoken: script.symbol_token,
                        exchange: script.exchange,
                        transactiontype: transactionType,
                        producttype: productType,
                        price: price,
                        qty: quantity,
                        triggerprice: triggerPrice,
                        disclosedqty: quantity
                    }
                };
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (result.status) {
                setMessage({ type: 'success', text: `Order Placed Successfully! ID: ${result.data.orderid || result.data.id}` });
                setTimeout(() => {
                    onClose();
                    setMessage(null);
                }, 2000);
            } else {
                setMessage({ type: 'error', text: result.message || 'Execution Failed' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden ring-1 ring-white/10 flex flex-col">
                {/* Header */}
                <div className={`p-6 flex items-center justify-between ${transactionType === 'BUY' ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${transactionType === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                            <Zap size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white uppercase tracking-tight">{transactionType} {script.symbol}</h3>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{script.exchange} | {productType}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors text-slate-500">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    {/* Toggle Switches */}
                    <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-2xl border border-slate-800">
                        <button
                            onClick={() => setTransactionType('BUY')}
                            className={`py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${transactionType === 'BUY' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Buy
                        </button>
                        <button
                            onClick={() => setTransactionType('SELL')}
                            className={`py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${transactionType === 'SELL' ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Sell
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Variety</label>
                            <select
                                value={variety}
                                onChange={(e) => setVariety(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                            >
                                <option value="NORMAL">Regular</option>
                                <option value="GTT">GTT (Long Term)</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Order Type</label>
                            <select
                                value={orderType}
                                onChange={(e) => setOrderType(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                            >
                                <option value="MARKET">Market</option>
                                <option value="LIMIT">Limit</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Quantity</label>
                            <input
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Price</label>
                            <input
                                type="number"
                                step="0.05"
                                disabled={orderType === 'MARKET'}
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-30"
                            />
                        </div>
                    </div>

                    {variety === 'GTT' && (
                        <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                            <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest px-1">Trigger Price</label>
                            <input
                                type="number"
                                step="0.05"
                                placeholder="Trigger Price"
                                value={triggerPrice}
                                onChange={(e) => setTriggerPrice(e.target.value)}
                                className="w-full bg-indigo-500/5 border border-indigo-500/30 rounded-xl px-4 py-3 text-white text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    )}

                    <div className="flex items-center gap-2 p-3 bg-slate-950/50 rounded-2xl border border-slate-800/50 text-[10px] text-slate-500">
                        <Info size={14} className="text-indigo-400 shrink-0" />
                        <p>Approx. Margin Required: <span className="text-white font-bold ml-1">₹{(Number(quantity) * Number(price)).toFixed(2)}</span></p>
                    </div>

                    {message && (
                        <div className={`p-4 rounded-2xl border text-xs font-bold animate-in zoom-in-95 ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                            {message.text}
                        </div>
                    )}
                </div>

                {/* Footer Action */}
                <div className="p-8 bg-slate-950/50 border-t border-slate-800">
                    <button
                        onClick={handleExecute}
                        disabled={loading}
                        className={`w-full py-4 rounded-2xl flex items-center justify-center gap-3 text-white font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-[0.98] disabled:opacity-50 ${transactionType === 'BUY' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-xl shadow-emerald-600/20' : 'bg-rose-600 hover:bg-rose-500 shadow-xl shadow-rose-600/20'}`}
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : (
                            <>
                                Execute {transactionType} Order
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrderModal;
