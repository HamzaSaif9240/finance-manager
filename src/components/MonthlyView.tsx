/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Transaction, Transfer, Account, Category } from '../types';
import { formatPKR, formatDate, getAvailableMonths, formatMonthName } from '../utils/financeHelpers';
import LucideIcon from './LucideIcon';

interface MonthlyViewProps {
  transactions: Transaction[];
  transfers: Transfer[];
  accounts: Account[];
  categories: Category[];
  currency: string;
}

export default function MonthlyView({
  transactions,
  transfers,
  accounts,
  categories,
  currency
}: MonthlyViewProps) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Group calculations by month
  const monthlySummaries = useMemo(() => {
    const months = getAvailableMonths(transactions, transfers);
    
    return months.map(m => {
      const monthTransactions = transactions.filter(t => t.date.startsWith(m));
      
      const income = monthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
        
      const expense = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
        
      const savings = income - expense;
      
      return {
        monthCode: m,
        monthName: formatMonthName(m),
        income,
        expense,
        savings,
        transactionCount: monthTransactions.length
      };
    });
  }, [transactions, transfers]);

  // Calculations for detailing a single month
  const activeMonthReport = useMemo(() => {
    if (!selectedMonth) return null;

    const monthTxs = transactions.filter(t => t.date.startsWith(selectedMonth));
    const monthTransfers = transfers.filter(tr => tr.date.startsWith(selectedMonth));

    const income = monthTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expense = monthTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const savings = income - expense;

    // Category Breakdown Expense
    const categoryExpenseBreakdown: Record<string, number> = {};
    monthTxs.filter(t => t.type === 'expense').forEach(t => {
      categoryExpenseBreakdown[t.categoryId] = (categoryExpenseBreakdown[t.categoryId] || 0) + t.amount;
    });

    // Category Breakdown Income
    const categoryIncomeBreakdown: Record<string, number> = {};
    monthTxs.filter(t => t.type === 'income').forEach(t => {
      categoryIncomeBreakdown[t.categoryId] = (categoryIncomeBreakdown[t.categoryId] || 0) + t.amount;
    });

    return {
      monthCode: selectedMonth,
      monthName: formatMonthName(selectedMonth),
      income,
      expense,
      savings,
      transactions: monthTxs,
      transfers: monthTransfers,
      categoryExpenseBreakdown,
      categoryIncomeBreakdown
    };
  }, [selectedMonth, transactions, transfers]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyReport = () => {
    if (!activeMonthReport) return;
    try {
      let reportStr = `📊 FINANCE STATEMENT: ${activeMonthReport.monthName}\n`;
      reportStr += `========================================\n`;
      reportStr += `💰 Loaded Income:      ${formatPKR(activeMonthReport.income, currency)}\n`;
      reportStr += `💸 Authorized Expenses: ${formatPKR(activeMonthReport.expense, currency)}\n`;
      reportStr += `📈 Net Savings:         ${formatPKR(activeMonthReport.savings, currency)}\n\n`;

      reportStr += `🔴 EXPENSE ALLOCATIONS:\n`;
      if (Object.keys(activeMonthReport.categoryExpenseBreakdown).length === 0) {
        reportStr += `  - No expenses recorded.\n`;
      } else {
        Object.entries(activeMonthReport.categoryExpenseBreakdown).forEach(([catId, amount]) => {
          const cat = categories.find(c => c.id === catId)?.name || 'Other';
          reportStr += `  - ${cat}: ${formatPKR(amount as number, currency)}\n`;
        });
      }

      reportStr += `\n🟢 INCOME DISTRIBUTION:\n`;
      if (Object.keys(activeMonthReport.categoryIncomeBreakdown).length === 0) {
        reportStr += `  - No income recorded.\n`;
      } else {
        Object.entries(activeMonthReport.categoryIncomeBreakdown).forEach(([catId, amount]) => {
          const cat = categories.find(c => c.id === catId)?.name || 'Other';
          reportStr += `  - ${cat}: ${formatPKR(amount as number, currency)}\n`;
        });
      }

      reportStr += `\n----------------------------------------\n`;
      reportStr += `Generated via Finance Manager by Hamza Saif\n`;

      if (navigator.clipboard) {
        navigator.clipboard.writeText(reportStr);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = reportStr;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

      if (navigator.share) {
        navigator.share({
          title: `Finance Statement - ${activeMonthReport.monthName}`,
          text: reportStr,
        }).catch(() => {});
      } else {
        window.showAlert?.("Report copied to your device's clipboard! You can now paste and share it easily in WhatsApp, Notes, or Mail.", "Report Copied Successfully");
      }
    } catch (e) {
      window.showAlert?.("Failed to copy report: " + e);
    }
  };

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
      
      {/* Overview header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-950 dark:text-white flex items-center gap-2">
          <LucideIcon name="CalendarRange" className="text-emerald-500" />
          Monthly Financial History
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Historical overview categorized month-by-month. Drill down into any month to audit full ledger breakdowns, download receipts, or print financial reports.
        </p>
      </div>

      {/* Main summary list */}
      {monthlySummaries.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-16 border border-slate-100 dark:border-slate-800 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
            <LucideIcon name="Calendar" size={28} />
          </div>
          <h3 className="text-base font-semibold text-slate-950 dark:text-white">No Monthly Records Built</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            We require salary, earnings, digital wallet deposits, pocket money, or expenses to map records. Add custom transactions to start.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {monthlySummaries.map((summary) => {
            const hasSavings = summary.savings >= 0;
            return (
              <div
                key={summary.monthCode}
                onClick={() => setSelectedMonth(summary.monthCode)}
                className="group cursor-pointer bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 hover:shadow-md hover:border-emerald-500/20 dark:hover:border-emerald-500/10 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-500 transition-colors">
                      {summary.monthName}
                    </h3>
                    <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 px-2.5 py-1 rounded-full font-medium">
                      {summary.transactionCount} records
                    </span>
                  </div>

                  <div className="mt-5 space-y-2 text-sm">
                    {/* Income */}
                    <div className="flex justify-between items-center text-slate-500">
                      <span>Total Income</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-450">
                        +{formatPKR(summary.income, currency)}
                      </span>
                    </div>

                    {/* Expense */}
                    <div className="flex justify-between items-center text-slate-500">
                      <span>Total Expense</span>
                      <span className="font-semibold text-rose-500 dark:text-rose-450">
                        -{formatPKR(summary.expense, currency)}
                      </span>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-slate-100 dark:border-slate-850 my-2 pt-2 flex justify-between items-center font-bold">
                      <span className="text-slate-900 dark:text-slate-200">Savings Ratio</span>
                      <span className={hasSavings ? 'text-emerald-500' : 'text-rose-500'}>
                        {formatPKR(summary.savings, currency)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-50 dark:border-slate-850 text-xs text-slate-450 flex items-center justify-between group-hover:text-slate-800 dark:group-hover:text-white transition-colors">
                  <span>View Full Statement Report</span>
                  <LucideIcon name="ArrowRight" size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Drill-down Report Modal Container */}
      {selectedMonth && activeMonthReport && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 print:p-0 print:static print:bg-white">
          <div className="bg-white dark:bg-slate-950 rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden shadow-2xl relative flex flex-col print:shadow-none print:max-h-none print:w-full">
            
            {/* Modal header (Hide when printing) */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between print:hidden">
              <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <LucideIcon name="Database" className="text-emerald-500" />
                Statement Report for {activeMonthReport.monthName}
              </h3>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyReport}
                  className={`px-3 py-1.5 ${copied ? 'bg-emerald-600' : 'bg-violet-600 hover:bg-violet-700'} text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors cursor-pointer shrink-0`}
                >
                  <LucideIcon name={copied ? "Check" : "Share2"} size={14} />
                  {copied ? "Copied!" : "Share Summary"}
                </button>
                <button
                  onClick={handlePrint}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-705 text-slate-800 dark:text-slate-100 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <LucideIcon name="Printer" size={14} />
                  Print
                </button>
                <button
                  onClick={() => setSelectedMonth(null)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 shrink-0"
                >
                  <LucideIcon name="X" size={20} />
                </button>
              </div>
            </div>

            {/* Printable Area */}
            <div className="overflow-y-auto p-6 space-y-6 print:overflow-visible print:p-0">
              {/* Report Header for printing */}
              <div className="hidden print:block text-center border-b border-slate-200 pb-4 mb-4">
                <h1 className="text-2xl font-bold text-slate-900">Finance Manager Statement</h1>
                <p className="text-sm text-slate-500">Statement breakdown for Month: {activeMonthReport.monthName}</p>
                <div className="flex justify-center gap-6 mt-3 text-xs">
                  <span>Balance Currency: {currency}</span>
                  <span>Report Generated: {new Date().toLocaleDateString('en-GB')}</span>
                </div>
              </div>

              {/* 3-Part Summary Block */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border border-slate-100 dark:border-slate-800 p-4 rounded-xl dark:bg-slate-900 print:grid-cols-3">
                <div className="space-y-1 text-center md:text-left">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Loaded Income</span>
                  <div className="text-xl font-bold text-emerald-500 mt-0.5">
                    {formatPKR(activeMonthReport.income, currency)}
                  </div>
                </div>

                <div className="space-y-1 text-center md:text-left border-y md:border-y-0 md:border-x border-slate-150 dark:border-slate-800 py-3 md:py-0 md:px-6">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Authorized Expenses</span>
                  <div className="text-xl font-bold text-rose-500 mt-0.5">
                    {formatPKR(activeMonthReport.expense, currency)}
                  </div>
                </div>

                <div className="space-y-1 text-center md:text-left md:pl-6">
                  <span className="text-xs text-slate-400 uppercase font-semibold">Net Savings</span>
                  <div className={`text-xl font-bold mt-0.5 ${activeMonthReport.savings >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {formatPKR(activeMonthReport.savings, currency)}
                  </div>
                </div>
              </div>

              {/* Flex Section: Category Expenditures & Income */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
                
                {/* Category Expenses breakdowns */}
                <div className="border border-slate-100 dark:border-slate-800 p-4 rounded-xl dark:bg-slate-900">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-3 flex items-center gap-1.5">
                    <LucideIcon name="ArrowDownLeft" className="text-rose-500" />
                    Expense Category Allocations
                  </h4>
                  
                  {Object.keys(activeMonthReport.categoryExpenseBreakdown).length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No expenses recorded inside this month.</p>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(activeMonthReport.categoryExpenseBreakdown).map(([catId, amount]) => {
                        const cat = getCategoryDetails(catId);
                        const valAmount = amount as number;
                        const ratio = activeMonthReport.expense > 0 ? (valAmount / activeMonthReport.expense) * 100 : 0;
                        return (
                          <div key={catId} className="space-y-1">
                            <div className="flex justify-between text-xs text-slate-650 dark:text-slate-300">
                              <span className="flex items-center gap-1 font-medium">
                                <LucideIcon name={cat.icon} size={12} className="text-slate-400" />
                                {cat.name}
                              </span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {formatPKR(valAmount, currency)} ({Math.round(ratio)}%)
                              </span>
                            </div>
                            <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-rose-500 rounded-full" style={{ width: `${ratio}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Category Income Breakdown */}
                <div className="border border-slate-100 dark:border-slate-800 p-4 rounded-xl dark:bg-slate-900">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-3 flex items-center gap-1.5">
                    <LucideIcon name="ArrowUpRight" className="text-emerald-500" />
                    Income Category Distribution
                  </h4>
                  
                  {Object.keys(activeMonthReport.categoryIncomeBreakdown).length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No income added inside this month.</p>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries(activeMonthReport.categoryIncomeBreakdown).map(([catId, amount]) => {
                        const cat = getCategoryDetails(catId);
                        const valAmount = amount as number;
                        const ratio = activeMonthReport.income > 0 ? (valAmount / activeMonthReport.income) * 100 : 0;
                        return (
                          <div key={catId} className="space-y-1">
                            <div className="flex justify-between text-xs text-slate-650 dark:text-slate-300">
                              <span className="flex items-center gap-1 font-medium">
                                <LucideIcon name={cat.icon} size={12} className="text-slate-400" />
                                {cat.name}
                              </span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {formatPKR(valAmount, currency)} ({Math.round(ratio)}%)
                              </span>
                            </div>
                            <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${ratio}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>

              {/* Month's Full Tabulated Ledger */}
              <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden dark:bg-slate-900">
                <div className="p-4 border-b border-slate-100 dark:border-slate-850 bg-slate-50 dark:bg-slate-850/50">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">Transaction & Transfer Journal Log</h4>
                </div>

                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-850 text-slate-400 text-[10px] sm:text-xs uppercase tracking-wider bg-slate-50 dark:bg-slate-900/50">
                      <th className="p-3">Date</th>
                      <th className="p-3">Details</th>
                      <th className="p-3">Source Account</th>
                      <th className="p-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-300">
                    {/* Combine trans & transfers sorted by date */}
                    {activeMonthReport.transactions.length === 0 && activeMonthReport.transfers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-slate-450 italic">No records inside this monthly view.</td>
                      </tr>
                    ) : (
                      [
                        ...activeMonthReport.transactions.map(t => ({ ...t, logType: 'transaction' as const })),
                        ...activeMonthReport.transfers.map(tr => ({
                          ...tr,
                          logType: 'transfer' as const,
                          type: 'expense' as const, // For styling compatibility
                          categoryId: 'transfer',
                          accountId: tr.fromAccountId
                        }))
                      ]
                      .sort((a,b) => b.date.localeCompare(a.date))
                      .map((log) => {
                        const isTx = log.logType === 'transaction';
                        const cat = getCategoryDetails((log as any).categoryId);

                        return (
                          <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20">
                            <td className="p-3 whitespace-nowrap">{formatDate(log.date)}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-1.5">
                                {isTx ? (
                                  <div className="flex items-center gap-1">
                                    <span className="font-semibold text-slate-850 dark:text-slate-205">{cat.name}</span>
                                    {log.description && <span className="text-slate-400 text-[10px] hidden sm:inline">- {log.description}</span>}
                                  </div>
                                ) : (
                                  <span className="font-medium text-amber-600 dark:text-amber-450 flex items-center gap-1">
                                    <LucideIcon name="ArrowLeftRight" size={12} />
                                    Balance Transfer to {getAccountName((log as any).toAccountId)}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3">{getAccountName(log.accountId)}</td>
                            <td className={`p-3 text-right font-bold whitespace-nowrap ${
                              !isTx 
                                ? 'text-amber-500' 
                                : log.type === 'income' 
                                  ? 'text-emerald-500' 
                                  : 'text-rose-500'
                            }`}>
                              {!isTx 
                                ? formatPKR(log.amount, currency) 
                                : `${log.type === 'income' ? '+' : '-'}${formatPKR(log.amount, currency)}`
                              }
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
