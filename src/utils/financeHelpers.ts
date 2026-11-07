/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Transaction, Transfer, Account, Category } from '../types';

// Helper to format currency
export function formatPKR(amount: number, currency: string = 'PKR'): string {
  return `${currency} ${amount.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// Helper to get formatted date string (e.g., "15 May 2026")
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

// Generate CSV string for Excel Export of Transactions
export function exportToCSV(
  transactions: Transaction[],
  accounts: Account[],
  categories: Category[]
): string {
  const headers = ['Date', 'Type', 'Amount', 'Account', 'Category', 'Description', 'Tags'];
  
  const rows = transactions.map(t => {
    const acc = accounts.find(a => a.id === t.accountId)?.name || 'Unknown Account';
    const cat = t.categoryId === 'cat_transfer_fee' 
      ? 'Transaction Charges' 
      : (categories.find(c => c.id === t.categoryId)?.name || 'Unknown Category');
    const tagList = t.tags ? t.tags.join('; ') : '';
    
    return [
      t.date,
      t.type.toUpperCase(),
      t.amount,
      `"${acc.replace(/"/g, '""')}"`,
      `"${cat.replace(/"/g, '""')}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${tagList.replace(/"/g, '""')}"`
    ];
  });

  const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  return csvContent;
}

// Generate CSV string for Excel Export of Transfers
export function exportTransfersToCSV(
  transfers: Transfer[],
  accounts: Account[]
): string {
  const headers = ['Date', 'From Account', 'To Account', 'Amount', 'Description'];
  
  const rows = transfers.map(t => {
    const fromAcc = accounts.find(a => a.id === t.fromAccountId)?.name || 'Unknown';
    const toAcc = accounts.find(a => a.id === t.toAccountId)?.name || 'Unknown';
    
    return [
      t.date,
      `"${fromAcc.replace(/"/g, '""')}"`,
      `"${toAcc.replace(/"/g, '""')}"`,
      t.amount,
      `"${(t.description || '').replace(/"/g, '""')}"`
    ];
  });

  const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  return csvContent;
}

// Helper to get first and last date of a month (Input: "2026-06")
export function getMonthDateRange(yearMonth: string) {
  const [year, month] = yearMonth.split('-').map(Number);
  const startDate = `${yearMonth}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;
  return { startDate, endDate };
}

// Group transactions by month (e.g. "2026-06" -> June 2026)
export function getAvailableMonths(transactions: Transaction[], transfers: Transfer[]): string[] {
  const months = new Set<string>();
  transactions.forEach(t => {
    if (t.date && t.date.length >= 7) {
      months.add(t.date.substring(0, 7));
    }
  });
  transfers.forEach(t => {
    if (t.date && t.date.length >= 7) {
      months.add(t.date.substring(0, 7));
    }
  });
  
  // Return sorted descending (newest first)
  return Array.from(months).sort().reverse();
}

export function formatMonthName(yearMonth: string): string {
  if (!yearMonth || yearMonth.length < 7) return yearMonth;
  const [year, month] = yearMonth.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}
