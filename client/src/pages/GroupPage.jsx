import React, { useState, useEffect } from 'react';
import { Plus, Users, Shield, Trash2, Edit3, ChevronRight, CheckCircle2, X } from 'lucide-react';
import { supabase } from '../supabase';

const GroupPage = () => {
    const [groups, setGroups] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [groupName, setGroupName] = useState('');
    const [selectedAccounts, setSelectedAccounts] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setLoading(false);
            return;
        }

        const { data: groupsData } = await supabase.from('groups').select('*').eq('user_id', user.id);
        const { data: accountsData } = await supabase.from('demat_accounts').select('*').eq('user_id', user.id);

        // Fetch group-account mappings to calculate stats
        const { data: mappings } = await supabase.from('group_accounts').select('*');

        const groupsWithStats = (groupsData || []).map(group => {
            const groupMappings = (mappings || []).filter(m => m.group_id === group.id);
            return {
                ...group,
                accountsCount: groupMappings.length,
                totalMultiplier: groupMappings.reduce((sum, m) => sum + Number(m.multiplier), 0)
            };
        });

        setGroups(groupsWithStats);
        setAccounts(accountsData || []);
        setLoading(false);
    };

    const handleCreateGroup = async (e) => {
        e.preventDefault();
        if (!groupName || selectedAccounts.length === 0) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert('Please log in again.');
            return;
        }

        const { data: newGroup, error: groupError } = await supabase
            .from('groups')
            .insert([{ group_name: groupName, user_id: user.id }])
            .select()
            .single();

        if (groupError) {
            alert('Error creating group');
            return;
        }

        const mappings = selectedAccounts.map(acc => ({
            group_id: newGroup.id,
            demat_account_id: acc.id,
            multiplier: acc.multiplier || 1
        }));

        const { error: mappingError } = await supabase
            .from('group_accounts')
            .insert(mappings);

        if (mappingError) {
            alert('Error linking accounts to group');
        } else {
            setGroupName('');
            setSelectedAccounts([]);
            setShowModal(false);
            fetchData();
        }
    };

    const toggleAccountSelection = (acc) => {
        const isSelected = selectedAccounts.find(a => a.id === acc.id);
        if (isSelected) {
            setSelectedAccounts(selectedAccounts.filter(a => a.id !== acc.id));
        } else {
            setSelectedAccounts([...selectedAccounts, { ...acc, multiplier: 1 }]);
        }
    };

    const updateMultiplier = (id, val) => {
        setSelectedAccounts(selectedAccounts.map(a =>
            a.id === id ? { ...a, multiplier: parseFloat(val) } : a
        ));
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Account Groups</h1>
                    <p className="text-slate-500 mt-1">Combine multiple demat accounts for simultaneous trade execution.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                >
                    <Plus size={18} />
                    Add Group
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-20 text-center text-slate-500 italic uppercase font-black tracking-widest animate-pulse">Loading Groups...</div>
                ) : groups.map((group) => (
                    <div key={group.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-indigo-500/50 transition-all duration-300 group overflow-hidden relative shadow-xl">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="bg-indigo-600/10 p-3 rounded-2xl text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                                <Users size={28} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">{group.group_name}</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Multi-Account Cluster</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Accounts</p>
                                <p className="text-lg font-bold text-white">{group.accountsCount}</p>
                            </div>
                            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Multiplier</p>
                                <p className="text-lg font-bold text-emerald-400">{group.totalMultiplier}x</p>
                            </div>
                        </div>

                        <button className="w-full flex items-center justify-between p-3 bg-slate-800/20 hover:bg-slate-800 rounded-xl text-sm font-bold text-indigo-400 transition-colors border border-transparent hover:border-slate-700">
                            Manage Accounts <ChevronRight size={16} />
                        </button>
                    </div>
                ))}
                {!loading && groups.length === 0 && (
                    <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-800 rounded-2xl">
                        <Users className="mx-auto text-slate-700 mb-4" size={48} />
                        <p className="text-slate-500 font-bold uppercase tracking-widest">No groups found. Create one to start trading.</p>
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden">
                        <form onSubmit={handleCreateGroup}>
                            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-indigo-600/5">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Shield className="text-indigo-400" />
                                    New Execution Group
                                </h3>
                                <button type="button" onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white"><X /></button>
                            </div>
                            <div className="p-8 space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 pl-1">Group Label</label>
                                    <input
                                        type="text"
                                        required
                                        value={groupName}
                                        onChange={(e) => setGroupName(e.target.value)}
                                        placeholder="E.g. Scalping Cluster A"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
                                    />
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Select Accounts</p>
                                        <span className="text-[10px] font-bold text-indigo-400 uppercase">{selectedAccounts.length} Connected</span>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                                        {accounts.map(acc => (
                                            <div
                                                key={acc.id}
                                                onClick={() => toggleAccountSelection(acc)}
                                                className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer group ${selectedAccounts.find(a => a.id === acc.id)
                                                    ? 'bg-indigo-600/10 border-indigo-500'
                                                    : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${selectedAccounts.find(a => a.id === acc.id) ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600'
                                                        }`}>
                                                        {selectedAccounts.find(a => a.id === acc.id) && <CheckCircle2 size={12} className="text-white" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-white text-sm">{acc.nickname}</p>
                                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{acc.broker_name} • {acc.client_id}</p>
                                                    </div>
                                                </div>
                                                {selectedAccounts.find(a => a.id === acc.id) && (
                                                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Multiplier:</span>
                                                        <input
                                                            type="number"
                                                            value={selectedAccounts.find(a => a.id === acc.id).multiplier || 1}
                                                            onChange={(e) => updateMultiplier(acc.id, e.target.value)}
                                                            className="w-14 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-bold focus:ring-1 focus:ring-indigo-500"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {accounts.length === 0 && <p className="text-center py-4 text-slate-500 text-xs italic">No demat accounts found. Link one first.</p>}
                                    </div>
                                </div>
                            </div>
                            <div className="p-8 bg-slate-800/30 border-t border-slate-800 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-3 border border-slate-700 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl shadow-lg shadow-indigo-600/20 uppercase tracking-widest text-xs">
                                    Create Group
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GroupPage;
