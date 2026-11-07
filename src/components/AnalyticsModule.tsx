/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Transaction, Account, Category } from '../types';
import { formatPKR, getAvailableMonths, formatMonthName, formatDate } from '../utils/financeHelpers';
import LucideIcon from './LucideIcon';

interface AnalyticsModuleProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  currency: string;
}

// Visual category colors for Recharts cell coloring
const SEED_COLORS = [
  '#10b981', '#3b82f6', '#f59e0b', '#ef4444', 
  '#8b5cf6', '#ec4899', '#06b6d4', '#64748b',
  '#14b8a6', '#f43f5e', '#a855f7', '#6366f1'
];

export default function AnalyticsModule({
  transactions,
  accounts,
  categories,
  currency
}: AnalyticsModuleProps) {

  // 1. Group income/expenses per month for trend charts
  const trendData = useMemo(() => {
    // Get last 6 months or months in the dataset
    const months = [...getAvailableMonths(transactions, [])].reverse().slice(-6); // Oldest first, up to 6 months
    
    return months.map(m => {
      const monthTxs = transactions.filter(t => t.date.startsWith(m));
      const income = monthTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const expense = monthTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      const savings = income - expense;

      return {
        name: formatMonthName(m),
        Income: income,
        Expense: expense,
        Savings: savings
      };
    });
  }, [transactions]);

  // 2. Category spending breakdowns for active month (mocked as June 2026/May 2026 if empty)
  const categorySpendData = useMemo(() => {
    const expenseTxs = transactions.filter(t => t.type === 'expense');
    const grouped: Record<string, number> = {};

    expenseTxs.forEach(t => {
      grouped[t.categoryId] = (grouped[t.categoryId] || 0) + t.amount;
    });

    return Object.entries(grouped).map(([catId, amount]) => {
      const cat = categories.find(c => c.id === catId);
      return {
        name: cat ? cat.name : 'Other',
        value: amount
      };
    }).sort((a,b) => b.value - a.value);
  }, [transactions, categories]);

  // 3. Category Income breakdowns
  const categoryIncomeData = useMemo(() => {
    const incomeTxs = transactions.filter(t => t.type === 'income');
    const grouped: Record<string, number> = {};

    incomeTxs.forEach(t => {
      grouped[t.categoryId] = (grouped[t.categoryId] || 0) + t.amount;
    });

    return Object.entries(grouped).map(([catId, amount]) => {
      const cat = categories.find(c => c.id === catId);
      return {
        name: cat ? cat.name : 'Other',
        value: amount
      };
    }).sort((a,b) => b.value - a.value);
  }, [transactions, categories]);

  // 4. Cash vs Digital ledger assets distribution
  const cashVsDigitalData = useMemo(() => {
    const cashSum = accounts.filter(a => a.type === 'cash').reduce((sum, a) => sum + a.balance, 0);
    const digitalSum = accounts.filter(a => a.type === 'digital').reduce((sum, a) => sum + a.balance, 0);
    
    return [
      { name: 'Physical Cash', value: cashSum, color: '#f59e0b' },
      { name: 'Digital & Banks', value: digitalSum, color: '#6366f1' }
    ];
  }, [accounts]);

  // 5. Daily Spending Heatmap calculation (renders a 28-day grid ending today in mock June 2026)
  const heatmapDays = useMemo(() => {
    // We will generate the 30 days preceding June 1st, 2026 (or matching our metadata year 2026)
    // Starting on May 2nd, 2026 to June 1st, 2026
    const days: { date: string; amount: number; formattedDate: string }[] = [];
    const baseDate = new Date('2026-06-01');

    for (let i = 29; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() - i);
      const yyyymmdd = d.toISOString().substring(0, 10);
      
      const dayExpense = transactions
        .filter(t => t.type === 'expense' && t.date === yyyymmdd)
        .reduce((sum, t) => sum + t.amount, 0);

      days.push({
        date: yyyymmdd,
        amount: dayExpense,
        formattedDate: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      });
    }
    return days;
  }, [transactions]);

  // Get intensity color class for heatmap square
  const getHeatmapColorClass = (amount: number) => {
    if (amount === 0) return 'bg-slate-100 dark:bg-slate-800 text-transparent';
    if (amount <= 1500) return 'bg-rose-500/20 text-rose-800 dark:text-rose-100 dark:bg-rose-500/10 border border-rose-500/10 hover:ring-2 hover:ring-rose-400';
    if (amount <= 5000) return 'bg-rose-500/55 text-rose-950 dark:text-white dark:bg-rose-500/40 border border-rose-500/20 hover:ring-2 hover:ring-rose-400';
    return 'bg-rose-600 text-white border border-rose-700 hover:ring-2 hover:ring-rose-500';
  };

  const currentMonthCode = '2026-06';
  const getMostSpentCategoryThisMonth = () => {
    const monthExpenses = transactions.filter(t => t.type === 'expense' && t.date.startsWith(currentMonthCode));
    const grouped: Record<string, number> = {};
    monthExpenses.forEach(t => {
      grouped[t.categoryId] = (grouped[t.categoryId] || 0) + t.amount;
    });

    let topCatId = '';
    let topVal = 0;
    Object.entries(grouped).forEach(([catId, amount]) => {
      if (amount > topVal) {
        topVal = amount;
        topCatId = catId;
      }
    });

    const cat = categories.find(c => c.id === topCatId);
    return cat ? { name: cat.name, amount: topVal } : null;
  };

  const topCategoryThisMonth = getMostSpentCategoryThisMonth();

  return (
    <div className="space-y-6">
      
      {/* Visual top Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Top Spending Categories badge */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
          <span className="text-slate-400 font-semibold text-xs block uppercase tracking-wider">Top Expenditures this month</span>
          {topCategoryThisMonth ? (
            <div className="mt-3 flex items-start justify-between">
              <div>
                <span className="text-xl sm:text-2xl font-black text-rose-500 block leading-tight">
                  {formatPKR(topCategoryThisMonth.amount, currency)}
                </span>
                <span className="text-xs text-slate-500 font-medium block mt-1">
                  Spent entirely on <strong className="text-slate-800 dark:text-slate-205">{topCategoryThisMonth.name}</strong>
                </span>
              </div>
              <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-500">
                <LucideIcon name="TrendingUp" size={24} />
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic mt-4">No active expenses for the current month June 2026.</p>
          )}
        </div>

        {/* Available Savings Rate of dataset */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
          <span className="text-slate-400 font-semibold text-xs block uppercase tracking-wider">Historical Net Savings</span>
          {trendData.length > 0 ? (
            <div className="mt-3 flex items-start justify-between">
              <div>
                {/* Total historic savings */}
                <span className="text-xl sm:text-2xl font-black text-emerald-500 block leading-tight">
                  {formatPKR(trendData.reduce((sum, d) => sum + d.Savings, 0), currency)}
                </span>
                <span className="text-xs text-slate-500 font-medium block mt-1">
                  Cumulative savings from statements
                </span>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500">
                <LucideIcon name="PiggyBank" size={24} />
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 mt-4 leading-tight">Add records inside your statement journal to project metrics.</p>
          )}
        </div>

        {/* Most Active Ledger Channel */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
          <span className="text-slate-400 font-semibold text-xs block uppercase tracking-wider">Most Active asset account</span>
          {accounts.length > 0 ? (
            <div className="mt-3 flex items-start justify-between">
              <div>
                {/* Find account with highest transactions volume or balance */}
                <span className="text-xl sm:text-2xl font-black text-indigo-500 block leading-tight">
                  {accounts.reduce((max, a) => a.balance > max.balance ? a : max, accounts[0])?.name || 'Cash Account'}
                </span>
                <span className="text-xs text-slate-500 font-medium block mt-1">
                  Holds current highest single liquid value
                </span>
              </div>
              <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-500">
                <LucideIcon name="Award" size={24} />
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 mt-4">Account statistics will render upon setup.</p>
          )}
        </div>

      </div>

      {/* Main trends: Income vs Expense and Distributions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Historic curves graph (Income vs expense) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4 text-base flex items-center gap-1.5">
            <LucideIcon name="LineChart" className="text-emerald-500" />
            Income vs Expenditure Trend
          </h3>
          
          {trendData.length === 0 ? (
            <div className="py-24 text-center text-xs text-slate-400 italic">Cumulative multi-month statements required to draw trajectory nodes.</div>
          ) : (
            <div className="h-72 w-full text-xs font-medium font-mono">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '0', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value) => [`${currency} ${Number(value).toLocaleString()}`]}
                  />
                  <Legend verticalAlign="top" height={36}/>
                  <Area type="monotone" dataKey="Income" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorInc)" />
                  <Area type="monotone" dataKey="Expense" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExp)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Cash vs Digital channels distribution */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-4 text-base flex items-center gap-1.5">
              <LucideIcon name="CreditCard" className="text-indigo-500" />
              Cash vs Digital Cash Assets
            </h3>
            
            {cashVsDigitalData[0].value === 0 && cashVsDigitalData[1].value === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400 italic">No assets set in balance sheets.</div>
            ) : (
              <div className="h-56 w-full text-xs font-semibold">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={cashVsDigitalData}
                      cx="55%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {cashVsDigitalData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${currency} ${Number(value).toLocaleString()}`]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-850 space-y-2">
            {cashVsDigitalData.map((item) => {
              const totalVal = cashVsDigitalData[0].value + cashVsDigitalData[1].value;
              const ratio = totalVal > 0 ? (item.value / totalVal) * 100 : 0;
              return (
                <div key={item.name} className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-350">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: item.color }} />
                    {item.name}
                  </span>
                  <span className="font-bold font-mono">
                    {formatPKR(item.value, currency)} ({Math.round(ratio)}%)
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Grid: Categories Expenses Pie Chart & Categories Incomes Pie Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Category Expense Pie Chart */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4 text-base flex items-center gap-1.5">
            <LucideIcon name="PieChart" className="text-rose-500" />
            Expense Category-wise Allocations
          </h3>
          
          {categorySpendData.length === 0 ? (
            <div className="py-20 text-center text-xs text-slate-400 italic">No expense records available to model charts.</div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="h-44 w-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categorySpendData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categorySpendData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={SEED_COLORS[index % SEED_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${currency} ${Number(value).toLocaleString()}`]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Chart Legend list */}
              <div className="flex-1 space-y-2 text-xs w-full">
                {categorySpendData.slice(0, 4).map((item, index) => {
                  const totalExp = categorySpendData.reduce((sum, c) => sum + c.value, 0);
                  const ratio = totalExp > 0 ? (item.value / totalExp) * 100 : 0;
                  return (
                    <div key={item.name} className="flex justify-between items-center text-slate-550">
                      <span className="flex items-center gap-1.5 font-medium truncate max-w-[120px]">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: SEED_COLORS[index % SEED_COLORS.length] }} />
                        {item.name}
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {formatPKR(item.value, currency)} ({Math.round(ratio)}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Category Income Pie Chart */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
          <h3 className="font-bold text-slate-900 dark:text-white mb-4 text-base flex items-center gap-1.5">
            <LucideIcon name="PieChart" className="text-emerald-500" />
            Inflows Category-wise Distributions
          </h3>
          
          {categoryIncomeData.length === 0 ? (
            <div className="py-20 text-center text-xs text-slate-400 italic">No income records available to model distributions.</div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="h-44 w-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryIncomeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryIncomeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={SEED_COLORS[index % SEED_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${currency} ${Number(value).toLocaleString()}`]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Chart Legend list */}
              <div className="flex-1 space-y-2 text-xs w-full">
                {categoryIncomeData.slice(0, 4).map((item, index) => {
                  const totalInc = categoryIncomeData.reduce((sum, c) => sum + c.value, 0);
                  const ratio = totalInc > 0 ? (item.value / totalInc) * 100 : 0;
                  return (
                    <div key={item.name} className="flex justify-between items-center text-slate-550">
                      <span className="flex items-center gap-1.5 font-medium truncate max-w-[120px]">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: SEED_COLORS[index % SEED_COLORS.length] }} />
                        {item.name}
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {formatPKR(item.value, currency)} ({Math.round(ratio)}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Daily Spending Heatmap (GitHub contributions style!) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-1.5">
            <LucideIcon name="Grid" className="text-amber-500" />
            Daily Expenditures Heatmap
          </h3>
          <span className="text-[10px] sm:text-xs text-slate-450 italic">Last 30 days daily overview</span>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          A visual calendar mapping indicating daily spending volume. Darker squares signify peak expense outbursts, designed offline.
        </p>

        {/* Heatmap Grid */}
        <div className="mt-5 border border-slate-50 dark:border-slate-800/80 p-4 rounded-xl dark:bg-slate-950/40">
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-3">
            {heatmapDays.map((day) => {
              const colorClass = getHeatmapColorClass(day.amount);
              return (
                <div
                  key={day.date}
                  className={`aspect-square p-2 rounded-lg flex flex-col justify-between transition-all group relative cursor-help ${colorClass}`}
                >
                  <span className="text-[10px] font-bold block">{day.formattedDate}</span>
                  <span className="text-[9px] font-medium leading-none truncate max-w-full">
                    {day.amount > 0 ? `${day.amount.toLocaleString()}` : ''}
                  </span>

                  {/* Tooltip detail overlay */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-slate-950 text-white text-[10px] px-2 py-1 rounded shadow-md pointer-events-none whitespace-nowrap z-40">
                    {day.date}: {formatPKR(day.amount, currency)} spent
                  </div>
                </div>
              );
            })}
          </div>

          {/* Color Key */}
          <div className="mt-4 pt-3 border-t border-slate-50 dark:border-slate-800/60 flex justify-end items-center gap-3 text-[10px] text-slate-500">
            <span>No Outgoings</span>
            <div className="w-3.5 h-3.5 rounded bg-slate-100 dark:bg-slate-800" />
            <div className="w-3.5 h-3.5 rounded bg-rose-500/20" />
            <div className="w-3.5 h-3.5 rounded bg-rose-500/55" />
            <div className="w-3.5 h-3.5 rounded bg-rose-600" />
            <span>High Outgoings ({formatPKR(5000, currency)}+)</span>
          </div>
        </div>
      </div>

    </div>
  );
}
