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
    const [editingGroup, setEditingGroup] = useState(null);

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
        const { data: mappings } = await supabase.from('group_accounts').select('*');

        const groupsWithStats = (groupsData || []).map(group => {
            const groupMappings = (mappings || []).filter(m => m.group_id === group.id);
            const masterMapping = groupMappings.find(m => m.account_type === 'Master');
            const masterAcc = accountsData?.find(a => a.id === masterMapping?.demat_account_id);

            return {
                ...group,
                accountsCount: groupMappings.length,
                childCount: groupMappings.filter(m => m.account_type !== 'Master').length,
                masterName: masterAcc ? masterAcc.nickname : 'No Master',
                totalMultiplier: groupMappings.reduce((sum, m) => sum + Number(m.multiplier), 0)
            };
        });

        setGroups(groupsWithStats);
        setAccounts(accountsData || []);
        setLoading(false);
    };

    const handleEditGroup = (group) => {
        setEditingGroup(group);
        setGroupName(group.group_name);

        // Fetch current mappings for this group
        const currentMappings = groups.find(g => g.id === group.id);
        // We need the raw mappings to populate selectedAccounts
        supabase.from('group_accounts').select('*').eq('group_id', group.id)
            .then(({ data }) => {
                const selected = (data || []).map(m => {
                    const acc = accounts.find(a => a.id === m.demat_account_id);
                    return { ...acc, multiplier: m.multiplier, account_type: m.account_type };
                });
                setSelectedAccounts(selected);
                setShowModal(true);
            });
    };

    const handleOpenCreateModal = () => {
        setEditingGroup(null);
        setGroupName('');
        setSelectedAccounts([]);
        setShowModal(true);
    };

    const handleSaveGroup = async (e) => {
        e.preventDefault();
        if (!groupName || selectedAccounts.length === 0) return;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert('Please log in again.');
            return;
        }

        let groupId = editingGroup?.id;

        if (editingGroup) {
            // Update group name
            await supabase.from('groups').update({ group_name: groupName }).eq('id', groupId);
            // Delete old mappings
            await supabase.from('group_accounts').delete().eq('group_id', groupId);
        } else {
            // Create new group
            const { data: newGroup, error: groupError } = await supabase
                .from('groups')
                .insert([{ group_name: groupName, user_id: user.id }])
                .select()
                .single();

            if (groupError) {
                alert('Error creating group');
                return;
            }
            groupId = newGroup.id;
        }

        const mappings = selectedAccounts.map(acc => ({
            group_id: groupId,
            demat_account_id: acc.id,
            multiplier: acc.multiplier || 1,
            account_type: acc.account_type || 'Child',
            user_id: user.id
        }));

        const { error: mappingError } = await supabase
            .from('group_accounts')
            .insert(mappings);

        if (mappingError) {
            alert('Error updating accounts in group');
        } else {
            setGroupName('');
            setSelectedAccounts([]);
            setEditingGroup(null);
            setShowModal(false);
            fetchData();
        }
    };

    const toggleAccountSelection = (acc) => {
        const isSelected = selectedAccounts.find(a => a.id === acc.id);
        if (isSelected) {
            setSelectedAccounts(selectedAccounts.filter(a => a.id !== acc.id));
        } else {
            setSelectedAccounts([...selectedAccounts, { ...acc, multiplier: 1, account_type: 'Child' }]);
        }
    };

    const setAsMaster = (id) => {
        setSelectedAccounts(selectedAccounts.map(a => ({
            ...a,
            account_type: a.id === id ? 'Master' : 'Child'
        })));
    };

    const updateMultiplier = (id, val) => {
        setSelectedAccounts(selectedAccounts.map(a =>
            a.id === id ? { ...a, multiplier: parseFloat(val) } : a
        ));
    };

    const handleDeleteGroup = async (groupId) => {
        if (!window.confirm('Are you sure you want to delete this group? This action cannot be undone.')) return;

        try {
            setLoading(true);
            // 1. Delete dependents first - order_history (prevents 409 conflict)
            const { error: historyError } = await supabase
                .from('order_history')
                .delete()
                .eq('group_id', groupId);

            if (historyError) throw historyError;

            // 2. Delete mappings
            const { error: mappingError } = await supabase
                .from('group_accounts')
                .delete()
                .eq('group_id', groupId);

            if (mappingError) throw mappingError;

            // 3. Delete the group
            const { error: groupError } = await supabase
                .from('groups')
                .delete()
                .eq('id', groupId);

            if (groupError) throw groupError;

            fetchData();
        } catch (error) {
            console.error('Error deleting group:', error);
            alert(`Failed to delete group: ${error.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Account Groups</h1>
                    <p className="text-slate-500 mt-1">Combine multiple demat accounts for simultaneous trade execution.</p>
                </div>
                <button
                    onClick={handleOpenCreateModal}
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
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-4">
                                <div className="bg-indigo-600/10 p-3 rounded-2xl text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                                    <Users size={28} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">{group.group_name}</h3>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Multi-Account Cluster</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleDeleteGroup(group.id)}
                                className="p-2 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                                title="Delete Group"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>

                        <div className="mb-6">
                            <div className="flex items-center gap-2 text-xs font-bold">
                                <span className="text-slate-500 uppercase">Master:</span>
                                <span className="text-indigo-400">{group.masterName}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Childs</p>
                                <p className="text-lg font-bold text-white">{group.childCount}</p>
                            </div>
                            <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Accounts</p>
                                <p className="text-lg font-bold text-emerald-400">{group.accountsCount}</p>
                            </div>
                        </div>

                        <button
                            onClick={() => handleEditGroup(group)}
                            className="w-full flex items-center justify-between p-3 bg-slate-800/20 hover:bg-slate-800 rounded-xl text-sm font-bold text-indigo-400 transition-colors border border-transparent hover:border-slate-700"
                        >
                            Manage Group <ChevronRight size={16} />
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
                        <form onSubmit={handleSaveGroup}>
                            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-indigo-600/5">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <Shield className="text-indigo-400" />
                                    {editingGroup ? 'Edit Group' : 'New Execution Group'}
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
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Select Accounts & Roles</p>
                                        <span className="text-[10px] font-bold text-indigo-400 uppercase">{selectedAccounts.length} Connected</span>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                                        {accounts.map(acc => {
                                            const isSelected = selectedAccounts.find(a => a.id === acc.id);
                                            const role = isSelected?.account_type || 'Child';

                                            return (
                                                <div
                                                    key={acc.id}
                                                    onClick={() => toggleAccountSelection(acc)}
                                                    className={`flex flex-col p-4 rounded-xl border transition-all cursor-pointer group ${isSelected
                                                        ? 'bg-indigo-600/10 border-indigo-500'
                                                        : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800'
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600'
                                                                }`}>
                                                                {isSelected && <CheckCircle2 size={12} className="text-white" />}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-white text-sm">{acc.nickname}</p>
                                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{acc.broker_name} • {acc.client_id}</p>
                                                            </div>
                                                        </div>
                                                        {isSelected && (
                                                            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setAsMaster(acc.id)}
                                                                    className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-tighter transition-all ${role === 'Master' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500 hover:text-slate-300'}`}
                                                                >
                                                                    {role === 'Master' ? 'Master' : 'Set Master'}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {isSelected && (
                                                        <div className="mt-3 pt-3 border-t border-indigo-500/20 flex items-center justify-between" onClick={e => e.stopPropagation()}>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase">Multiplier:</span>
                                                                <input
                                                                    type="number"
                                                                    step="0.1"
                                                                    value={isSelected.multiplier || 1}
                                                                    onChange={(e) => updateMultiplier(acc.id, e.target.value)}
                                                                    className="w-14 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-bold focus:ring-1 focus:ring-indigo-500"
                                                                />
                                                            </div>
                                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${role === 'Master' ? 'bg-indigo-600/20 text-indigo-400' : 'bg-slate-800 text-slate-600'}`}>
                                                                {role} Account
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
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
                                    {editingGroup ? 'Save Changes' : 'Create Group'}
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
