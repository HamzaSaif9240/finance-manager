import React, { useState, useEffect } from 'react';
import { RegisteredUser, SUPER_ADMIN } from './AuthScreen';
import { AppState } from '../types';
import LucideIcon from './LucideIcon';
import { formatPKR } from '../utils/financeHelpers';
import { fetchAllOnlineUsers, fetchOnlineState, registerOnlineUser, deleteOnlineUserAndState } from '../lib/firebase';

interface AdminPanelProps {
  currentUser: RegisteredUser;
  currency: string;
}

export default function AdminPanel({ currentUser, currency }: AdminPanelProps) {
  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [statesMap, setStatesMap] = useState<Record<string, AppState>>({});
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<RegisteredUser | null>(null);
  const [selectedUserState, setSelectedUserState] = useState<AppState | null>(null);
  
  // New admin form state
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submittingAdmin, setSubmittingAdmin] = useState(false);

  // Load all users & their states (if authorized as super admin)
  const loadUsersAndStates = async () => {
    setLoading(true);
    try {
      const list = await fetchAllOnlineUsers();
      setUsers(list);

      // If Super Admin ihamzasaif, we can fetch all client states to compute live inflows
      if (currentUser.isSuper) {
        const loadedStates: Record<string, AppState> = {};
        await Promise.all(
          list.map(async (u) => {
            if (u.isSuper) return;
            try {
              const uState = await fetchOnlineState(u.username);
              if (uState) {
                loadedStates[u.username] = uState;
              }
            } catch (err) {
              console.warn(`Could not sync ledger state for ${u.username}`, err);
            }
          })
        );
        setStatesMap(loadedStates);
      }
    } catch (e) {
      console.error('Failed to parse database registry', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsersAndStates();
  }, [currentUser]);

  // Helper: Computes summary values for lists
  const computeUserStats = (username: string) => {
    const userState = statesMap[username];
    if (!userState) {
      return { totalIncome: 0, totalExpense: 0, netSavings: 0, count: 0, loaded: false };
    }

    const totalIncome = (userState.transactions || [])
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = (userState.transactions || [])
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    const netSavings = totalIncome - totalExpense;

    return {
      totalIncome,
      totalExpense,
      netSavings,
      count: (userState.transactions || []).length,
      loaded: true
    };
  };

  // Click handler for user detail viewing
  const handleUserClick = (user: RegisteredUser) => {
    if (!currentUser.isSuper) {
      window.showAlert?.(
        "🔒 Access Restricted — Secondary admins are only authorized to review registered usernames. Detailed balance sheets and transaction entries are strictly reserved for Super Admin ihamzasaif.",
        "Security Access Blocked"
      );
      return;
    }

    const stateObj = statesMap[user.username] || null;
    setSelectedUser(user);
    setSelectedUserState(stateObj);
  };

  const handleDeleteUser = async (targetUser: RegisteredUser) => {
    if (targetUser.username === currentUser.username) {
      window.showAlert?.("You cannot delete your own account from here.");
      return;
    }
    if (targetUser.isSuper) {
      window.showAlert?.("The Super Admin cannot be deleted!");
      return;
    }
    
    window.showConfirm?.(
      `Confirm Deletion:\n\nAre you sure you want to delete @${targetUser.username}'s account and active ledger permanently?\n\nThis cannot be undone!`,
      async () => {
        try {
          await deleteOnlineUserAndState(targetUser.username);
          window.showAlert?.(`Account @${targetUser.username} and associated records successfully deleted from live db.`);
          await loadUsersAndStates(); 
        } catch (err: any) {
          window.showAlert?.("Error deleting user: " + (err.message || err));
        }
      }
    );
  };

  const handleToggleAdminRole = async (targetUser: RegisteredUser) => {
    if (!currentUser.isSuper) {
      window.showAlert?.("Privilege Error: Only the primary Owner (ihamzasaif) can manage admin roles.");
      return;
    }
    if (targetUser.isSuper) {
      window.showAlert?.("The Super Admin role cannot be modified.");
      return;
    }

    const nextIsAdmin = !targetUser.isAdmin;
    const confirmMessage = `Are you sure you want to ${nextIsAdmin ? 'promote' : 'demote'} @${targetUser.username}?\n\n${
      nextIsAdmin 
        ? "This will allow them to access the Admin Panel under Secondary Inspector mode." 
        : "This will remove their Admin privileges and turn them into a standard user."
    }`;

    window.showConfirm?.(confirmMessage, async () => {
      try {
        const updatedUser: RegisteredUser = {
          ...targetUser,
          isAdmin: nextIsAdmin
        };
        await registerOnlineUser(updatedUser);
        window.showAlert?.(`Successfully ${nextIsAdmin ? 'promoted' : 'demoted'} @${targetUser.username}.`, "Role Updated");
        await loadUsersAndStates();
      } catch (err: any) {
        window.showAlert?.("Failed to update user role: " + (err.message || err));
      }
    });
  };

  // Provision new admin form handler
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingAdmin) return;
    setFormError('');
    setFormSuccess('');

    if (!currentUser.isSuper) {
      setFormError("Privilege Error: Only the primary Owner (ihamzasaif) can authorize new admin roles.");
      return;
    }

    const cleanName = newAdminName.trim();
    const cleanUsername = newAdminUsername.trim().toLowerCase();
    const cleanPassword = newAdminPassword;

    if (!cleanName || !cleanUsername || !cleanPassword) {
      setFormError("All fields are mandatory.");
      return;
    }

    if (cleanUsername.length < 3) {
      setFormError("Username must be at least 3 characters.");
      return;
    }

    setSubmittingAdmin(true);

    try {
      // Check availability from current listed
      const usernameTaken = users.some(u => u.username === cleanUsername);
      if (usernameTaken) {
        setFormError("This username matches an existing active account.");
        setSubmittingAdmin(false);
        return;
      }

      const newAdmin: RegisteredUser = {
        id: `admin_${Date.now()}`,
        username: cleanUsername,
        passwordHash: cleanPassword,
        name: cleanName,
        createdAt: new Date().toISOString(),
        isAdmin: true,
        isSuper: false, // only secondary
      };

      await registerOnlineUser(newAdmin);
      
      setFormSuccess(`Admin role activated successfully for '${cleanUsername}'!`);
      setNewAdminName('');
      setNewAdminUsername('');
      setNewAdminPassword('');
      await loadUsersAndStates();
    } catch (e: any) {
      setFormError("Failed to save credentials: " + e.message);
    } finally {
      setSubmittingAdmin(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Title block */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <LucideIcon name="ShieldAlert" size={20} className="text-violet-600 dark:text-violet-400" />
            Control Hub Administrators Panel
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Registered client accounts directory, financial allocations review, and admin role provisioning.
          </p>
        </div>
        <div className="px-3 py-1 bg-violet-500/10 dark:bg-violet-400/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 rounded-full text-[10px] font-extrabold tracking-widest uppercase">
          {currentUser.isSuper ? "Super Admin Console" : "Secondary Inspector Mode"}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 gap-2 text-xs font-bold text-slate-450 dark:text-slate-500 animate-pulse">
          <LucideIcon name="Loader" size={16} className="animate-spin text-violet-500" />
          <span>Syncing Database Accounts & Ledgers...</span>
        </div>
      )}

      {/* Grid: Main Users list & Admin creator side form */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Registration Directory */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <LucideIcon name="Users" size={13} />
                Registered Client Directory ({users.length})
              </h3>

              <div className="overflow-x-auto border-t border-slate-50 dark:border-slate-850 pt-3">
                <table className="w-full text-left text-xs text-slate-600 dark:text-slate-450">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-850 text-slate-400 select-none">
                      <th className="pb-2 font-extrabold">Name / Username</th>
                      <th className="pb-2 font-extrabold">Role Type</th>
                      <th className="pb-2 font-extrabold">Flow Balance info</th>
                      <th className="pb-2 font-extrabold text-right">Statements Audit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                    {users.map((u) => {
                      const stats = computeUserStats(u.username);
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-colors">
                          <td className="py-2.5">
                            <span className="font-bold text-slate-900 dark:text-white block">{u.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">@{u.username}</span>
                          </td>
                          <td className="py-2.5 font-bold">
                            {u.isSuper ? (
                              <span className="text-[10px] px-2 py-0.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-full border border-rose-500/15">Super Admin</span>
                            ) : currentUser.isSuper ? (
                              <button
                                onClick={() => handleToggleAdminRole(u)}
                                className={`text-[10px] px-2.5 py-1 rounded-lg border cursor-pointer transition-all flex items-center gap-1 font-bold group select-none ${
                                  u.isAdmin
                                    ? 'bg-violet-500/10 hover:bg-amber-500/10 text-violet-600 hover:text-amber-600 border-violet-500/15 hover:border-amber-500/25'
                                    : 'bg-slate-100 hover:bg-violet-500/10 dark:bg-slate-800 hover:bg-violet-500/10 text-slate-500 hover:text-violet-600 dark:text-slate-400 dark:hover:text-violet-400 border-transparent hover:border-violet-500/15'
                                }`}
                                title={u.isAdmin ? 'Click to demote from Admin to Standard User' : 'Click to promote to Admin role'}
                              >
                                <LucideIcon 
                                  name={u.isAdmin ? "ShieldAlert" : "ShieldCheck"} 
                                  size={11} 
                                  className="opacity-70 group-hover:opacity-100 shrink-0 transition" 
                                />
                                <span>{u.isAdmin ? 'Admin' : 'Standard User'}</span>
                              </button>
                            ) : u.isAdmin ? (
                              <span className="text-[10px] px-2 py-0.5 bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-full border border-violet-500/15">Admin</span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full">Standard User</span>
                            )}
                          </td>
                          <td className="py-2.5 select-all">
                            {!u.isSuper ? (
                              stats.loaded ? (
                                <div className="space-y-0.5 font-mono text-[10px]">
                                  <div>Inflow: <span className="text-emerald-500 font-bold">{formatPKR(stats.totalIncome, currency)}</span></div>
                                  <div>Outflow: <span className="text-rose-500 font-bold">{formatPKR(stats.totalExpense, currency)}</span></div>
                                  <div>Net: <span className="text-violet-500 font-bold">{formatPKR(stats.netSavings, currency)}</span></div>
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-mono italic">
                                  {currentUser.isSuper ? "Offline/No Ledger" : "Confidential"}
                                </span>
                              )
                            ) : (
                              <span className="text-slate-400 italic">Super Admin bypass</span>
                            )}
                          </td>
                          <td className="py-2.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleUserClick(u)}
                                disabled={u.isSuper}
                                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                  u.isSuper
                                    ? 'bg-slate-100 dark:bg-slate-800/40 text-slate-400 cursor-not-allowed opacity-50'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-violet-600 hover:text-white dark:hover:bg-violet-600'
                                }`}
                              >
                                <LucideIcon name={currentUser.isSuper ? "Eye" : "Lock"} size={11} className="inline mr-1" />
                                Audit Ledger
                              </button>

                              {currentUser.isSuper && !u.isSuper && (
                                <button
                                  onClick={() => handleDeleteUser(u)}
                                  className="p-1.5 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-100/50 dark:hover:bg-rose-955/20 transition-all cursor-pointer"
                                  title="Delete User Permanently"
                                >
                                  <LucideIcon name="Trash2" size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

            </div>
          </div>

          {/* Create Admi role panel (Visible to everyone but only Super Admin can execute) */}
          <div>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <LucideIcon name="ShieldPlus" size={13} />
                Provision New Admin Role
              </h3>
              <p className="text-[10px] text-slate-450 dark:text-slate-500 inline-block mt-1 leading-normal">
                Instructed admin registers will have directory inspections logs enabled, but no custom data modifications or user detailed statements views.
              </p>
            </div>

            {formError && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-150 dark:border-rose-900/50 rounded-xl text-rose-600 dark:text-rose-450 text-[10px] font-bold flex items-start gap-1.5 animate-pulse leading-normal">
                <LucideIcon name="AlertCircle" size={12} className="shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-150 dark:border-emerald-900/50 rounded-xl text-emerald-600 dark:text-emerald-400 text-[10px] font-bold flex items-start gap-1.5 leading-normal">
                <LucideIcon name="CheckCircle" size={12} className="shrink-0 mt-0.5" />
                <span>{formSuccess}</span>
              </div>
            )}

            {!currentUser.isSuper ? (
              <div className="p-4 bg-slate-55/70 dark:bg-slate-950/30 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center select-none text-slate-400">
                <LucideIcon name="Lock" size={20} className="mx-auto mb-2 text-rose-500" />
                <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 block uppercase">Super Admin Required</span>
                <span className="text-[9px] block mt-1 leading-relaxed">Only the Super Admin (ihamzasaif) has credentials to add secondary admins.</span>
              </div>
            ) : (
              <form onSubmit={handleCreateAdmin} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-450 uppercase pl-1">Full Admin Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Abdullah Khan"
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500 shadow-inner"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-450 uppercase pl-1">Admin Username</label>
                  <input
                    type="text"
                    required
                    autoCapitalize="none"
                    placeholder="e.g. abdullah_admin"
                    value={newAdminUsername}
                    onChange={(e) => setNewAdminUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500 shadow-inner"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-450 uppercase pl-1">Security Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500 shadow-inner"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-violet-600 hover:bg-violet-700 text-white font-black text-[11px] uppercase tracking-wide rounded-xl shadow-lg shadow-violet-500/10 cursor-pointer transition select-none"
                >
                  Confirm Authorization 🚀
                </button>
              </form>
            )}

          </div>
        </div>

      </div>
      )}

      {/* Detail Statements popover overlay - Super Admin only */}
      {selectedUser && selectedUserState && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-3">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs" onClick={() => setSelectedUser(null)} />
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl relative z-10 flex flex-col p-5 space-y-4 animate-scaleIn select-none">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-violet-500/10 dark:bg-violet-400/10 text-violet-600 dark:text-violet-400 rounded-xl flex items-center justify-center select-none">
                  <LucideIcon name="Eye" size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base leading-none">
                    Audit Ledger: {selectedUser.name}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono tracking-wider mt-1 block">
                    Registered at @{selectedUser.username} • User ID: {selectedUser.id}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 transition cursor-pointer"
              >
                <LucideIcon name="X" size={20} />
              </button>
            </div>

            {/* Modal Body Scroll container */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
              
              {/* Stats Overview */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 p-3 rounded-xl">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-widest pl-0.5">Total Revenue</span>
                  <span className="text-sm font-black text-emerald-500 mt-1 block select-all">
                    {formatPKR(
                      selectedUserState.transactions
                        .filter(t => t.type === 'income')
                        .reduce((sum, t) => sum + t.amount, 0),
                      currency
                    )}
                  </span>
                </div>
                <div className="bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/10 p-3 rounded-xl">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-widest pl-0.5">Total Outflow</span>
                  <span className="text-sm font-black text-rose-500 mt-1 block select-all">
                    {formatPKR(
                      selectedUserState.transactions
                        .filter(t => t.type === 'expense')
                        .reduce((sum, t) => sum + t.amount, 0),
                      currency
                    )}
                  </span>
                </div>
                <div className="bg-violet-500/5 dark:bg-violet-500/10 border border-violet-500/10 p-3 rounded-xl">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-widest pl-0.5">Net Savings</span>
                  <span className="text-sm font-black text-violet-500 mt-1 block select-all">
                    {formatPKR(
                      selectedUserState.transactions
                        .filter(t => t.type === 'income')
                        .reduce((sum, t) => sum + t.amount, 0)
                      -
                      selectedUserState.transactions
                        .filter(t => t.type === 'expense')
                        .reduce((sum, t) => sum + t.amount, 0),
                      currency
                    )}
                  </span>
                </div>
              </div>

              {/* Accounts Directory */}
              <div className="space-y-1.5">
                <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <LucideIcon name="Wallet" size={11} />
                  Cash Pools & Assets ({selectedUserState.accounts.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedUserState.accounts.map(acc => {
                    const startVal = acc.balance;
                    // Compute live balance of the user
                    const inf = selectedUserState.transactions
                      .filter(t => t.accountId === acc.id && t.type === 'income')
                      .reduce((sum, t) => sum + t.amount, 0);
                    const out = selectedUserState.transactions
                      .filter(t => t.accountId === acc.id && t.type === 'expense')
                      .reduce((sum, t) => sum + t.amount, 0);

                    const liveBal = startVal + inf - out;
                    return (
                      <div key={acc.id} className="p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{acc.name}</span>
                        <span className="text-[11px] font-mono font-bold text-slate-900 dark:text-white select-all">{formatPKR(liveBal, currency)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Transactions table view */}
              <div className="space-y-1.5">
                <h4 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <LucideIcon name="History" size={11} />
                  Recent Transaction Log ({selectedUserState.transactions.length})
                </h4>
                <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 p-2.5 rounded-2xl max-h-48 overflow-y-auto">
                  {selectedUserState.transactions.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic text-center py-4">No entries recorded in user journal.</p>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-850">
                      {selectedUserState.transactions.map(tx => {
                        const isInc = tx.type === 'income';
                        return (
                          <div key={tx.id} className="py-2 flex items-center justify-between text-[11px]">
                            <div>
                              <span className="font-bold text-slate-800 dark:text-slate-200 block">{tx.description}</span>
                              <span className="text-[9px] text-slate-400">{tx.date}</span>
                            </div>
                            <span className={`font-mono font-bold select-all ${isInc ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {isInc ? '+' : '-'}{formatPKR(tx.amount, currency)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="flex items-center justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl cursor-pointer"
              >
                Close Audit
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
