/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Transaction, Account, Category } from '../types';
import { formatPKR, formatDate } from '../utils/financeHelpers';
import LucideIcon from './LucideIcon';

interface ReceiptVaultProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  currency: string;
}

export default function ReceiptVault({ transactions, accounts, categories, currency }: ReceiptVaultProps) {
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter transactions that have image attachments
  const transactionsWithReceipts = transactions.filter(t => !!t.receiptImage);

  // Apply search query
  const filteredReceipts = transactionsWithReceipts.filter(t => {
    const categoryName = categories.find(c => c.id === t.categoryId)?.name || '';
    const accountName = accounts.find(a => a.id === t.accountId)?.name || '';
    const description = t.description || '';
    const tags = t.tags ? t.tags.join(' ') : '';
    const query = searchQuery.toLowerCase();
    
    return (
      categoryName.toLowerCase().includes(query) ||
      accountName.toLowerCase().includes(query) ||
      description.toLowerCase().includes(query) ||
      tags.toLowerCase().includes(query) ||
      t.amount.toString().includes(query)
    );
  });

  const getCategoryDetails = (catId: string) => {
    return categories.find(c => c.id === catId) || { name: 'Unknown', icon: 'HelpCircle' };
  };

  const getAccountName = (accId: string) => {
    return accounts.find(a => a.id === accId)?.name || 'Unknown Account';
  };

  return (
    <div className="space-y-6">
      {/* Header section with description */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-950 dark:text-white flex items-center gap-2">
          <LucideIcon name="Camera" className="text-emerald-500" />
          Receipt Vault
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Store and manage screenshots, receipts, bills, and payment proof with your transactions. All data is kept 100% offline in your local database.
        </p>

        {/* Search Bar */}
        <div className="mt-4 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <LucideIcon name="Search" className="text-slate-400 dark:text-slate-500" size={16} />
          </div>
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-0 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 dark:text-white"
            placeholder="Search receipts by description, category, tags, account, or amount..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {filteredReceipts.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 border border-slate-100 dark:border-slate-800 shadow-sm text-center">
          <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <LucideIcon name="FileImage" className="text-slate-400 dark:text-slate-500" size={28} />
          </div>
          <h3 className="text-base font-semibold text-slate-950 dark:text-white">No Receipts Found</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {searchQuery ? "No receipts match your search filter." : "You haven't attached any receipt images yet. Tap on + Add Transaction or Edit, upload a screenshot or photo, and it will be visible here."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredReceipts.map((tx) => {
            const cat = getCategoryDetails(tx.categoryId);
            const accName = getAccountName(tx.accountId);
            return (
              <div
                key={tx.id}
                onClick={() => setSelectedTx(tx)}
                className="group cursor-pointer bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800 hover:shadow-md transition-all flex flex-col"
              >
                {/* Image thumb */}
                <div className="aspect-[4/3] bg-slate-100 dark:bg-slate-850 relative overflow-hidden flex items-center justify-center border-b border-slate-100 dark:border-slate-800">
                  <img
                    src={tx.receiptImage}
                    alt={tx.description || 'Receipt'}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] text-white font-medium flex items-center gap-1">
                    <LucideIcon name="Tag" size={10} />
                    {tx.type === 'income' ? 'Income' : 'Expense'}
                  </div>
                </div>

                {/* Receipt metadata */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <LucideIcon name={cat.icon} size={14} className="text-slate-400" />
                      <span>{cat.name}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                      <span>{formatDate(tx.date)}</span>
                    </div>

                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mt-2 line-clamp-1">
                      {tx.description || `${cat.name} Proof`}
                    </h4>

                    {tx.tags && tx.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {tx.tags.map((tag) => (
                          <span
                            key={tag}
                            className="bg-slate-50 dark:bg-slate-850 text-slate-600 dark:text-slate-300 text-[10px] px-1.5 py-0.5 rounded"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-50 dark:border-slate-850 mt-3 pt-3 flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[100px]">
                      {accName}
                    </span>
                    <span className={`text-sm font-bold ${tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatPKR(tx.amount, currency)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Enlarged Detail Modal */}
      {selectedTx && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
            {/* Modal header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-semibold text-slate-950 dark:text-white flex items-center gap-2">
                <LucideIcon name="FileText" className="text-emerald-500" />
                Receipt Details
              </h3>
              <button
                onClick={() => setSelectedTx(null)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400"
              >
                <LucideIcon name="X" size={20} />
              </button>
            </div>

            {/* Modal content body */}
            <div className="overflow-y-auto p-6 flex flex-col md:flex-row gap-6">
              {/* Image segment */}
              <div className="flex-1 min-h-[250px] bg-slate-100 dark:bg-slate-900 rounded-xl relative overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-800">
                <img
                  src={selectedTx.receiptImage}
                  alt={selectedTx.description}
                  referrerPolicy="no-referrer"
                  className="max-h-[350px] md:max-h-[450px] object-contain"
                />
                <a
                  href={selectedTx.receiptImage}
                  download={`receipt-${selectedTx.id}.png`}
                  className="absolute bottom-3 right-3 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs text-white hover:bg-slate-900 flex items-center gap-1 shadow-sm"
                >
                  <LucideIcon name="Download" size={12} />
                  Download
                </a>
              </div>

              {/* Transaction data details */}
              <div className="w-full md:w-64 space-y-4">
                <div>
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Transaction amount</span>
                  <div className={`text-2xl font-black mt-0.5 ${selectedTx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {selectedTx.type === 'income' ? '+' : '-'}{formatPKR(selectedTx.amount, currency)}
                  </div>
                </div>

                <div className="space-y-2 text-sm border-t border-slate-100 dark:border-slate-850 pt-3">
                  <div>
                    <span className="text-slate-400 text-xs block">Category</span>
                    <span className="font-medium text-slate-900 dark:text-white flex items-center gap-1.5 mt-0.5">
                      <LucideIcon name={getCategoryDetails(selectedTx.categoryId).icon} size={14} className="text-slate-500" />
                      {getCategoryDetails(selectedTx.categoryId).name}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-xs block">Paid {selectedTx.type === 'income' ? 'To' : 'From'}</span>
                    <span className="font-medium text-slate-900 dark:text-white block mt-0.5">
                      {getAccountName(selectedTx.accountId)}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-xs block">Transaction Date</span>
                    <span className="font-medium text-slate-900 dark:text-white block mt-0.5">
                      {formatDate(selectedTx.date)}
                    </span>
                  </div>

                  {selectedTx.description && (
                    <div>
                      <span className="text-slate-400 text-xs block">Description</span>
                      <p className="text-xs text-slate-700 dark:text-slate-350 bg-slate-50 dark:bg-slate-900 p-2 rounded mt-1 whitespace-pre-line">
                        {selectedTx.description}
                      </p>
                    </div>
                  )}

                  {selectedTx.tags && selectedTx.tags.length > 0 && (
                    <div>
                      <span className="text-slate-400 text-xs block">Tags</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedTx.tags.map((tag) => (
                          <span
                            key={tag}
                            className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 text-[10px] px-1.5 py-0.5 rounded border border-emerald-100/50 dark:border-emerald-900/30"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
