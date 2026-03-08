import React, { useEffect, useState } from 'react';
import { User as UserIcon, Mail, Phone, MapPin, Calendar, Camera, Save, Shield } from 'lucide-react';
import { supabase } from '../supabase';

const ProfilePage = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUser(user);
            setLoading(false);
        });
    }, []);

    const getInitials = (user) => {
        if (user?.user_metadata?.full_name) {
            return user.user_metadata.full_name.split(' ').map(n => n[0]).join('').toUpperCase();
        }
        return user?.email?.substring(0, 2).toUpperCase() || '??';
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px]">
                <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header>
                <h1 className="text-3xl font-bold text-white">Profile Settings</h1>
                <p className="text-slate-500 mt-1">Configure your personal information and preferences.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col items-center text-center shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-indigo-600 to-purple-700 opacity-20"></div>
                        <div className="relative mb-6 mt-4">
                            <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 p-1">
                                <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-4xl font-black text-white">
                                    {getInitials(user)}
                                </div>
                            </div>
                            <button className="absolute bottom-1 right-1 p-2 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-500 transition-all">
                                <Camera size={16} />
                            </button>
                        </div>
                        <h2 className="text-xl font-bold text-white">
                            {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                        </h2>
                        <p className="text-indigo-400 font-bold text-xs uppercase tracking-widest mt-1">Professional Trader</p>

                        <div className="w-full mt-8 space-y-3">
                            <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl border border-slate-700/30">
                                <span className="text-xs font-bold text-slate-500 uppercase">Account Status</span>
                                <span className="text-xs font-bold text-emerald-500 px-2 py-0.5 bg-emerald-500/10 rounded">Verified</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl border border-slate-700/30">
                                <span className="text-xs font-bold text-slate-500 uppercase">Member Since</span>
                                <span className="text-xs font-bold text-white">
                                    {new Date(user?.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) || 'March 2026'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-6 shadow-xl">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <Shield size={18} className="text-indigo-400" />
                            Security
                        </h3>
                        <button className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all text-sm border border-slate-700">
                            Change Password
                        </button>
                        <button className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all text-sm border border-slate-700">
                            Two-Factor Auth
                        </button>
                    </div>
                </div>

                <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
                    <div className="p-8 space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">First Name</label>
                                <div className="relative">
                                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                                    <input type="text" defaultValue={user?.user_metadata?.first_name || ""} placeholder="E.g. Mahesh" className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-600" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Last Name</label>
                                <div className="relative">
                                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                                    <input type="text" defaultValue={user?.user_metadata?.last_name || ""} placeholder="E.g. Kumar" className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-600" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                                    <input type="email" defaultValue={user?.email || ""} placeholder={user?.email || "mahesh@example.com"} className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-600" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Mobile Number</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                                    <input type="text" defaultValue={user?.user_metadata?.phone || ""} placeholder="+91 9876543210" className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-600" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Age Range</label>
                                <select className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all items-center">
                                    <option value="" disabled selected>Select age range</option>
                                    <option>18-25</option>
                                    <option>26-35</option>
                                    <option>36-45</option>
                                    <option>46+</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">State</label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                                    <input type="text" placeholder="E.g. Rajasthan" className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-slate-600" />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-800 flex justify-end">
                            <button className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl shadow-lg shadow-indigo-600/30 transition-all active:scale-95">
                                <Save size={20} />
                                Save Profile
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
