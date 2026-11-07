/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useMemo } from 'react';
import { Transaction, Account, Category } from '../types';
import { formatPKR, formatDate } from '../utils/financeHelpers';
import LucideIcon from './LucideIcon';
import CustomSelect from './CustomSelect';

interface TransactionsLedgerProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
  onOpenAddModal: () => void;
  currency: string;
}

export default function TransactionsLedger({
  transactions,
  accounts,
  categories,
  onEdit,
  onDelete,
  onOpenAddModal,
  currency
}: TransactionsLedgerProps) {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filtering state
  const [activeRange, setActiveRange] = useState<'all' | 'week' | 'month' | 'custom'>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Dropdown filter properties
  const [filterAccountId, setFilterAccountId] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

  // Compute boundaries for Week/Month filters (base mock date is UTC June 1st, 2026)
  const filterDateBoundaries = useMemo(() => {
    const today = new Date('2026-06-01');
    
    // Last week (subtract 7 days)
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);
    
    // Month start (June 1st)
    const monthStart = '2026-06-01';

    return {
      weekAgoStr: weekAgo.toISOString().substring(0, 10),
      monthStartStr: monthStart
    };
  }, []);

  // Filter joint dataset
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // 1. Search Query selection
      const catName = categories.find(c => c.id === t.categoryId)?.name || '';
      const accName = accounts.find(a => a.id === t.accountId)?.name || '';
      const tagsString = t.tags ? t.tags.join(' ') : '';
      const query = searchQuery.toLowerCase();

      const matchesSearch = 
        catName.toLowerCase().includes(query) ||
        accName.toLowerCase().includes(query) ||
        tagsString.toLowerCase().includes(query) ||
        (t.description || '').toLowerCase().includes(query) ||
        t.amount.toString().includes(query) ||
        t.date.includes(query);

      if (!matchesSearch) return false;

      // 2. Type Filter selection
      if (filterType !== 'all' && t.type !== filterType) return false;

      // 3. Account selection
      if (filterAccountId && t.accountId !== filterAccountId) return false;

      // 4. Category selection
      if (filterCategoryId && t.categoryId !== filterCategoryId) return false;

      // 5. Date Boundaries selection
      if (activeRange === 'week' && t.date < filterDateBoundaries.weekAgoStr) return false;
      if (activeRange === 'month' && !t.date.startsWith('2026-06')) return false;
      if (activeRange === 'custom') {
        if (customStart && t.date < customStart) return false;
        if (customEnd && t.date > customEnd) return false;
      }

      return true;
    }).sort((a, b) => b.date.localeCompare(a.date)); // descending sorted (newest first)
  }, [
    transactions,
    searchQuery,
    filterType,
    filterAccountId,
    filterCategoryId,
    activeRange,
    customStart,
    customEnd,
    filterDateBoundaries,
    categories,
    accounts
  ]);

  const getCategoryDetails = (catId: string) => {
    if (catId === 'cat_transfer_fee') {
      return { id: 'cat_transfer_fee', name: 'Transaction Charges', type: 'expense', icon: 'Percent' };
    }
    return categories.find(c => c.id === catId) || { name: 'Unknown Category', icon: 'HelpCircle' };
  };

  const getAccountName = (accId: string) => {
    return accounts.find(a => a.id === accId)?.name || 'Unknown Account';
  };

  return (
    <div className="space-y-6">
      
      {/* Header and Quick stats */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-950 dark:text-white flex items-center gap-2">
            <LucideIcon name="History" className="text-emerald-500" />
            Financial Statement Journal
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Search, filter, edit, or remove expense records and income statements. Add entries into cash accounts or digital bank vaults.
          </p>
        </div>

        <button
          onClick={onOpenAddModal}
          className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm hover:shadow transition-all cursor-pointer self-start md:self-auto"
        >
          <LucideIcon name="Plus" size={16} />
          Log New Transaction
        </button>
      </div>

      {/* Advanced Filters Drawer Panel */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
        <h4 className="text-xs font-semibold text-slate-450 uppercase tracking-wider flex items-center gap-1.5">
          <LucideIcon name="Sliders" size={14} className="text-slate-400" />
          Filter Statements & Search Logs
        </h4>

        {/* Global search entry */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <LucideIcon name="Search" className="text-slate-400 dark:text-slate-500" size={16} />
          </div>
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100/50 dark:hover:bg-slate-800 border-0 rounded-2xl text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white transition-all"
            placeholder="Search statement fields (Description, tags, specific amount PKR, bank details)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Row Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          
          {/* Timeline Range Filter preset Buttons */}
          <div className="md:col-span-1 space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 block uppercase">Timeline preset</label>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-50 dark:bg-slate-850 p-1 rounded-xl">
              <button
                onClick={() => setActiveRange('all')}
                className={`py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                  activeRange === 'all' ? 'bg-white dark:bg-slate-700 text-slate-950 dark:text-white shadow-xs' : 'text-slate-500'
                }`}
              >
                All States
              </button>
              <button
                onClick={() => setActiveRange('week')}
                className={`py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                  activeRange === 'week' ? 'bg-white dark:bg-slate-700 text-slate-950 dark:text-white shadow-xs' : 'text-slate-500'
                }`}
              >
                Last 7d
              </button>
              <button
                onClick={() => setActiveRange('month')}
                className={`py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                  activeRange === 'month' ? 'bg-white dark:bg-slate-700 text-slate-950 dark:text-white shadow-xs' : 'text-slate-500'
                }`}
              >
                Current Mon
              </button>
              <button
                onClick={() => setActiveRange('custom')}
                className={`py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer ${
                  activeRange === 'custom' ? 'bg-white dark:bg-slate-700 text-slate-950 dark:text-white shadow-xs' : 'text-slate-500'
                }`}
              >
                Custom Range
              </button>
            </div>
          </div>

          {/* Type picker dropdown */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 block uppercase">Flow Type</label>
            <CustomSelect
              options={[
                { value: 'all', label: 'All Flows (Incomes + Expenses)', icon: 'Filter' },
                { value: 'income', label: 'Inflows Only', icon: 'TrendingUp' },
                { value: 'expense', label: 'Outflows Only', icon: 'TrendingDown' }
              ]}
              value={filterType}
              onChange={(val) => setFilterType(val as any)}
              placeholder="All Flows"
            />
          </div>

          {/* Account Filter dropdown */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 block uppercase">Assets Account</label>
            <CustomSelect
              options={[
                { value: '', label: 'All Accounts', icon: 'Wallet' },
                ...accounts.map(acc => ({
                  value: acc.id,
                  label: acc.name,
                  icon: acc.icon || (acc.type === 'cash' ? 'Wallet' : 'CreditCard')
                }))
              ]}
              value={filterAccountId}
              onChange={(val) => setFilterAccountId(val)}
              placeholder="All Accounts"
            />
          </div>

          {/* Category selection */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 block uppercase">Category</label>
            <CustomSelect
              options={[
                { value: '', label: 'All Categories', icon: 'Grid' },
                ...categories.map(cat => ({
                  value: cat.id,
                  label: cat.name,
                  icon: cat.icon
                }))
              ]}
              value={filterCategoryId}
              onChange={(val) => setFilterCategoryId(val)}
              placeholder="All Categories font-bold"
            />
          </div>

        </div>

        {/* Custom date range panel */}
        {activeRange === 'custom' && (
          <div className="grid grid-cols-2 gap-4 border border-slate-100 p-3 rounded-2xl bg-slate-50/50 dark:bg-slate-850 dark:border-slate-800 animate-fadeIn">
            <div>
              <label className="text-[10px] text-slate-450 block uppercase mb-1">Start Date</label>
              <input
                type="date"
                className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs border-0 rounded-xl px-3 py-1.5"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-450 block uppercase mb-1">End Date</label>
              <input
                type="date"
                className="w-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs border-0 rounded-xl px-3 py-1.5"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Counter Results banner */}
        <div className="flex justify-between items-center text-xs text-slate-400 pt-2 border-t border-slate-50 dark:border-slate-850">
          <span>Renders showing **{filteredTransactions.length}** matches of local data journal</span>
          {(searchQuery || filterType !== 'all' || filterAccountId || filterCategoryId || activeRange !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterType('all');
                setFilterAccountId('');
                setFilterCategoryId('');
                setActiveRange('all');
                setCustomStart('');
                setCustomEnd('');
              }}
              className="text-emerald-500 font-semibold hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <LucideIcon name="X" size={12} />
              Reset All Filters
            </button>
          )}
        </div>
      </div>

      {/* Renders Tabular Data Grid */}
      {filteredTransactions.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-16 border border-slate-100 dark:border-slate-800 shadow-sm text-center">
          <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-450">
            <LucideIcon name="History" size={28} />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">Zero Journal Records Found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Try resetting your search parameter, adjusting your custom dates range, or log a fresh inflow/outflow transaction.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-850 text-slate-450 text-[10px] sm:text-xs uppercase tracking-wider bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="p-4 pl-6">Journal Date</th>
                  <th className="p-4">Transaction Summary</th>
                  <th className="p-4">Payer / Payee Wallet Details</th>
                  <th className="p-4 text-right">Accounting Value</th>
                  <th className="p-4 text-center">Receipt</th>
                  <th className="p-4 pr-6 text-right">Control Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-355">
                {filteredTransactions.map((tx) => {
                  const cat = getCategoryDetails(tx.categoryId);
                  const isIncome = tx.type === 'income';

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-850/20 group">
                      
                      {/* Date */}
                      <td className="p-4 pl-6 whitespace-nowrap text-slate-500 font-medium text-xs">
                        {formatDate(tx.date)}
                      </td>

                      {/* Summary */}
                      <td className="p-4 min-w-[200px]">
                        <div className="flex items-center gap-2.5">
                          {/* Circle Icon Badge */}
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            isIncome ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                          }`}>
                            <LucideIcon name={cat.icon} size={16} />
                          </div>
                          
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">{cat.name}</span>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                isIncome ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-450' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-450'
                              }`}>
                                {isIncome ? 'Inflow' : 'Outflow'}
                              </span>
                            </div>

                            {tx.description && (
                              <span className="text-xs text-slate-500 block mt-0.5 max-w-[250px] truncate leading-none">
                                {tx.description}
                              </span>
                            )}

                            {tx.tags && tx.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {tx.tags.map(t => (
                                  <span key={t} className="bg-slate-50 dark:bg-slate-850 text-slate-550 border border-slate-100/50 dark:border-slate-800 text-[9px] px-1.5 py-0.5 rounded">
                                    #{t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Account details */}
                      <td className="p-4 text-slate-650 dark:text-slate-350 whitespace-nowrap text-xs">
                        {getAccountName(tx.accountId)}
                      </td>

                      {/* Value mapping */}
                      <td className={`p-4 font-bold font-mono text-right whitespace-nowrap ${
                        isIncome ? 'text-emerald-500' : 'text-rose-500'
                      }`}>
                        {isIncome ? '+' : '-'}{formatPKR(tx.amount, currency)}
                      </td>

                      {/* Receipt Indicator vault clicker */}
                      <td className="p-4 text-center">
                        {tx.receiptImage ? (
                          <div className="w-8 h-8 rounded bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-750 overflow-hidden relative group/img cursor-pointer mx-auto">
                            <img src={tx.receiptImage} alt="receipt" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-700 font-semibold">-</span>
                        )}
                      </td>

                      {/* Transaction adjustments Controls */}
                      <td className="p-4 pr-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5 transition-opacity">
                          
                          {/* Edit Toggle */}
                          <button
                            onClick={() => onEdit(tx)}
                            className="p-1.5 cursor-pointer text-slate-450 hover:text-emerald-500 dark:text-slate-550 hover:dark:text-emerald-450 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Edit Statement"
                          >
                            <LucideIcon name="Edit" size={15} />
                          </button>

                          {/* Delete ledger entry */}
                          <button
                            onClick={() => {
                              window.showConfirm?.(
                                `🚨 WARNING: Delete transaction record (${cat.name} - ${formatPKR(tx.amount, currency)})?\nAccount balances will immediately roll back!`,
                                () => {
                                  onDelete(tx.id);
                                }
                              );
                            }}
                            className="p-1.5 cursor-pointer text-slate-450 hover:text-rose-500 dark:text-slate-550 hover:dark:text-rose-455 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Delete permanently"
                          >
                            <LucideIcon name="Trash2" size={15} />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
