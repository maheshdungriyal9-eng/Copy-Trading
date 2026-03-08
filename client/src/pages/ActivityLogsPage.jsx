import React, { useState, useEffect } from 'react';
import { Activity, ShieldCheck, UserPlus, Zap, Settings, AlertTriangle, LogIn, RefreshCcw } from 'lucide-react';
import { supabase } from '../supabase';

const ActivityLogsPage = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('activity_logs')
            .select('*')
            .order('timestamp', { ascending: false });

        if (!error) {
            const formattedLogs = data.map(log => ({
                id: log.id,
                action: log.action,
                icon: getIcon(log.action),
                color: getColor(log.action),
                details: log.details?.message || 'No details available',
                time: new Date(log.timestamp).toLocaleString()
            }));
            setLogs(formattedLogs);
        }
        setLoading(false);
    };

    const getIcon = (action) => {
        if (action.includes('Login')) return LogIn;
        if (action.includes('Order')) return Zap;
        if (action.includes('Demat')) return UserPlus;
        if (action.includes('Security')) return AlertTriangle;
        return Settings;
    };

    const getColor = (action) => {
        if (action.includes('Login')) return 'text-indigo-400';
        if (action.includes('Order')) return 'text-amber-400';
        if (action.includes('Demat')) return 'text-emerald-400';
        if (action.includes('Security')) return 'text-rose-400';
        return 'text-blue-400';
    };

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white uppercase tracking-tight">System Audit Log</h1>
                    <p className="text-slate-500 mt-1 font-medium font-mono text-xs uppercase tracking-widest italic">Live security protocol monitoring active.</p>
                </div>
                <button
                    onClick={fetchLogs}
                    className="p-3 bg-slate-900 border border-slate-800 text-slate-500 hover:text-indigo-400 rounded-2xl transition-all"
                >
                    <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </header>

            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative backdrop-blur-md">
                <div className="absolute top-0 bottom-0 left-12 w-[1px] bg-slate-800/50 hidden md:block"></div>

                <div className="divide-y divide-slate-800/50">
                    {loading ? (
                        <div className="p-12 text-center text-slate-500 font-black uppercase tracking-widest italic">Scanning logs...</div>
                    ) : logs.map((log) => (
                        <div key={log.id} className="p-6 relative flex flex-col md:flex-row md:items-center gap-4 md:gap-8 hover:bg-white/[0.02] transition-all group">
                            <div className="absolute left-[39px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-950 border-[3px] border-slate-800 z-10 hidden md:block group-hover:border-indigo-500 transition-colors"></div>

                            <div className="md:w-48 shrink-0">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono">{log.time}</span>
                            </div>

                            <div className="flex items-center gap-4 flex-1">
                                <div className={`p-3 rounded-2xl bg-slate-900 border border-slate-800/50 ${log.color} shadow-inner`}>
                                    <log.icon size={20} />
                                </div>
                                <div>
                                    <h3 className="font-black text-white text-xs uppercase tracking-wider">{log.action}</h3>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed font-medium">{log.details}</p>
                                </div>
                            </div>

                            <div className="hidden lg:block opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="px-3 py-1 bg-slate-800 rounded-lg text-[10px] font-black text-slate-500 uppercase tracking-widest">Audited</div>
                            </div>
                        </div>
                    ))}
                    {!loading && logs.length === 0 && (
                        <div className="p-20 text-center opacity-30 flex flex-col items-center">
                            <Activity size={48} className="text-slate-600 mb-4" />
                            <p className="text-xs font-black uppercase tracking-widest text-slate-500">Log clearance 100% - No recent entries found</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ActivityLogsPage;
