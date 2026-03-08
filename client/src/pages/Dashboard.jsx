import React, { useState, useEffect } from 'react';
import { Users, Zap, Wallet, ShieldAlert, ShieldX, Activity, RefreshCcw, ArrowUpRight } from 'lucide-react';
import { supabase } from '../supabase';
import { Link } from 'react-router-dom';

const DashboardCard = ({ title, value, icon: Icon, color, trend }) => (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl hover:border-indigo-500/50 transition-all duration-500 shadow-2xl group relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Icon size={80} className={color.replace('bg-', 'text-')} />
        </div>
        <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-2xl ${color} bg-opacity-10 text-white`}>
                    <Icon size={24} className={color.replace('bg-', 'text-')} />
                </div>
                {trend && (
                    <div className="flex items-center gap-1 text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-1 rounded-lg">
                        <ArrowUpRight size={12} /> {trend}
                    </div>
                )}
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{title}</p>
            <h3 className="text-3xl font-black text-white tracking-tighter">{value}</h3>
        </div>
    </div>
);

const Dashboard = () => {
    const [counts, setCounts] = useState({
        demat: 0,
        staticIp: 0,
        balance: 0,
        disconnected: 0,
        expired: 0,
        availableIp: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        const { count: dematCount } = await supabase.from('demat_accounts').select('*', { count: 'exact', head: true });
        const { count: ipCount } = await supabase.from('static_ips').select('*', { count: 'exact', head: true });
        const { data: walletData } = await supabase.from('wallets').select('balance').single();

        setCounts({
            demat: dematCount || 0,
            staticIp: ipCount || 0,
            balance: walletData?.balance || 0,
            disconnected: 0, // Logic for disconnection can be added later
            expired: 0,
            availableIp: ipCount || 0
        });
        setLoading(false);
    };

    const stats = [
        { title: 'Wallet Balance', value: `₹${Number(counts.balance).toFixed(2)}`, icon: Wallet, color: 'bg-emerald-500', trend: '+12%' },
        { title: 'Linked Accounts', value: counts.demat, icon: Users, color: 'bg-indigo-500' },
        { title: 'Static IP Assets', value: counts.staticIp, icon: Zap, color: 'bg-blue-500' },
        { title: 'Network Health', value: 'OPTIMAL', icon: Activity, color: 'bg-purple-500' },
    ];

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Command Center</h1>
                    <p className="text-slate-500 mt-1 font-medium font-mono text-xs uppercase tracking-widest italic">System telemetry synchronized and active.</p>
                </div>
                <button
                    onClick={fetchDashboardData}
                    className="p-3 bg-slate-900 border border-slate-800 text-slate-500 hover:text-indigo-400 rounded-2xl transition-all shadow-xl"
                >
                    <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat) => (
                    <DashboardCard key={stat.title} {...stat} />
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
                    <div className="px-8 py-6 border-b border-slate-800 flex items-center justify-between bg-slate-800/30">
                        <h2 className="text-xs font-black text-white uppercase tracking-widest">Recent Activity Pulse</h2>
                        <Link to="/order-history" className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-widest">Global Terminal</Link>
                    </div>
                    <div className="p-12 flex flex-col items-center justify-center text-center space-y-6 opacity-40 grayscale group hover:grayscale-0 hover:opacity-100 transition-all duration-700">
                        <div className="w-24 h-24 bg-slate-800/50 rounded-[2.5rem] flex items-center justify-center text-slate-600 shadow-inner group-hover:bg-indigo-500/10 group-hover:text-indigo-400 transition-all">
                            <Activity size={48} className="animate-pulse" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-300 uppercase tracking-widest">No Operational Data</h3>
                            <p className="text-slate-500 max-w-xs mx-auto mt-2 font-medium italic">Deploy trading clusters to visualize real-time execution metrics.</p>
                        </div>
                        <Link to="/order-manager" className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-indigo-600/20 active:scale-95">
                            Launch Execution Hub
                        </Link>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
                    <h2 className="text-xs font-black text-white uppercase tracking-widest mb-6">Security Shield</h2>
                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Firewall</span>
                            </div>
                            <span className="text-[10px] font-black text-emerald-400 uppercase">Active</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Static IP</span>
                            </div>
                            <span className="text-[10px] font-black text-indigo-400 uppercase">Verified</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
