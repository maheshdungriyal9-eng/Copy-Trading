import React, { useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, User, ArrowRight, Loader2, AlertCircle, Phone } from 'lucide-react';

const AuthPage = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const navigate = useNavigate();

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            first_name: firstName,
                            last_name: lastName,
                            full_name: `${firstName} ${lastName}`.trim(),
                            phone: phone,
                        }
                    }
                });
                if (error) throw error;
            }
            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-slate-950 font-sans selection:bg-indigo-500/30">
            {/* Left Side: Branding/Visual */}
            <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-indigo-900/40 via-slate-950 to-slate-950 relative overflow-hidden border-r border-white/5">
                <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/20 blur-[120px] rounded-full"></div>
                    <div className="absolute bottom-10 right-[-5%] w-[40%] h-[40%] bg-purple-500/10 blur-[100px] rounded-full"></div>
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 ring-1 ring-white/10">
                            <Shield className="text-white" size={24} />
                        </div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">AlgoDelta</h1>
                    </div>

                    <div className="max-w-md">
                        <h2 className="text-5xl font-extrabold text-white leading-[1.1] mb-6">
                            Master the Markets with Precision.
                        </h2>
                        <p className="text-lg text-slate-400 leading-relaxed">
                            The ultimate multi-account trading dashboard. Execute across all your broker accounts simultaneously with military-grade precision.
                        </p>
                    </div>
                </div>

                <div className="relative z-10 grid grid-cols-2 gap-8 border-t border-white/10 pt-12">
                    <div>
                        <p className="text-3xl font-bold text-white mb-1">99.9%</p>
                        <p className="text-slate-500 text-sm uppercase tracking-wider font-semibold">Uptime Reliability</p>
                    </div>
                    <div>
                        <p className="text-3xl font-bold text-white mb-1">&lt; 10ms</p>
                        <p className="text-slate-500 text-sm uppercase tracking-wider font-semibold">Execution Latency</p>
                    </div>
                </div>
            </div>

            {/* Right Side: Auth Form */}
            <div className="flex items-center justify-center p-6 lg:p-12 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none lg:hidden">
                    <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-500/20 blur-[100px] rounded-full"></div>
                </div>

                <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="text-center lg:text-left mb-10">
                        <h3 className="text-3xl font-bold text-white mb-3">
                            {isLogin ? 'Welcome Back' : 'Create Account'}
                        </h3>
                        <p className="text-slate-400">
                            {isLogin ? 'Enter your credentials to access your dashboard.' : 'Start your journey with professional copy trading today.'}
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 animate-in fade-in zoom-in-95 duration-200">
                            <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={18} />
                            <p className="text-sm text-red-200">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleAuth} className="space-y-5">
                        {!isLogin && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2 group">
                                        <label className="text-sm font-medium text-slate-300 ml-1 group-focus-within:text-indigo-400 transition-colors">First Name</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                                                <User size={18} />
                                            </div>
                                            <input
                                                type="text"
                                                required
                                                className="block w-full pl-11 pr-4 py-3.5 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 focus:border-indigo-600 transition-all text-[15px]"
                                                placeholder="John"
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2 group">
                                        <label className="text-sm font-medium text-slate-300 ml-1 group-focus-within:text-indigo-400 transition-colors">Last Name</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                                                <User size={18} />
                                            </div>
                                            <input
                                                type="text"
                                                required
                                                className="block w-full pl-11 pr-4 py-3.5 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 focus:border-indigo-600 transition-all text-[15px]"
                                                placeholder="Doe"
                                                value={lastName}
                                                onChange={(e) => setLastName(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 group">
                                    <label className="text-sm font-medium text-slate-300 ml-1 group-focus-within:text-indigo-400 transition-colors">Phone Number</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                                            <Phone className="text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                                        </div>
                                        <input
                                            type="tel"
                                            required
                                            className="block w-full pl-11 pr-4 py-3.5 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 focus:border-indigo-600 transition-all text-[15px]"
                                            placeholder="+91 9876543210"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="space-y-2 group">
                            <label className="text-sm font-medium text-slate-300 ml-1 group-focus-within:text-indigo-400 transition-colors">Email Address</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                                    <Mail size={18} />
                                </div>
                                <input
                                    type="email"
                                    required
                                    className="block w-full pl-11 pr-4 py-3.5 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 focus:border-indigo-600 transition-all text-[15px]"
                                    placeholder="name@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2 group">
                            <div className="flex justify-between items-center ml-1">
                                <label className="text-sm font-medium text-slate-300 group-focus-within:text-indigo-400 transition-colors">Password</label>
                                {isLogin && (
                                    <button type="button" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
                                        Forgot password?
                                    </button>
                                )}
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type="password"
                                    required
                                    className="block w-full pl-11 pr-4 py-3.5 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 focus:border-indigo-600 transition-all text-[15px]"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <button
                            disabled={loading}
                            type="submit"
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all transform hover:scale-[1.01] active:scale-[0.99] shadow-xl shadow-indigo-600/20 mt-4 disabled:opacity-70 disabled:cursor-not-allowed group"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <>
                                    {isLogin ? 'Sign In to Dashboard' : 'Get Started Now'}
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-slate-500 text-[15px]">
                            {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                            <button
                                onClick={() => setIsLogin(!isLogin)}
                                className="text-indigo-400 hover:text-indigo-300 font-bold ml-1 transition-colors"
                            >
                                {isLogin ? 'Create one for free' : 'Sign in back'}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
