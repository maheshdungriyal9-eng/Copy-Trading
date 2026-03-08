import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabase'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import DematPage from './pages/DematPage'
import StaticIPPage from './pages/StaticIPPage'
import WatchlistPage from './pages/WatchlistPage'
import GroupPage from './pages/GroupPage'
import OrderManagerPage from './pages/OrderManagerPage'
import PendingOrdersPage from './pages/PendingOrdersPage'
import OrderHistoryPage from './pages/OrderHistoryPage'
import WalletPage from './pages/WalletPage'
import ProfilePage from './pages/ProfilePage'
import ActivityLogsPage from './pages/ActivityLogsPage'
import AuthPage from './pages/AuthPage'

const ProtectedRoute = ({ children, session }) => {
    if (!session) {
        return <Navigate to="/login" replace />;
    }
    return children;
};

function App() {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <Router>
            <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30">
                <Routes>
                    <Route
                        path="/login"
                        element={session ? <Navigate to="/" replace /> : <AuthPage />}
                    />

                    <Route
                        path="/*"
                        element={
                            <ProtectedRoute session={session}>
                                <Layout>
                                    <Routes>
                                        <Route path="/" element={<Dashboard />} />
                                        <Route path="/demat" element={<DematPage />} />
                                        <Route path="/static-ip" element={<StaticIPPage />} />
                                        <Route path="/watchlist" element={<WatchlistPage />} />
                                        <Route path="/group" element={<GroupPage />} />
                                        <Route path="/order-manager" element={<OrderManagerPage />} />
                                        <Route path="/pending-orders" element={<PendingOrdersPage />} />
                                        <Route path="/order-history" element={<OrderHistoryPage />} />
                                        <Route path="/wallet" element={<WalletPage />} />
                                        <Route path="/activity-logs" element={<ActivityLogsPage />} />
                                        <Route path="/profile" element={<ProfilePage />} />
                                    </Routes>
                                </Layout>
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </div>
        </Router>
    )
}

export default App
