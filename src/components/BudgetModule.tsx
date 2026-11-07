/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Budget, Category, Transaction } from '../types';
import { formatPKR } from '../utils/financeHelpers';
import LucideIcon from './LucideIcon';
import CustomSelect from './CustomSelect';

interface BudgetModuleProps {
  budgets: Budget[];
  categories: Category[];
  transactions: Transaction[];
  onAddBudget: (categoryId: string, limit: number) => void;
  onDeleteBudget: (budgetId: string) => void;
  currency: string;
}

export default function BudgetModule({
  budgets,
  categories,
  transactions,
  onAddBudget,
  onDeleteBudget,
  currency
}: BudgetModuleProps) {
  const [selectedCatId, setSelectedCatId] = useState('');
  const [limitStr, setLimitStr] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Find expense categories only
  const expenseCategories = categories.filter(c => c.type === 'expense');

  // Filter out categories that already have a budget so they can be easily updated or only non-budgeted are added
  const availableCategoriesForBudget = expenseCategories.filter(
    c => !budgets.some(b => b.categoryId === c.id)
  );

  // Get current year and month (YYYY-MM) based on current UTC time to calculate current month expenses
  const currentYearMonth = '2026-06'; // Base time mock/metadata is 2026-06-01

  // Compute actual spending per category in current month
  const getCategorySpendingThisMonth = (categoryId: string) => {
    return transactions
      .filter(t => t.type === 'expense' && t.categoryId === categoryId && t.date.startsWith(currentYearMonth))
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const handleCreateBudget = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedCatId) {
      setErrorMsg('Please select a category');
      return;
    }

    const limit = parseFloat(limitStr);
    if (isNaN(limit) || limit <= 0) {
      setErrorMsg('Please enter a valid numeric limit greater than 0');
      return;
    }

    onAddBudget(selectedCatId, limit);
    // Reset form
    setSelectedCatId('');
    setLimitStr('');
  };

  return (
    <div className="space-y-6">
      {/* Grid: Left Column for Progress, Right Column for Add budget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Budget Progress and Alerts */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950 dark:text-white flex items-center gap-2">
              <LucideIcon name="PiggyBank" className="text-emerald-500" />
              Monthly Budgets ({currentYearMonth})
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Set alerts and track your exact monthly spending limits. Exceeding budgets will trigger warning badges.
            </p>

            {budgets.length === 0 ? (
              <div className="text-center py-12 mt-6">
                <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                  <LucideIcon name="TrendingDown" className="text-slate-400" />
                </div>
                <h4 className="text-slate-900 dark:text-white font-medium text-sm">No Budgets Formulated</h4>
                <p className="text-xs text-slate-500 mt-0.5">Use the side panel to add a budget threshold for your categories.</p>
              </div>
            ) : (
              <div className="space-y-6 mt-6">
                {budgets.map(b => {
                  const cat = b.categoryId === 'cat_transfer_fee'
                    ? { id: 'cat_transfer_fee', name: 'Transaction Charges', type: 'expense', icon: 'Percent' }
                    : (categories.find(c => c.id === b.categoryId) || { name: 'Unknown Category', icon: 'HelpCircle' });
                  const spent = getCategorySpendingThisMonth(b.categoryId);
                  const limit = b.monthlyLimit;
                  const ratio = limit > 0 ? spent / limit : 0;
                  const percentage = Math.round(ratio * 100);
                  const remaining = limit - spent;
                  
                  // Visual status styling
                  let progressColor = 'bg-emerald-500';
                  let textColor = 'text-slate-900 dark:text-white';
                  let alertBadge = null;

                  if (percentage >= 100) {
                    progressColor = 'bg-rose-500 animate-pulse';
                    textColor = 'text-rose-600 dark:text-rose-400 font-semibold';
                    alertBadge = (
                      <span className="bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 text-[10px] uppercase font-bold px-2 py-0.5 rounded border border-rose-100 dark:border-rose-900/30 flex items-center gap-1">
                        <LucideIcon name="AlertTriangle" size={12} />
                        Over budget
                      </span>
                    );
                  } else if (percentage >= 85) {
                    progressColor = 'bg-amber-500';
                    textColor = 'text-amber-600 dark:text-amber-400';
                    alertBadge = (
                      <span className="bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 text-[10px] uppercase font-bold px-2 py-0.5 rounded border border-amber-100 dark:border-amber-900/30 flex items-center gap-1">
                        <LucideIcon name="AlertCircle" size={12} />
                        Warning (85%+)
                      </span>
                    );
                  }

                  return (
                    <div key={b.id} className="p-4 rounded-xl bg-slate-50/50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-lg flex items-center justify-center border border-slate-100 dark:border-slate-750">
                            <LucideIcon name={cat.icon} className="text-slate-600 dark:text-slate-300" />
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{cat.name}</h4>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-slate-500">
                                Limit: {formatPKR(limit, currency)}
                              </span>
                              <span className="text-xs text-slate-300 dark:text-slate-705">|</span>
                              <span className="text-xs text-slate-500">
                                Spent: {formatPKR(spent, currency)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {alertBadge}
                          <button
                            onClick={() => onDeleteBudget(b.id)}
                            className="p-1 text-slate-400 hover:text-rose-500 dark:text-slate-500 hover:dark:text-rose-400 rounded transition-colors"
                            title="Delete Budget Limit"
                          >
                            <LucideIcon name="Trash2" size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Percentage progress bar */}
                      <div className="mt-3">
                        <div className="h-2 bg-slate-150 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                            style={{ width: `${Math.min(100, percentage)}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center mt-1.5">
                          <span className="text-xs text-slate-400">
                            {percentage}% of monthly budget spent
                          </span>
                          <span className={`text-xs ${remaining >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {remaining >= 0 
                              ? `${formatPKR(remaining, currency)} remaining` 
                              : `${formatPKR(Math.abs(remaining), currency)} overlimit`
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Set/Add Category Budget Panel */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <LucideIcon name="Sliders" className="text-emerald-500" />
              Configure Budget
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Set or adjust a monthly spending cap for your shopping, bills, utilities or entertainment.
            </p>

            <form onSubmit={handleCreateBudget} className="mt-4 space-y-4">
              {errorMsg && (
                <div className="bg-rose-50 border border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30 text-rose-600 dark:text-rose-450 p-2.5 rounded-lg text-xs flex items-center gap-1">
                  <LucideIcon name="AlertCircle" size={14} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Category dropdown */}
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Select Expense Category
                </label>
                {availableCategoriesForBudget.length === 0 ? (
                  <div className="text-xs text-slate-400 bg-slate-50 dark:bg-slate-850 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                    All categories have active budgets configured. Clear a budget to create a new limit.
                  </div>
                ) : (
                  <CustomSelect
                    options={availableCategoriesForBudget.map(cat => ({
                      value: cat.id,
                      label: cat.name,
                      icon: cat.icon
                    }))}
                    value={selectedCatId}
                    onChange={(val) => setSelectedCatId(val)}
                    placeholder="-- Choose Category --"
                  />
                )}
              </div>

              {/* Amount limit */}
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Monthly Limit ({currency})
                </label>
                <input
                  type="number"
                  className="w-full bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white text-sm border-0 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g. 10000"
                  value={limitStr}
                  onChange={(e) => setLimitStr(e.target.value)}
                  disabled={availableCategoriesForBudget.length === 0}
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 cursor-pointer text-white font-medium text-sm rounded-xl hover:shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                disabled={availableCategoriesForBudget.length === 0}
              >
                <LucideIcon name="Check" size={16} />
                Set Budget Limit
              </button>
            </form>
          </div>

          {/* Quick budget tips and info card */}
          <div className="bg-emerald-500/10 dark:bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5">
            <h4 className="text-sm font-semibold text-emerald-800 dark:text-emerald-455 flex items-center gap-1.5">
              <LucideIcon name="Sparkles" size={16} />
              Budgeting 50/30/20 Rule
            </h4>
            <p className="text-xs text-emerald-700/80 dark:text-emerald-450 mt-1.5 leading-relaxed">
              We recommend allocating **50%** of your monthly income to Needs (Bills, Health, Transport), **30%** to Wants (Shopping, Entertainment, Food), and saving the remaining **20%** inside accounts or goals.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
