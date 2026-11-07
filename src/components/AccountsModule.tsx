/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Account, Transaction, Transfer, Category } from '../types';
import { formatPKR, formatDate } from '../utils/financeHelpers';
import LucideIcon from './LucideIcon';

interface AccountsModuleProps {
  accounts: Account[];
  transactions: Transaction[];
  transfers: Transfer[];
  categories: Category[];
  onAddAccount: (name: string, type: 'cash' | 'digital', balance: number) => void;
  onEditAccountBalance: (accountId: string, newBalance: number) => void;
  onDeleteAccount: (accountId: string) => void;
  currency: string;
}

export default function AccountsModule({
  accounts,
  transactions,
  transfers,
  categories,
  onAddAccount,
  onEditAccountBalance,
  onDeleteAccount,
  currency
}: AccountsModuleProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '');
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState<'cash' | 'digital'>('cash');
  const [newAccBalance, setNewAccBalance] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // States to add Starting Balance adjustments
  const [editBalanceId, setEditBalanceId] = useState<string | null>(null);
  const [editBalanceVal, setEditBalanceVal] = useState('');
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

  // Segregate accounts by cash and digital
  const cashAccounts = useMemo(() => accounts.filter(a => a.type === 'cash'), [accounts]);
  const digitalAccounts = useMemo(() => accounts.filter(a => a.type === 'digital'), [accounts]);

  // Compute stats and history of selected account
  const accountStats = useMemo(() => {
    if (!selectedAccountId) return null;
    const acc = accounts.find(a => a.id === selectedAccountId);
    if (!acc) return null;

    // Filter transactions associated
    const accTransactions = transactions.filter(t => t.accountId === selectedAccountId);
    
    const totalIncome = accTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = accTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    // Filter transfers associated
    const transferIns = transfers
      .filter(tr => tr.toAccountId === selectedAccountId)
      .reduce((sum, tr) => sum + tr.amount, 0);

    const transferOuts = transfers
      .filter(tr => tr.fromAccountId === selectedAccountId)
      .reduce((sum, tr) => sum + tr.amount, 0);

    // Build unified transaction and transfer chronological ledger log
    const ledgerItems = [
      ...accTransactions.map(t => ({
        id: t.id,
        date: t.date,
        type: t.type, // 'income' | 'expense'
        amount: t.amount,
        description: t.description,
        isTransfer: false,
        categoryId: t.categoryId,
        badgeText: t.type === 'income' ? 'Received' : 'Paid'
      })),
      ...transfers.filter(tr => tr.fromAccountId === selectedAccountId).map(tr => ({
        id: tr.id,
        date: tr.date,
        type: 'expense' as const, // Deducts from balance
        amount: tr.amount,
        description: `Transfer to ${accounts.find(a => a.id === tr.toAccountId)?.name || 'Account'}`,
        isTransfer: true,
        categoryId: 'transfer',
        badgeText: 'Transfer Out'
      })),
      ...transfers.filter(tr => tr.toAccountId === selectedAccountId).map(tr => ({
        id: tr.id,
        date: tr.date,
        type: 'income' as const, // Adds to balance
        amount: tr.amount,
        description: `Transfer from ${accounts.find(a => a.id === tr.fromAccountId)?.name || 'Account'}`,
        isTransfer: true,
        categoryId: 'transfer',
        badgeText: 'Transfer In'
      }))
    ].sort((a, b) => b.date.localeCompare(a.date));

    return {
      account: acc,
      totalIncome,
      totalExpense,
      transferIns,
      transferOuts,
      ledger: ledgerItems
    };

  }, [selectedAccountId, accounts, transactions, transfers]);

  const handleAddNewAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!newAccName.trim()) {
      setErrorMsg('Account name is required');
      return;
    }

    const dupName = accounts.some(a => a.name.toLowerCase() === newAccName.trim().toLowerCase());
    if (dupName) {
      setErrorMsg('An account with this name already exists');
      return;
    }

    const startingBalance = parseFloat(newAccBalance);
    if (isNaN(startingBalance) || startingBalance < 0) {
      setErrorMsg('Starting balance must be 0 or dynamic positive number');
      return;
    }

    onAddAccount(newAccName.trim(), newAccType, startingBalance);
    
    // Select the newly added account
    const newId = 'acc_' + newAccName.trim().toLowerCase().replace(/\s+/g, '_');
    setSelectedAccountId(newId);

    // Reset Form
    setNewAccName('');
    setNewAccBalance('');
  };

  const saveBalanceAdjustment = (accId: string) => {
    const val = parseFloat(editBalanceVal);
    if (!isNaN(val) && val >= 0) {
      onEditAccountBalance(accId, val);
      setEditBalanceId(null);
    } else {
      window.showAlert?.('Balance adjustment must be a real positive value');
    }
  };

  const getCategoryNameAndIcon = (id: string) => {
    const cat = categories.find(c => c.id === id);
    return cat ? { name: cat.name, icon: cat.icon } : { name: 'Transfer Record', icon: 'ArrowLeftRight' };
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Accounts lists + Add trigger */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* Cash Ledger lists */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-slate-450 uppercase tracking-wider mb-4 flex items-center gap-2">
              <LucideIcon name="Coins" className="text-amber-500" />
              Cash Accounts
            </h3>
            
            <div className="space-y-2.5">
              {cashAccounts.map(acc => (
                <div
                  key={acc.id}
                  onClick={() => setSelectedAccountId(acc.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between group ${
                    selectedAccountId === acc.id
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-slate-50 border-slate-50 hover:bg-slate-100/60 hover:border-slate-200/50 dark:bg-slate-850 dark:border-slate-850 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="p-2 bg-amber-500/15 rounded-lg text-amber-550 shrink-0">
                      <LucideIcon name="Coins" size={16} />
                    </div>
                    <div className="min-w-0 pr-1">
                      <span className="font-semibold text-slate-900 dark:text-white text-sm block leading-tight truncate" title={acc.name}>{acc.name}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                      {formatPKR(acc.balance, currency)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAccountToDelete(acc);
                      }}
                      className="p-1 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 rounded-md hover:bg-slate-105 dark:hover:bg-slate-800/80 transition cursor-pointer"
                      title={`Delete "${acc.name}"`}
                    >
                      <LucideIcon name="Trash2" size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Digital Accounts list */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
            <h3 className="text-sm font-bold text-slate-450 uppercase tracking-wider mb-4 flex items-center gap-2">
              <LucideIcon name="CreditCard" className="text-indigo-500" />
              Digital & Bank Accounts
            </h3>
            
            <div className="space-y-2.5">
              {digitalAccounts.map(acc => (
                <div
                  key={acc.id}
                  onClick={() => setSelectedAccountId(acc.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between group ${
                    selectedAccountId === acc.id
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-slate-50 border-slate-50 hover:bg-slate-100/60 hover:border-slate-200/50 dark:bg-slate-850 dark:border-slate-850 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="p-2 bg-indigo-500/15 rounded-lg text-indigo-550 shrink-0">
                      <LucideIcon name="CreditCard" size={16} />
                    </div>
                    <div className="min-w-0 pr-1">
                      <span className="font-semibold text-slate-900 dark:text-white text-sm block leading-tight truncate" title={acc.name}>{acc.name}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
                      {formatPKR(acc.balance, currency)}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAccountToDelete(acc);
                      }}
                      className="p-1 text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 rounded-md hover:bg-slate-105 dark:hover:bg-slate-800/80 transition cursor-pointer"
                      title={`Delete "${acc.name}"`}
                    >
                      <LucideIcon name="Trash2" size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form to Add New Custom Account */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
            <h4 className="font-semibold text-slate-950 dark:text-white text-sm mb-3 flex items-center gap-1.5">
              <LucideIcon name="PlusCircle" className="text-emerald-500" />
              Add Custom Account
            </h4>

            <form onSubmit={handleAddNewAccount} className="space-y-3">
              {errorMsg && (
                <div className="bg-rose-50 border border-rose-100 p-2.5 rounded-lg text-xs text-rose-600 flex items-center gap-1">
                  <LucideIcon name="AlertCircle" size={14} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Name */}
              <div>
                <input
                  type="text"
                  className="w-full bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white text-xs border-0 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g. Nayapay, Jazz Cash, HBL"
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                />
              </div>

              {/* Type toggle selector */}
              <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-850 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setNewAccType('cash')}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    newAccType === 'cash' 
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-550'
                  }`}
                >
                  Cash Account
                </button>
                <button
                  type="button"
                  onClick={() => setNewAccType('digital')}
                  className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    newAccType === 'digital' 
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-550'
                  }`}
                >
                  Digital Account
                </button>
              </div>

              {/* Starting balance */}
              <div>
                <input
                  type="number"
                  className="w-full bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white text-xs border-0 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-emerald-500"
                  placeholder="Starting Balance PKR (e.g. 5000)"
                  value={newAccBalance}
                  onChange={(e) => setNewAccBalance(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1 cursor-pointer"
              >
                <LucideIcon name="Check" size={14} />
                Construct Account
              </button>
            </form>
          </div>

        </div>

        {/* Right Side: Detailed Transaction Ledger of Active Account */}
        <div className="lg:col-span-2">
          {accountStats ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full">
              
              {/* Profile Card Summary */}
              <div className="p-6 bg-slate-50/80 dark:bg-slate-850/80 border-b border-slate-100 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-4 rounded-2xl ${
                      accountStats.account.type === 'cash' ? 'bg-amber-500/10 text-amber-550' : 'bg-indigo-500/10 text-indigo-550'
                    }`}>
                      <LucideIcon name={accountStats.account.type === 'cash' ? 'Coins' : 'CreditCard'} size={28} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-950 dark:text-white">{accountStats.account.name}</h2>
                      <span className="text-xs bg-slate-200/50 dark:bg-slate-750 text-slate-500 px-2.5 py-0.5 rounded-full font-medium inline-block mt-0.5 uppercase tracking-wider">
                        {accountStats.account.type} balance ledger
                      </span>
                    </div>
                  </div>

                  {/* Actions (Update Starting Balance or Delete account) */}
                  <div className="flex items-center gap-2">
                    {editBalanceId === accountStats.account.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          className="bg-white dark:bg-slate-900 border border-slate-200 text-xs px-2 py-1 w-24 rounded-lg focus:ring-1 focus:ring-emerald-500"
                          value={editBalanceVal}
                          onChange={(e) => setEditBalanceVal(e.target.value)}
                        />
                        <button
                          onClick={() => saveBalanceAdjustment(accountStats.account.id)}
                          className="p-1.5 bg-emerald-500 text-white rounded-lg cursor-pointer"
                        >
                          <LucideIcon name="Check" size={12} />
                        </button>
                        <button
                          onClick={() => setEditBalanceId(null)}
                          className="p-1.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-350 rounded-lg cursor-pointer"
                        >
                          <LucideIcon name="X" size={12} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditBalanceId(accountStats.account.id);
                          setEditBalanceVal(accountStats.account.balance.toString());
                        }}
                        className="px-2.5 py-1.5 cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-lg text-xs text-slate-500 dark:text-slate-400 border border-slate-150 dark:border-slate-750 flex items-center gap-1 font-medium transition-colors"
                        title="Adjust Starting Base Balance"
                      >
                        <LucideIcon name="Edit3" size={12} />
                        Adjust Base
                      </button>
                    )}

                    {accountStats.account.isCustom && (
                      <button
                        onClick={() => {
                          window.showConfirm?.(
                            `🚨 Are you sure you want to delete account "${accountStats.account.name}"?\nThis removes starting balance records. Make sure no transactions depend on this account first.`,
                            () => {
                              onDeleteAccount(accountStats.account.id);
                              setSelectedAccountId(accounts[0]?.id || '');
                            }
                          );
                        }}
                        className="px-2.5 py-1.5 cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg text-xs text-rose-500 border border-rose-100 dark:border-rose-900/50 flex items-center gap-1 font-medium transition-colors"
                        title="Delete Entire Account"
                      >
                        <LucideIcon name="Trash2" size={12} />
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {/* Account Details Box */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-150 dark:border-slate-800">
                  <div className="space-y-0.5">
                    <span className="text-[10px] sm:text-xs text-slate-400 font-semibold uppercase">Current Balance</span>
                    <div className="text-lg sm:text-xl font-bold font-mono text-emerald-500 text-slate-900 dark:text-white">
                      {formatPKR(accountStats.account.balance, currency)}
                    </div>
                  </div>
                  
                  <div className="space-y-0.5 border-l border-slate-150 dark:border-slate-800 pl-4 sm:pl-6">
                    <span className="text-[10px] sm:text-xs text-slate-400 font-semibold uppercase">Total Inflow</span>
                    <div className="text-lg sm:text-xl font-bold font-mono text-emerald-500">
                      +{formatPKR(accountStats.totalIncome + accountStats.transferIns, currency)}
                    </div>
                  </div>

                  <div className="space-y-0.5 border-l border-slate-150 dark:border-slate-800 pl-4 sm:pl-6">
                    <span className="text-[10px] sm:text-xs text-slate-400 font-semibold uppercase">Total Outflow</span>
                    <div className="text-lg sm:text-xl font-bold font-mono text-rose-500">
                      -{formatPKR(accountStats.totalExpense + accountStats.transferOuts, currency)}
                    </div>
                  </div>

                  <div className="space-y-0.5 border-l border-slate-150 dark:border-slate-800 pl-4 sm:pl-6">
                    <span className="text-[10px] sm:text-xs text-slate-400 font-semibold uppercase">Transaction Vol</span>
                    <div className="text-lg sm:text-xl font-semibold text-slate-650 dark:text-slate-350">
                      {accountStats.ledger.length} records
                    </div>
                  </div>
                </div>
              </div>

              {/* Transactions Ledger Log */}
              <div className="flex-1 p-6 overflow-y-auto max-h-[450px]">
                <h3 className="font-bold text-sm text-slate-950 dark:text-white mb-4">Chronological Statement Ledger</h3>
                
                {accountStats.ledger.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 italic">
                    No ledger flows recorded on {accountStats.account.name}. Earn, deposit, or record expenses to populate lists.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {accountStats.ledger.map((item) => {
                      const { name: catName, icon: catIcon } = getCategoryNameAndIcon(item.categoryId);
                      const isIncome = item.type === 'income';

                      return (
                        <div key={item.id} className="py-3 flex items-center justify-between text-xs sm:text-sm">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              item.isTransfer 
                                ? 'bg-amber-500/10 text-amber-550' 
                                : isIncome 
                                  ? 'bg-emerald-500/15 text-emerald-500' 
                                  : 'bg-rose-500/15 text-rose-500'
                            }`}>
                              <LucideIcon name={catIcon} size={15} />
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-white">
                                {item.description || catName}
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                                <span>{formatDate(item.date)}</span>
                                <span className="w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
                                <span className={isIncome ? 'text-emerald-500 font-medium' : 'text-rose-500 font-medium'}>
                                  {item.badgeText}
                                </span>
                              </div>
                            </div>
                          </div>

                          <span className={`font-semibold font-mono text-sm ${
                            isIncome ? 'text-emerald-500' : 'text-rose-500'
                          }`}>
                            {isIncome ? '+' : '-'}{formatPKR(item.amount, currency)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-16 text-center text-slate-400 h-full flex flex-col justify-center items-center">
              Please select or create an account in the left panel to load the double-entry accounting ledger statement.
            </div>
          )}
        </div>

      </div>

      {/* Account Deletion Confirmation Modal */}
      {accountToDelete && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity"
            onClick={() => setAccountToDelete(null)}
          />
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative z-10 transform scale-100 flex flex-col space-y-4 animate-fade-in">
            <div className="flex flex-col items-center text-center space-y-3 pb-2">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center text-red-500 dark:text-red-400 shrink-0 select-none">
                <LucideIcon name="AlertTriangle" size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg tracking-tight">
                  Delete Account?
                </h3>
                <span className="text-[10px] text-red-500 dark:text-red-400 font-mono tracking-widest uppercase block font-black">
                  Irreversible Action
                </span>
              </div>
            </div>

            <div className="space-y-2 text-center">
              <p className="text-xs text-slate-650 dark:text-slate-300 leading-relaxed font-semibold">
                Are you sure you want to delete the account <strong className="text-slate-950 dark:text-white">"{accountToDelete.name}"</strong>?
              </p>
              <p className="text-[11px] text-slate-450 dark:text-slate-500 leading-normal">
                This will delete any transaction entries associated specifically with this wallet/account. Remaining balances on other accounts will not be affected.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAccountToDelete(null)}
                className="flex-1 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 border border-slate-150 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-extrabold text-xs rounded-xl transition cursor-pointer select-none text-center"
              >
                No, Keep It
              </button>
              
              <button
                type="button"
                onClick={() => {
                  onDeleteAccount(accountToDelete.id);
                  setAccountToDelete(null);
                  if (selectedAccountId === accountToDelete.id) {
                    const remaining = accounts.filter(a => a.id !== accountToDelete.id);
                    if (remaining.length > 0) {
                      setSelectedAccountId(remaining[0].id);
                    } else {
                      setSelectedAccountId('');
                    }
                  }
                }}
                className="flex-1 px-3.5 py-2.5 bg-red-500 hover:bg-red-650 text-white font-extrabold text-xs rounded-xl shadow-md hover:shadow transition flex items-center justify-center gap-1 cursor-pointer select-none"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
