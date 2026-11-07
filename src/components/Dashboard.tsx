/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { Transaction, Account, Category, Budget, Activity } from '../types';
import { formatPKR, formatDate } from '../utils/financeHelpers';
import LucideIcon from './LucideIcon';

interface DashboardProps {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  onOpenAddModal: () => void;
  onNavigateToTab: (tabId: string) => void;
  currency: string;
  activities: Activity[];
  onUndoActivity: (activityId: string) => void;
  hasWiped?: boolean;
}

const INSIGHTS_COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#ec4899'];

export default function Dashboard({
  accounts,
  transactions,
  categories,
  budgets,
  onOpenAddModal,
  onNavigateToTab,
  currency,
  activities,
  onUndoActivity,
  hasWiped
}: DashboardProps) {

  const [isUndoModalOpen, setIsUndoModalOpen] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [isDemoPopupDismissed, setIsDemoPopupDismissed] = useState(false);

  // Check if user still has seed/demo data
  const hasSeedData = useMemo(() => {
    return !hasWiped && transactions.some(tx => tx.id.startsWith('tx_seed_'));
  }, [hasWiped, transactions]);

  // Current Date Base logic (Simulation base: June 1st, 2026)
  const currentDateCode = '2026-06-01';
  const currentMonthCode = '2026-06';
  
  // 1. Balance computations
  const totals = useMemo(() => {
    const cashTotal = accounts.filter(a => a.type === 'cash').reduce((sum, a) => sum + a.balance, 0);
    const digitalTotal = accounts.filter(a => a.type === 'digital').reduce((sum, a) => sum + a.balance, 0);
    const grandTotal = cashTotal + digitalTotal;

    // This month (June 2026 setup)
    const monthTransactions = transactions.filter(t => t.date.startsWith(currentMonthCode));
    const monthIncome = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const monthExpense = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const monthSavings = monthIncome - monthExpense;

    return {
      grandTotal,
      cashTotal,
      digitalTotal,
      monthIncome,
      monthExpense,
      monthSavings
    };
  }, [accounts, transactions]);

  // 2. Quick Stats Card calculations
  const quickStats = useMemo(() => {
    // Today (June 1st, 2026)
    const todayTransactions = transactions.filter(t => t.date === currentDateCode);
    const todayIncome = todayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const todayExpense = todayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    // This Week Spending (last 7 days preceding June 2nd, 2026: May 26th - June 1st)
    const last7DaysLimit = '2026-05-26';
    const weekSpending = transactions
      .filter(t => t.type === 'expense' && t.date >= last7DaysLimit && t.date <= currentDateCode)
      .reduce((sum, t) => sum + t.amount, 0);

    // Highest expense category this month
    const monthExpenses = transactions.filter(t => t.type === 'expense' && t.date.startsWith(currentMonthCode));
    const catGroup: Record<string, number> = {};
    monthExpenses.forEach(t => {
      catGroup[t.categoryId] = (catGroup[t.categoryId] || 0) + t.amount;
    });

    let topCatName = 'None';
    let topCatAmount = 0;
    Object.entries(catGroup).forEach(([catId, amount]) => {
      if (amount > topCatAmount) {
        topCatAmount = amount;
        const cat = categories.find(c => c.id === catId);
        if (cat) topCatName = cat.name;
      }
    });

    return {
      todayIncome,
      todayExpense,
      weekSpending,
      highestCategory: { name: topCatName, amount: topCatAmount }
    };
  }, [transactions, categories]);

  // 3. Mini Recharts Graphs: Monthly Income vs Expenses
  const barChartData = useMemo(() => {
    // Group May 2026 & June 2026 totals
    const groups = ['2026-05', '2026-06'];
    return groups.map(g => {
      const gTxs = transactions.filter(t => t.date.startsWith(g));
      const income = gTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const expense = gTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      
      const parts = g.split('-');
      const monthLabel = new Date(Number(parts[0]), Number(parts[1]) - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
      return {
        name: monthLabel,
        Income: income,
        Expense: expense
      };
    });
  }, [transactions]);

  // Expenditure Pie chart distribution
  const expensePieData = useMemo(() => {
    const monthExpenses = transactions.filter(t => t.type === 'expense' && t.date.startsWith(currentMonthCode));
    const grouped: Record<string, number> = {};
    
    monthExpenses.forEach(t => {
      grouped[t.categoryId] = (grouped[t.categoryId] || 0) + t.amount;
    });

    return Object.entries(grouped).map(([catId, amount]) => {
      return {
        name: categories.find(c => c.id === catId)?.name || 'Other',
        value: amount
      };
    }).sort((a, b) => b.value - a.value);
  }, [transactions, categories]);

  // Cash vs Digital distribution data
  const distributionData = useMemo(() => {
    return [
      { name: 'Physical Cash', value: totals.cashTotal, color: '#f59e0b' },
      { name: 'Digital & Accounts', value: totals.digitalTotal, color: '#6366f1' }
    ];
  }, [totals]);

  // 4. Financial Insights & Budget Warnings (Heuristics)
  const insights = useMemo(() => {
    const messages: string[] = [];

    // Food expenditure check
    if (totals.monthExpense > 0) {
      const foodId = 'cat_food';
      const foodSpent = transactions
        .filter(t => t.type === 'expense' && t.categoryId === foodId && t.date.startsWith(currentMonthCode))
        .reduce((sum, t) => sum + t.amount, 0);

      const ratio = (foodSpent / totals.monthExpense) * 100;
      if (ratio > 30) {
        messages.push(`⚠️ Heavy Food Spend: You spent ${Math.round(ratio)}% of your expenses on Food this month. Consider cutting dinner / snack treats.`);
      }
    }

    // Savings rates checking
    if (totals.monthIncome > 0) {
      const savingsRatio = (totals.monthSavings / totals.monthIncome) * 100;
      if (savingsRatio >= 20) {
        messages.push(`⭐ Wealthbuilder Streak: Your monthly savings rate is healthy at ${Math.round(savingsRatio)}%! (Recommended target: 20%)`);
      } else if (savingsRatio > 0 && savingsRatio < 15) {
        messages.push(`📉 Low Savings warning: Saving rate is down at ${Math.round(savingsRatio)}%. Cut down on non-essential clothes, subscriptions, or food items.`);
      }
    }

    // Budget over-limit alerting
    budgets.forEach(b => {
      const catSpent = transactions
        .filter(t => t.type === 'expense' && t.categoryId === b.categoryId && t.date.startsWith(currentMonthCode))
        .reduce((sum, t) => sum + t.amount, 0);

      if (catSpent > b.monthlyLimit) {
        const catName = categories.find(c => c.id === b.categoryId)?.name || 'Category';
        messages.push(`🚨 Overlimit warning: "${catName}" expenditure has reached ${formatPKR(catSpent, currency)}, exceeding your monthly budget limit of ${formatPKR(b.monthlyLimit, currency)}!`);
      }
    });

    // Default general advice fallback
    if (messages.length === 0) {
      messages.push(`💡 Setup savings goals and configure category budget limits under the Budgets tab to generate smart automated financial cues.`);
    }

    return messages;
  }, [totals, transactions, budgets, categories]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return "Good Morning";
    } else if (hour >= 12 && hour < 17) {
      return "Good Afternoon";
    } else if (hour >= 17 && hour < 21) {
      return "Good Evening";
    } else {
      return "Good Night";
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Dynamic Welcome Heading and Quick Trigger */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
            Salaam & {getGreeting()}! 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-450 dark:text-slate-400 mt-1">
            Welcome to the Finance Manager dashboard. Everything is synchronized securely in real time across all your devices.
          </p>
        </div>

        <div className="flex gap-2 shrink-0 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => {
              if (activities.length > 0) {
                setSelectedActivityId(activities[0].id);
                setIsUndoModalOpen(true);
              }
            }}
            disabled={activities.length === 0}
            className={`px-4 py-2 font-bold text-xs sm:text-sm rounded-xl shadow-xs transition flex items-center gap-1.5 border ${
              activities.length > 0
                ? "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-205 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-650 cursor-pointer"
                : "bg-slate-50 dark:bg-slate-900/40 text-slate-400 dark:text-slate-600 border-slate-100 dark:border-slate-800 cursor-not-allowed opacity-55"
            }`}
            title={activities.length === 0 ? "No recent activities to undo in this session" : "View recent activities to revert changes"}
          >
            <LucideIcon name="RotateCcw" size={15} />
            Undo Activity
          </button>

          <button
            onClick={onOpenAddModal}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm hover:shadow transition flex items-center gap-1 cursor-pointer shrink-0"
          >
            <LucideIcon name="Plus" size={16} />
            Add Transaction
          </button>
        </div>
      </div>

      {/* THREE-CARD HERO: Balance sheets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Net Asset Balance */}
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 text-white p-6 rounded-2xl shadow-sm flex flex-col justify-between h-40">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-28 h-28 bg-white/10 rounded-full blur-xl" />
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold tracking-wider text-emerald-100/80">Net Liquid Asset Wealth</span>
            <LucideIcon name="Wallet" className="text-emerald-100" size={20} />
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black block mt-1 tracking-tight font-mono">
              {formatPKR(totals.grandTotal, currency)}
            </span>
            <span className="text-[11px] text-emerald-100/80 block mt-1">Combined physical & digital balance</span>
          </div>
        </div>

        {/* Physical Cash reserve */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col justify-between h-40">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Total Offline Cash</span>
            <LucideIcon name="Coins" className="text-amber-500" size={20} />
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black block mt-1 text-slate-900 dark:text-white font-mono">
              {formatPKR(totals.cashTotal, currency)}
            </span>
            <span className="text-[11px] text-slate-450 block mt-1">Pocket Money + Cash drawers</span>
          </div>
        </div>

        {/* Digital accounts reserve */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-2xl shadow-sm flex flex-col justify-between h-40">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-400">Digital / Wallet Balances</span>
            <LucideIcon name="CreditCard" className="text-indigo-500" size={20} />
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black block mt-1 text-slate-900 dark:text-white font-mono">
              {formatPKR(totals.digitalTotal, currency)}
            </span>
            <span className="text-[11px] text-slate-455 block mt-1">Easypaisa + Jazz Cash + Banks</span>
          </div>
        </div>

      </div>

      {/* Grid: Six Monthly statistical values */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        
        {/* Income this month */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-xl text-center shadow-xs">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Incomes (Jun)</span>
          <span className="text-sm font-bold text-emerald-500 block mt-1 truncate">
            +{formatPKR(totals.monthIncome, currency)}
          </span>
        </div>

        {/* Expenses this month */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-xl text-center shadow-xs">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Expenses (Jun)</span>
          <span className="text-sm font-bold text-rose-500 block mt-1 truncate">
            -{formatPKR(totals.monthExpense, currency)}
          </span>
        </div>

        {/* Savings this month */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-xl text-center shadow-xs">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Savings (Jun)</span>
          <span className={`text-sm font-bold block mt-1 truncate ${totals.monthSavings >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            {totals.monthSavings >= 0 ? '+' : ''}{formatPKR(totals.monthSavings, currency)}
          </span>
        </div>

        {/* Daily Spending */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-xl text-center shadow-xs">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Today Expenses</span>
          <span className="text-sm font-bold text-rose-500 block mt-1 truncate">
            -{formatPKR(quickStats.todayExpense, currency)}
          </span>
        </div>

        {/* This week spending */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-xl text-center shadow-xs">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Weekly Outflow</span>
          <span className="text-sm font-bold text-rose-500 block mt-1 truncate">
            -{formatPKR(quickStats.weekSpending, currency)}
          </span>
        </div>

        {/* Highest expense category */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-xl text-center shadow-xs">
          <span className="text-[10px] text-slate-400 uppercase font-semibold">Peak Expense</span>
          <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block mt-1 truncate">
            {quickStats.highestCategory.name}
          </span>
        </div>

      </div>

      {/* MIDDLE SECTION: Graphs & Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* BarChart Monthly comparison */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
          <h3 className="font-bold text-slate-950 dark:text-white text-sm mb-4 flex items-center gap-1.5">
            <LucideIcon name="LineChart" className="text-emerald-500" />
            Monthly Budget Comparison (May vs June)
          </h3>
          <div className="h-60 w-full text-[10px] sm:text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip formatter={(v) => [`PKR ${Number(v).toLocaleString()}`]} />
                <Legend />
                <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Categories Pie Chart Distribution */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-950 dark:text-white text-sm mb-4 flex items-center gap-1.5">
              <LucideIcon name="PieChart" className="text-indigo-500" />
              Category Expenses (This Month)
            </h3>
            {expensePieData.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 italic">No current expenses recorded to plot.</div>
            ) : (
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expensePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={35}
                      outerRadius={55}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {expensePieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={INSIGHTS_COLORS[index % INSIGHTS_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [`${currency} ${Number(v).toLocaleString()}`]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* List display */}
          <div className="space-y-1.5 border-t border-slate-50 dark:border-slate-850 pt-3">
            {expensePieData.slice(0, 3).map((item, index) => {
              const rat = (item.value / totals.monthExpense) * 100;
              return (
                <div key={item.name} className="flex justify-between items-center text-[10px] sm:text-xs text-slate-500">
                  <span className="flex items-center gap-1 truncate max-w-[120px]">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: INSIGHTS_COLORS[index % INSIGHTS_COLORS.length] }} />
                    {item.name}
                  </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-350">
                    {formatPKR(item.value, currency)} ({Math.round(rat)}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* BOTTOM SECTION: Recommended Financial insights Cues */}
      <div className="bg-emerald-500/10 dark:bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-455 flex items-center gap-1.5">
          <LucideIcon name="Sparkles" size={16} />
          Automated Financial Statements & Insights
        </h3>

        <div className="space-y-2 text-xs sm:text-sm text-emerald-700 dark:text-emerald-400">
          {insights.map((insight, idx) => (
            <p key={idx} className="flex items-start gap-1.5 leading-relaxed">
              <span className="font-semibold block shrink-0">•</span>
              <span>{insight}</span>
            </p>
          ))}
        </div>
      </div>

      {/* Undo Recent Activity Modal */}
      {isUndoModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity animate-fade-in"
            onClick={() => setIsUndoModalOpen(false)}
          />
          
          {/* Main Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative z-10 transform scale-100 flex flex-col max-h-[90vh] space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 select-none">
                  <LucideIcon name="RotateCcw" size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base tracking-tight leading-none">
                    Undo Recent Activity
                  </h3>
                  <span className="text-[10px] text-slate-450 dark:text-slate-500 font-mono tracking-wider mt-1 block uppercase">
                    Session Audit Trail Log
                  </span>
                </div>
              </div>
              
              <button
                onClick={() => setIsUndoModalOpen(false)}
                className="w-8 h-8 rounded-full border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-450 dark:text-slate-500 hover:text-slate-755 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-850 transition cursor-pointer select-none text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Scrollable contents */}
            <div className="overflow-y-auto space-y-4 pr-1 max-h-[50vh] scrollbar-thin">
              {/* Highlight Block: Reverting this selection */}
              {(() => {
                const selectedActivity = activities.find(a => a.id === selectedActivityId) || activities[0];
                if (!selectedActivity) return null;
                const isFirst = selectedActivity.id === activities[0]?.id;
                
                return (
                  <div className="p-4 bg-emerald-550/5 dark:bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {isFirst ? "Default undo target: most recent activity" : "Selected rollback action target"}
                    </span>
                    <p className="text-xs sm:text-sm font-extrabold text-slate-850 dark:text-slate-100 leading-tight">
                      "{selectedActivity.description}"
                    </p>
                    <div className="flex items-center gap-2 text-[9px] text-slate-450 dark:text-slate-400 font-mono">
                      <span>Recorded at: {selectedActivity.timestamp}</span>
                    </div>
                  </div>
                );
              })()}

              <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed font-semibold">
                Reverting to the selected action will rollback your transaction statements, goal envelopes, and preference settings to how they were <strong className="text-emerald-600 dark:text-emerald-400 font-extrabold">before</strong> that event occurred.
              </p>

              {/* Selection list of 7-8 activities */}
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Choose from previous session events:
                </span>
                
                <div className="space-y-1.5 max-h-48 overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-2xl p-2 bg-slate-50/50 dark:bg-slate-950/20">
                  {activities.map((act, index) => {
                    const isSelected = selectedActivityId === act.id;
                    const isFirst = index === 0;
                    
                    return (
                      <button
                        key={act.id}
                        type="button"
                        onClick={() => setSelectedActivityId(act.id)}
                        className={`w-full flex items-start gap-2.5 p-2.5 rounded-xl border text-left cursor-pointer transition-all duration-150 select-none ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/25 text-slate-900 dark:text-white shadow-sm font-bold'
                            : 'border-slate-100 dark:border-slate-850 hover:border-slate-200 dark:hover:border-slate-800 hover:bg-white dark:hover:bg-slate-850 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-black ${
                          isSelected 
                            ? 'bg-emerald-500 text-white' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <p className="text-xs font-bold leading-normal truncate">
                            {act.description}
                          </p>
                          <div className="flex items-center gap-1.5 text-[9px] text-slate-450 dark:text-slate-500 font-mono">
                            <span>{act.timestamp}</span>
                            {isFirst && (
                              <span className="px-1 text-[8px] rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold">
                                LATEST
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsUndoModalOpen(false)}
                className="px-4 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 border border-slate-150 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-extrabold text-xs rounded-xl transition cursor-pointer select-none"
              >
                Close list
              </button>
              
              <button
                type="button"
                onClick={() => {
                  if (selectedActivityId) {
                    onUndoActivity(selectedActivityId);
                    setIsUndoModalOpen(false);
                  }
                }}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-xs hover:shadow transition flex items-center gap-1 cursor-pointer select-none"
              >
                <LucideIcon name="RotateCcw" size={14} />
                Confirm Reversal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Demo Seed Data Awareness Overlay Popup */}
      {hasSeedData && !isDemoPopupDismissed && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-950/75 backdrop-blur-md transition-opacity animate-fade-in"
            onClick={() => setIsDemoPopupDismissed(true)}
          />
          
          {/* Main Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-3xl max-w-md w-full p-6 shadow-2xl relative z-10 transform scale-100 flex flex-col space-y-4">
            {/* Header / Brand Icon */}
            <div className="flex flex-col items-center text-center space-y-3 pb-2">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 select-none animate-pulse">
                <LucideIcon name="Database" size={28} />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg tracking-tight">
                  Running on Demo Data
                </h3>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold tracking-widest uppercase block animate-pulse">
                  Seed Database Active
                </span>
              </div>
            </div>

            {/* Scrollable / Display contents */}
            <div className="space-y-3 text-center">
              <p className="text-xs text-slate-650 dark:text-slate-300 leading-relaxed font-semibold">
                This dashboard is populated with pre-seeded sample records (wallets, custom budgets, savings targets, and receipts) so you can explore all features immediately.
              </p>
              
              <div className="p-3 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/15 rounded-2xl flex items-start gap-2.5 text-left">
                <div className="text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0">
                  <LucideIcon name="Info" size={16} />
                </div>
                <p className="text-[11px] text-slate-550 dark:text-slate-400 font-semibold leading-normal">
                  Want a blank slate? Go to <strong className="text-slate-800 dark:text-white">Settings</strong> and choose <strong className="text-emerald-650 dark:text-emerald-400">Permanently wipe data</strong> to reset all starting balances to exactly 0 and start Day 1 fresh.
                </p>
              </div>
            </div>

            {/* Footer actions */}
            <div className="pt-3 border-t border-slate-150 dark:border-slate-800 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsDemoPopupDismissed(true);
                  onNavigateToTab('settings');
                }}
                className="flex-1 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-extrabold text-xs rounded-xl transition cursor-pointer select-none text-center"
              >
                Go to Settings
              </button>
              
              <button
                type="button"
                onClick={() => setIsDemoPopupDismissed(true)}
                className="flex-1 px-3.5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs rounded-xl shadow-md hover:shadow transition flex items-center justify-center gap-1.5 cursor-pointer select-none"
              >
                Continue Exploring
                <LucideIcon name="ArrowRight" size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
