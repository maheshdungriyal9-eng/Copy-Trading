import React, { useEffect, useState } from 'react';
import { Bell, ChevronDown, Wallet as WalletIcon, LogOut, User as UserIcon } from 'lucide-react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';

const TopNavbar = () => {
    const [user, setUser] = useState(null);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUser(user);
        });
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const getInitials = (user) => {
        if (user?.user_metadata?.full_name) {
            return user.user_metadata.full_name.split(' ').map(n => n[0]).join('').toUpperCase();
        }
        return user?.email?.substring(0, 2).toUpperCase() || '??';
    };

    return (
        <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10 px-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold text-slate-100 uppercase tracking-wider text-sm opacity-60">Trading Dashboard</h2>
            </div>

            <div className="flex items-center gap-6">

                <button className="p-2 text-slate-400 hover:text-slate-100 bg-slate-800/50 rounded-full relative transition-colors">
                    <Bell size={20} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full border-2 border-slate-900"></span>
                </button>

                <div className="relative">
                    <div
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                        className="flex items-center gap-3 pl-4 border-l border-slate-800 cursor-pointer group"
                    >
                        <div className="text-right hidden md:block">
                            <p className="text-sm font-semibold text-slate-100 leading-none">
                                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Loading...'}
                            </p>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/20 ring-2 ring-indigo-500/20">
                            {getInitials(user)}
                        </div>
                        <ChevronDown size={14} className={`text-slate-500 group-hover:text-slate-300 transition-all ${showProfileMenu ? 'rotate-180' : ''}`} />
                    </div>

                    {showProfileMenu && (
                        <div className="absolute top-full right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-2 animate-in fade-in zoom-in-95 duration-200">
                            <div className="px-4 py-2 border-b border-slate-800 mb-2">
                                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-1">Signed in as</p>
                                <p className="text-xs font-medium text-slate-300 truncate">{user?.email}</p>
                            </div>
                            <button
                                onClick={() => { navigate('/profile'); setShowProfileMenu(false); }}
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
                            >
                                <UserIcon size={16} />
                                Profile Settings
                            </button>
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                            >
                                <LogOut size={16} />
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default TopNavbar;
