import React from 'react';
import {
    LayoutDashboard,
    UserCircle,
    Wallet,
    ShieldCheck,
    ListTodo,
    Users,
    Zap,
    History,
    Activity,
    Settings,
    Search,
    Bell,
    LogOut,
    ChevronDown
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
    const location = useLocation();

    const menuItems = [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
        { name: 'Demat', icon: ShieldCheck, path: '/demat' },
        { name: 'Watch List', icon: Search, path: '/watchlist' },
        { name: 'Orders & GTT', icon: ListTodo, path: '/orders' },
        { name: 'Order History', icon: History, path: '/order-history' },
        { name: 'Group Manager', icon: Users, path: '/group' },
        { name: 'Wallet', icon: Wallet, path: '/wallet' },
        { name: 'Activity Logs', icon: Activity, path: '/activity-logs' },
        { name: 'Profile', icon: UserCircle, path: '/profile' },
    ];

    return (
        <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen sticky top-0">
            <div className="p-6">
                <div className="flex items-center gap-3 text-indigo-500">
                    <Zap size={32} fill="currentColor" />
                    <span className="text-xl font-bold tracking-tight text-white">FastCopyCall</span>
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto py-4 px-4 space-y-1">
                {menuItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link
                            key={item.name}
                            to={item.path}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${isActive
                                ? 'bg-indigo-600/10 text-indigo-500'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                                }`}
                        >
                            <item.icon size={20} className={isActive ? 'text-indigo-500' : 'group-hover:text-slate-100'} />
                            <span className="font-medium">{item.name}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-slate-800">
                <button className="flex items-center gap-3 w-full px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-400/5 rounded-lg transition-colors">
                    <LogOut size={20} />
                    <span className="font-medium">Logout</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
