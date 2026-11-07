/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Account, DebtEntry, DebtPayment } from '../types';
import { formatPKR, formatDate } from '../utils/financeHelpers';
import LucideIcon from './LucideIcon';

interface DebtsModuleProps {
  debts: DebtEntry[];
  accounts: Account[];
  onAddDebt: (debt: Omit<DebtEntry, 'id' | 'repaidAmount' | 'payments' | 'status'>, adjustWallet: boolean) => void;
  onAddRepayment: (debtId: string, payment: Omit<DebtPayment, 'id'>, adjustWallet: boolean) => void;
  onSettleDebt: (debtId: string, accountId: string, adjustWallet: boolean) => void;
  onDeleteDebt: (debtId: string) => void;
  currency: string;
}

export default function DebtsModule({
  debts = [],
  accounts = [],
  onAddDebt,
  onAddRepayment,
  onSettleDebt,
  onDeleteDebt,
  currency
}: DebtsModuleProps) {
  // Navigation State
  const [filterType, setFilterType] = useState<'all' | 'gave' | 'taken' | 'settled'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Active Selections
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    type: 'gave' as 'gave' | 'taken',
    personName: '',
    amount: '',
    accountId: accounts[0]?.id || '',
    dueDate: '',
    description: '',
    adjustWallet: true
  });

  const [activeRepayDebt, setActiveRepayDebt] = useState<DebtEntry | null>(null);
  const [repayForm, setRepayForm] = useState({
    amount: '',
    accountId: accounts[0]?.id || '',
    date: new Date().toISOString().substring(0, 10),
    notes: '',
    adjustWallet: true
  });

  const [activeSettleDebt, setActiveSettleDebt] = useState<DebtEntry | null>(null);
  const [settleForm, setSettleForm] = useState({
    accountId: accounts[0]?.id || '',
    adjustWallet: true
  });

  const [debtToDelete, setDebtToDelete] = useState<DebtEntry | null>(null);
  const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null);

  // Form Resets
  const resetAddForm = () => {
    setAddForm({
      type: 'gave',
      personName: '',
      amount: '',
      accountId: accounts[0]?.id || '',
      dueDate: '',
      description: '',
      adjustWallet: true
    });
  };

  const resetRepayForm = (debt: DebtEntry) => {
    setRepayForm({
      amount: '',
      accountId: debt.accountId || accounts[0]?.id || '',
      date: new Date().toISOString().substring(0, 10),
      notes: '',
      adjustWallet: true
    });
  };

  // Math Metrics
  const metrics = useMemo(() => {
    let loanedOutPending = 0; // "gave" type active remaining
    let borrowedPending = 0;  // "taken" type active remaining
    let totalSettledCount = 0;

    debts.forEach(d => {
      if (d.status === 'settled') {
        totalSettledCount++;
      } else {
        const remaining = Math.max(0, d.amount - d.repaidAmount);
        if (d.type === 'gave') {
          loanedOutPending += remaining;
        } else {
          borrowedPending += remaining;
        }
      }
    });

    return {
      loanedOutPending,
      borrowedPending,
      netDifference: loanedOutPending - borrowedPending,
      totalSettledCount
    };
  }, [debts]);

  // Filtering list
  const filteredDebts = useMemo(() => {
    return debts.filter(d => {
      // Filter Type match
      if (filterType === 'gave' && (d.type !== 'gave' || d.status === 'settled')) return false;
      if (filterType === 'taken' && (d.type !== 'taken' || d.status === 'settled')) return false;
      if (filterType === 'settled' && d.status !== 'settled') return false;
      if (filterType === 'all' && d.status === 'settled') {
        // In "all" view, we keep settled but maybe prioritize active unless searched or small set
      }

      // Search matching
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          d.personName.toLowerCase().includes(q) ||
          d.description?.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [debts, filterType, searchQuery]);

  // Form submit handlers
  const handleCreateDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.personName.trim()) {
      alert('Please enter a target person or organization name.');
      return;
    }
    const amt = parseFloat(addForm.amount);
    if (!amt || amt <= 0) {
      alert('Please specify a positive valid loan amount.');
      return;
    }

    onAddDebt({
      type: addForm.type,
      personName: addForm.personName.trim(),
      amount: amt,
      accountId: addForm.accountId,
      dueDate: addForm.dueDate || undefined,
      dateCreated: new Date().toISOString().substring(0, 10),
      description: addForm.description.trim() || undefined
    }, addForm.adjustWallet);

    setIsAddModalOpen(false);
    resetAddForm();
  };

  const handlePostRepayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRepayDebt) return;

    const amt = parseFloat(repayForm.amount);
    if (!amt || amt <= 0) {
      alert('Please specify a positive repayment amount.');
      return;
    }

    const maxRepay = activeRepayDebt.amount - activeRepayDebt.repaidAmount;
    if (amt > maxRepay + 0.01) {
      alert(`Repayment amount exceeds the total pending debt balance of ${formatPKR(maxRepay, currency)}.`);
      return;
    }

    onAddRepayment(activeRepayDebt.id, {
      amount: amt,
      accountId: repayForm.accountId,
      date: repayForm.date,
      notes: repayForm.notes.trim() || undefined
    }, repayForm.adjustWallet);

    setActiveRepayDebt(null);
  };

  const handleSettleFull = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSettleDebt) return;

    onSettleDebt(activeSettleDebt.id, settleForm.accountId, settleForm.adjustWallet);
    setActiveSettleDebt(null);
  };

  const toggleExpandDebt = (debtId: string) => {
    setExpandedDebtId(prev => (prev === debtId ? null : debtId));
  };

  return (
    <div className="space-y-6 animate-fade-in" id="debts_module_root">
      
      {/* Upper overview stats - Debit cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Loaned Out (Receivable) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Loaned Out (Receivable)</span>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {formatPKR(metrics.loanedOutPending, currency)}
            </h3>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">Money others owe you</span>
          </div>
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/40 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <LucideIcon name="ArrowUpRight" size={24} />
          </div>
        </div>

        {/* Total Borrowed (Payable) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Borrowed (Payable)</span>
            <h3 className="text-2xl font-black text-red-600 dark:text-red-400 leading-tight">
              {formatPKR(metrics.borrowedPending, currency)}
            </h3>
            <span className="text-[10px] text-red-500 font-bold block">Money you owe others</span>
          </div>
          <div className="w-12 h-12 bg-red-100 dark:bg-red-950/40 rounded-xl flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
            <LucideIcon name="ArrowDownLeft" size={24} />
          </div>
        </div>

        {/* Net Stance Position */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Net Position</span>
            <h3 className={`text-2xl font-black leading-tight ${metrics.netDifference >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {metrics.netDifference >= 0 ? '+' : ''}{formatPKR(metrics.netDifference, currency)}
            </h3>
            <span className="text-[10px] text-slate-450 block">Net recoverable amount</span>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${metrics.netDifference >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450'}`}>
            <LucideIcon name="Scale" size={24} />
          </div>
        </div>

        {/* Settled Registry count */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Zero Debt Settled</span>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {metrics.totalSettledCount} Entries
            </h3>
            <span className="text-[10px] text-indigo-500 font-bold block">100% completed & fully paid</span>
          </div>
          <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-950/40 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
            <LucideIcon name="BadgeCheck" size={24} />
          </div>
        </div>

      </div>

      {/* Control panel & tab selectors */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          
          {/* Sub-tabs filtering */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-100 dark:border-slate-850 self-start">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all ${
                filterType === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-xs'
                  : 'text-slate-500/80 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              All Active
            </button>
            <button
              onClick={() => setFilterType('gave')}
              className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all ${
                filterType === 'gave'
                  ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-xs'
                  : 'text-slate-500/80 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Loaned Out
            </button>
            <button
              onClick={() => setFilterType('taken')}
              className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all ${
                filterType === 'taken'
                  ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-xs'
                  : 'text-slate-500/80 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Borrowed
            </button>
            <button
              onClick={() => setFilterType('settled')}
              className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-all ${
                filterType === 'settled'
                  ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-xs'
                  : 'text-slate-500/80 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              History (Settled)
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-grow sm:flex-none justify-end">
            {/* Search Input */}
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400">
                <LucideIcon name="Search" size={14} />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name or details..."
                className="pl-8.5 pr-4 py-2 w-full sm:w-56 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 dark:text-white transition"
              />
            </div>

            {/* Create loan button */}
            <button
              onClick={() => {
                resetAddForm();
                setIsAddModalOpen(true);
              }}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LucideIcon name="PlusCircle" size={14} />
              Record Debt / Loan
            </button>
          </div>

        </div>

        {/* Listing section */}
        {filteredDebts.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 bg-slate-50/50 dark:bg-slate-950/20 border border-dashed border-slate-150 dark:border-slate-850 rounded-2xl">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-850 flex items-center justify-center text-slate-400">
              <LucideIcon name="Coins" size={24} />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">No matching loans or debts recorded</p>
              <p className="text-[11px] text-slate-400 max-w-sm px-4">
                {searchQuery 
                  ? 'No entries match your search request query parameters.'
                  : 'Start tracking loans given to friends or relatives, or borrowed bills by clicking on the Record button.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDebts.map(d => {
              const remaining = Math.max(0, d.amount - d.repaidAmount);
              const progressPercentage = Math.min(100, Math.round((d.repaidAmount / d.amount) * 100));
              const isSettled = d.status === 'settled' || remaining <= 0;
              const isGave = d.type === 'gave';
              const isExpanded = expandedDebtId === d.id;
              
              // Find source account
              const origAcc = accounts.find(a => a.id === d.accountId)?.name || 'Deleted Account';

              return (
                <div 
                  key={d.id} 
                  className={`border rounded-2xl transition hover:border-slate-350 dark:hover:border-slate-750 flex flex-col overflow-hidden ${
                    isExpanded 
                      ? 'border-indigo-500/40 bg-slate-100/5 dark:bg-slate-850/10' 
                      : isSettled
                        ? 'border-slate-100 dark:border-slate-850 opacity-75'
                        : isGave 
                          ? 'border-slate-200 dark:border-slate-800'
                          : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  
                  {/* Row Summary */}
                  <div 
                    onClick={() => toggleExpandDebt(d.id)}
                    className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 cursor-pointer select-none"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Lend type badge representation */}
                      <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                        isSettled
                          ? 'bg-slate-105 text-slate-400 dark:bg-slate-800'
                          : isGave
                            ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 animate-pulse'
                            : 'bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 animate-pulse'
                      }`}>
                        <LucideIcon name={isSettled ? "CheckCircle2" : isGave ? "ArrowUpRight" : "ArrowDownLeft"} size={18} />
                      </div>

                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base leading-tight truncate">
                            {d.personName}
                          </span>
                          <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md ${
                            isSettled
                              ? 'bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
                              : isGave
                                ? 'bg-emerald-500/10 text-emerald-650 dark:text-emerald-400'
                                : 'bg-red-500/10 text-red-650 dark:text-red-400'
                          }`}>
                            {isSettled ? 'Fully Settled' : isGave ? 'You Lent Out' : 'You Borrowed'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                          <span className="flex items-center gap-1">
                            <LucideIcon name="Calendar" size={12} className="opacity-75" />
                            {formatDate(d.dateCreated)}
                          </span>
                          {d.dueDate && !isSettled && (
                            <span className={`flex items-center gap-1 font-semibold ${
                              new Date(d.dueDate) < new Date() ? 'text-red-500 font-bold' : ''
                            }`}>
                              <LucideIcon name="Clock" size={12} />
                              Due: {formatDate(d.dueDate)}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <LucideIcon name="Wallet" size={12} className="opacity-75" />
                            Origin: {origAcc}
                          </span>
                        </div>

                        {d.description && (
                          <p className="text-xs text-slate-450 dark:text-slate-400 line-clamp-1 italic mt-1 font-semibold">
                            "{d.description}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Progress indicators & remaining value */}
                    <div className="flex sm:flex-col items-end justify-between sm:justify-center w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 gap-2.5">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-450 block font-semibold">Balance Pending</span>
                        <span className={`text-base font-black ${
                          isSettled
                            ? 'text-slate-400 line-through'
                            : isGave
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-600 dark:text-red-400'
                        }`}>
                          {formatPKR(remaining, currency)}
                        </span>
                      </div>

                      {/* Micro Progress Bar overlay */}
                      <div className="w-24 sm:w-28 space-y-1">
                        <div className="flex items-center justify-between text-[9px] font-mono text-slate-450">
                          <span>Paid: {progressPercentage}%</span>
                          <span>{formatPKR(d.repaidAmount, currency)}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              isSettled 
                                ? 'bg-indigo-500' 
                                : isGave 
                                  ? 'bg-emerald-500' 
                                  : 'bg-red-500'
                            }`}
                            style={{ width: `${progressPercentage}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Dropdown toggle visual indicator */}
                    <div className="text-slate-400 dark:text-slate-500 self-center hidden sm:block">
                      <LucideIcon name={isExpanded ? "ChevronUp" : "ChevronDown"} size={16} />
                    </div>

                  </div>

                  {/* Expanded Section (Detailed Audit, Partial Repayment Records, Actions) */}
                  {isExpanded && (
                    <div className="p-4 border-t border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-900/60 flex flex-col space-y-4 animate-slide-up">
                      
                      {/* Section details */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        
                        {/* Summary left card */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3.5 rounded-xl space-y-2.5">
                          <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                            <LucideIcon name="Info" size={13} className="text-slate-500" />
                            Debt Specifications
                          </h4>
                          <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <div className="flex justify-between">
                              <span>Total Loan:</span>
                              <strong className="text-slate-850 dark:text-white">{formatPKR(d.amount, currency)}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span>Total Repaid:</span>
                              <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{formatPKR(d.repaidAmount, currency)}</strong>
                            </div>
                            <div className="flex justify-between border-t border-slate-100 dark:border-slate-800 pt-1.5 mt-1">
                              <span>Remaining Owed:</span>
                              <strong className={`font-black ${isSettled ? 'text-slate-450' : isGave ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                                {formatPKR(remaining, currency)}
                              </strong>
                            </div>
                          </div>
                        </div>

                        {/* Middle detailed list - Payments register ("kis mai wapis mila") */}
                        <div className="col-span-1 md:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3.5 rounded-xl space-y-2 flex flex-col max-h-[220px]">
                          <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5 shrink-0">
                            <LucideIcon name="History" size={13} className="text-indigo-500" />
                            Repayment Payment Ledger
                          </h4>
                          
                          <div className="overflow-y-auto flex-1 space-y-1.5 pr-1 text-slate-500 dark:text-slate-400">
                            {d.payments.length === 0 ? (
                              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                                <span className="text-[11px] font-semibold text-slate-400">No repayment receipts recorded yet.</span>
                              </div>
                            ) : (
                              d.payments.map((p, idx) => {
                                const pmAcc = accounts.find(a => a.id === p.accountId)?.name || 'Deleted Account';
                                return (
                                  <div key={p.id} className="p-2 border border-slate-100 dark:border-slate-800 rounded-lg flex items-center justify-between text-xs bg-slate-50/50 dark:bg-slate-950/30 gap-2">
                                    <div className="space-y-0.5 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-extrabold text-slate-800 dark:text-white text-xs">
                                          Installment {idx + 1}:
                                        </span>
                                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-450 px-1.5 py-0.2 rounded font-mono">
                                          {formatDate(p.date)}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1.5 text-[10px] text-slate-455 font-semibold">
                                        <LucideIcon name="Wallet" size={10} />
                                        <span>Wallet Adjusted: <strong>{pmAcc}</strong></span>
                                      </div>
                                      {p.notes && (
                                        <p className="text-[10px] italic text-slate-450 truncate">
                                          "{p.notes}"
                                        </p>
                                      )}
                                    </div>

                                    <div className="text-right shrink-0">
                                      <span className="font-black text-emerald-600 dark:text-emerald-400 text-xs text-nowrap">
                                        +{formatPKR(p.amount, currency)}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>

                      </div>

                      {/* Active Actions Line Drawer */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
                        
                        {/* Left action panel */}
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          {!isSettled && (
                            <>
                              {/* Add Repayment Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  resetRepayForm(d);
                                  setActiveRepayDebt(d);
                                }}
                                className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-lg transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                              >
                                <LucideIcon name="BadgePlus" size={12} />
                                Post Repayment
                              </button>

                              {/* Settle Remaining Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSettleForm({
                                    accountId: d.accountId || accounts[0]?.id || '',
                                    adjustWallet: true
                                  });
                                  setActiveSettleDebt(d);
                                }}
                                className="px-3.5 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-extrabold text-xs rounded-lg transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                              >
                                <LucideIcon name="BadgeCheck" size={12} />
                                Settle Balance
                              </button>
                            </>
                          )}
                        </div>

                        {/* Right: Trash Delete item */}
                        <button
                          type="button"
                          onClick={() => setDebtToDelete(d)}
                          className="px-3 py-1.5 text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 hover:bg-red-500/5 rounded-lg border border-transparent hover:border-red-500/10 transition flex items-center gap-1 cursor-pointer font-bold text-xs select-none ml-auto"
                        >
                          <LucideIcon name="Trash2" size={12} />
                          Delete Entry
                        </button>

                      </div>

                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* MODAL: Record Debt & Loan form */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity"
            onClick={() => setIsAddModalOpen(false)}
          />
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative z-10 transform scale-100 flex flex-col space-y-4 animate-fade-in max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <LucideIcon name="Coins" size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                    Record New Debt / Loan
                  </h3>
                  <span className="text-[10px] text-slate-450 block font-semibold leading-tight mt-0.2">
                    Enter details to log receivables or liabilities
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-650 transition cursor-pointer"
              >
                <LucideIcon name="X" size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateDebt} className="space-y-4">
              
              {/* Type Switcher Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block">
                  Direction of Debt Entry
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-150 dark:border-slate-850">
                  <button
                    type="button"
                    onClick={() => setAddForm(prev => ({ ...prev, type: 'gave' }))}
                    className={`py-2 text-xs font-black rounded-lg transition-all ${
                      addForm.type === 'gave'
                        ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-100 dark:border-slate-800'
                        : 'text-slate-500 hover:text-slate-850 dark:text-slate-400'
                    }`}
                  >
                    Lent Out (They owe me)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddForm(prev => ({ ...prev, type: 'taken' }))}
                    className={`py-2 text-xs font-black rounded-lg transition-all ${
                      addForm.type === 'taken'
                        ? 'bg-white dark:bg-slate-900 text-red-500 dark:text-red-400 shadow-sm border border-slate-100 dark:border-slate-800'
                        : 'text-slate-500 hover:text-slate-850 dark:text-slate-400'
                    }`}
                  >
                    Borrowed (I owe them)
                  </button>
                </div>
              </div>

              {/* Person Name */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block">
                  Person / Organization Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Saif Bhai, Uncle Ali, Office advance"
                  value={addForm.personName}
                  onChange={(e) => setAddForm(prev => ({ ...prev, personName: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 dark:text-white transition"
                />
              </div>

              {/* Amount */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block">
                  Total Loan Amount ({currency}) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  min="1"
                  placeholder="e.g. 5000"
                  value={addForm.amount}
                  onChange={(e) => setAddForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none focus:border-emerald-500 dark:text-white transition"
                />
              </div>

              {/* Account/Wallet Selection */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block">
                  Associated Account / Wallet
                </label>
                <select
                  value={addForm.accountId}
                  onChange={(e) => setAddForm(prev => ({ ...prev, accountId: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 dark:text-white transition"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatPKR(acc.balance, currency)})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-450 leading-normal font-semibold">
                  Specify which wallet was used to dispatch/receive this amount.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Due date */}
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block">
                    Return Deadline / Due Date
                  </label>
                  <input
                    type="date"
                    value={addForm.dueDate}
                    onChange={(e) => setAddForm(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 dark:text-white transition"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block">
                    Description / Purpose
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Urgent car repair assistance"
                    value={addForm.description}
                    onChange={(e) => setAddForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 dark:text-white transition"
                  />
                </div>
              </div>

              {/* Option: Adjust cash flow immediately */}
              <div className="p-3 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/15 rounded-xl flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="add_adjust_wallet_cb"
                  checked={addForm.adjustWallet}
                  onChange={(e) => setAddForm(prev => ({ ...prev, adjustWallet: e.target.checked }))}
                  className="mt-1 accent-emerald-500 cursor-pointer w-4 h-4 shrink-0 rounded"
                />
                <div className="space-y-0.5">
                  <label htmlFor="add_adjust_wallet_cb" className="text-xs font-black text-slate-800 dark:text-white cursor-pointer select-none">
                    Adjust selected wallet balance automatically
                  </label>
                  <p className="text-[10px] text-slate-455 font-semibold leading-relaxed">
                    If enabled, this will immediately subtract (for Lent Out) or add (for Borrowed) the balance from the assigned account and file a statement row.
                  </p>
                </div>
              </div>

              {/* Submit / Cancel Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:text-slate-400 border border-transparent font-extrabold text-xs rounded-xl transition cursor-pointer select-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs select-none rounded-xl shadow-md hover:shadow-lg transition cursor-pointer"
                >
                  Save Entry
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL: Post partial repayment */}
      {activeRepayDebt && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity"
            onClick={() => setActiveRepayDebt(null)}
          />
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative z-10 transform scale-100 flex flex-col space-y-4 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <LucideIcon name="BadgePlus" size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base">
                    Log Repayment Installment
                  </h3>
                  <span className="text-[10px] text-slate-450 block font-semibold leading-tight mt-0.2">
                    Record partial amount returned by {activeRepayDebt.personName}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveRepayDebt(null)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-650 transition cursor-pointer"
              >
                <LucideIcon name="X" size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handlePostRepayment} className="space-y-4">
              
              <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-200/20 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span>Pending Debt Amount:</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-200">
                    {formatPKR(activeRepayDebt.amount - activeRepayDebt.repaidAmount, currency)}
                  </span>
                </div>
              </div>

              {/* Repay amount */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block">
                  Installment Repayment Amount ({currency}) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  min="1"
                  placeholder="e.g. 2000"
                  value={repayForm.amount}
                  onChange={(e) => setRepayForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold focus:outline-none focus:border-emerald-500 dark:text-white transition"
                />
              </div>

              {/* Repayment Account Destination/Inflow wallet */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-slate-700 dark:text-slate-300 block">
                  {activeRepayDebt.type === 'gave' ? 'Repayment Received In' : 'Repayment Paid From'} Accounts
                </label>
                <select
                  value={repayForm.accountId}
                  onChange={(e) => setRepayForm(prev => ({ ...prev, accountId: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 dark:text-white transition"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatPKR(acc.balance, currency)})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-450 leading-normal font-semibold">
                  Specify the target purse where this partial transaction movement occurred ("kis mai wapis mila").
                </p>
              </div>

              {/* Payment date / notes helper row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-35">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    Repayment Date
                  </label>
                  <input
                    type="date"
                    required
                    value={repayForm.date}
                    onChange={(e) => setRepayForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 dark:text-white transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                    Installment Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Paid via Easypaisa directly"
                    value={repayForm.notes}
                    onChange={(e) => setRepayForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 dark:text-white transition"
                  />
                </div>
              </div>

              {/* Options details */}
              <div className="p-3 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/15 rounded-xl flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="repay_adjust_wallet_cb"
                  checked={repayForm.adjustWallet}
                  onChange={(e) => setRepayForm(prev => ({ ...prev, adjustWallet: e.target.checked }))}
                  className="mt-1 accent-emerald-500 cursor-pointer w-4 h-4 shrink-0 rounded"
                />
                <div className="space-y-0.5">
                  <label htmlFor="repay_adjust_wallet_cb" className="text-xs font-black text-slate-800 dark:text-white cursor-pointer select-none">
                    Log transaction and adjust account balance
                  </label>
                  <p className="text-[10px] text-slate-455 font-semibold leading-relaxed">
                    This will adjust the chosen account cash ledger by either adding back (repayment received) or draining (returned borrowing) this installment.
                  </p>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveRepayDebt(null)}
                  className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 font-extrabold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow transition cursor-pointer"
                >
                  Record Installment
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL: Settle remaining balance completely */}
      {activeSettleDebt && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity"
            onClick={() => setActiveSettleDebt(null)}
          />
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative z-10 transform scale-100 flex flex-col space-y-4 animate-fade-in">
            <div className="flex flex-col items-center text-center space-y-3 pb-2">
              <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-550 shrink-0 select-none">
                <LucideIcon name="BadgeCheck" size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg tracking-tight">
                  Settle Full Balance
                </h3>
                <span className="text-[10px] text-indigo-500 font-mono tracking-widest uppercase block font-black">
                  Complete Settlement
                </span>
              </div>
            </div>

            <div className="space-y-3 text-center">
              <p className="text-xs text-slate-650 dark:text-slate-300 leading-relaxed font-semibold">
                This will settle the remaining balance of <strong className="text-slate-950 dark:text-white">{formatPKR(activeSettleDebt.amount - activeSettleDebt.repaidAmount, currency)}</strong> on the entry with <strong className="text-slate-950 dark:text-white">"{activeSettleDebt.personName}"</strong> completely.
              </p>

              {/* Settle Wallet account select */}
              <div className="text-left space-y-1 mt-2.5">
                <label className="text-[10px] font-black uppercase text-slate-500 block">Select destination balance wallet</label>
                <select
                  value={settleForm.accountId}
                  onChange={(e) => setSettleForm(prev => ({ ...prev, accountId: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-500 dark:text-white transition"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatPKR(acc.balance, currency)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Adjust wallet option checkbox */}
              <div className="p-2.5 bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100/10 rounded-xl flex items-start gap-2 text-left mt-2 whitespace-normal break-normal">
                <input
                  type="checkbox"
                  id="settle_adjust_wallet_cb"
                  checked={settleForm.adjustWallet}
                  onChange={(e) => setSettleForm(prev => ({ ...prev, adjustWallet: e.target.checked }))}
                  className="mt-1 accent-indigo-500 cursor-pointer w-4 h-4 shrink-0 rounded"
                />
                <div className="space-y-0.5">
                  <label htmlFor="settle_adjust_wallet_cb" className="text-[11px] font-extrabold text-slate-800 dark:text-white cursor-pointer select-none">
                    Apply payout transaction to wallet
                  </label>
                  <p className="text-[10px] text-slate-450 leading-relaxed font-medium">
                    Registers a final closure transaction under the chosen wallet and closes the debt completely.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveSettleDebt(null)}
                className="flex-1 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 border border-slate-150 dark:border-slate-800 text-slate-600 dark:text-slate-305 font-extrabold text-xs rounded-xl transition cursor-pointer select-none text-center"
              >
                Cancel
              </button>
              
              <button
                type="button"
                onClick={handleSettleFull}
                className="flex-1 px-3.5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-extrabold text-xs rounded-xl shadow transition flex items-center justify-center gap-1 cursor-pointer select-none"
              >
                Yes, Settle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Confirmation for deleting a debt completely */}
      {debtToDelete && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity"
            onClick={() => setDebtToDelete(null)}
          />
          
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative z-10 transform scale-100 flex flex-col space-y-4 animate-fade-in">
            <div className="flex flex-col items-center text-center space-y-3 pb-2">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center text-red-500 dark:text-red-400 shrink-0 select-none">
                <LucideIcon name="AlertTriangle" size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg tracking-tight">
                  Delete Debt Log?
                </h3>
                <span className="text-[10px] text-red-550 dark:text-red-400 font-mono tracking-widest uppercase block font-black">
                  Irreversible Removal
                </span>
              </div>
            </div>

            <div className="space-y-2 text-center">
              <p className="text-xs text-slate-650 dark:text-slate-300 leading-relaxed font-semibold">
                Are you sure you want to delete the debt record for <strong className="text-slate-950 dark:text-white">"{debtToDelete.personName}"</strong>?
              </p>
              <p className="text-[11px] text-slate-450 dark:text-slate-500 leading-normal">
                This removes all partial repayment receipts associated with this entry and cannot be undone. Underlying wallet balances are not automatically modified when deleting.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDebtToDelete(null)}
                className="flex-1 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 border border-slate-150 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-extrabold text-xs rounded-xl transition cursor-pointer select-none text-center"
              >
                No, Keep It
              </button>
              
              <button
                type="button"
                onClick={() => {
                  onDeleteDebt(debtToDelete.id);
                  setDebtToDelete(null);
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
