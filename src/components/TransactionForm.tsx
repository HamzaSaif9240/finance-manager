/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Transaction, Account, Category } from '../types';
import { CATEGORY_TAG_SUGGESTIONS } from '../initialData';
import LucideIcon from './LucideIcon';
import CustomSelect from './CustomSelect';

interface TransactionFormProps {
  accounts: Account[];
  categories: Category[];
  editingTransaction?: Transaction | null;
  onSave: (transactionData: Omit<Transaction, 'id'>, customCategoryName?: { name: string; type: 'income' | 'expense' }) => void;
  onCancel: () => void;
  currency: string;
}

export default function TransactionForm({
  accounts,
  categories,
  editingTransaction,
  onSave,
  onCancel,
  currency
}: TransactionFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Base fields
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [receiptImage, setReceiptImage] = useState<string | undefined>(undefined);
  const [tagsStr, setTagsStr] = useState('');
  const [dragOver, setDragOver] = useState(false);

  // States for adding custom categories inside form
  const [showCustomCatInput, setShowCustomCatInput] = useState(false);
  const [customCatName, setCustomCatName] = useState('');

  // States for custom tags
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  // Handle load state for editing
  useEffect(() => {
    if (editingTransaction) {
      setAmount(editingTransaction.amount.toString());
      setDate(editingTransaction.date);
      setType(editingTransaction.type);
      setAccountId(editingTransaction.accountId);
      setCategoryId(editingTransaction.categoryId);
      setDescription(editingTransaction.description || '');
      setReceiptImage(editingTransaction.receiptImage);
      setTagsStr(editingTransaction.tags ? editingTransaction.tags.join(', ') : '');
    } else {
      // Defaults
      setAmount('');
      setDate(new Date().toISOString().substring(0, 10));
      setType('expense');
      setAccountId(accounts[0]?.id || '');
      
      const firstExpCat = categories.find(c => c.type === 'expense');
      setCategoryId(firstExpCat?.id || '');
      setDescription('');
      setReceiptImage(undefined);
      setTagsStr('');
    }
    setErrorMsg('');
  }, [editingTransaction, accounts, categories]);

  // Handle suggested tags updates on category selection
  useEffect(() => {
    if (categoryId) {
      const suggestions = CATEGORY_TAG_SUGGESTIONS[categoryId] || [];
      setSuggestedTags(suggestions);
    } else {
      setSuggestedTags([]);
    }
  }, [categoryId]);

  // Adjust defaults when type switch occurs
  const handleTypeChange = (newType: 'income' | 'expense') => {
    setType(newType);
    const relatedCat = categories.find(c => c.type === newType);
    setCategoryId(relatedCat?.id || '');
  };

  // Convert image upload to Base64
  const handleImageFile = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Only image attachments are allowed inside the receipt vault');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Attachment size limit is 2MB for local storage safety.');
      return;
    }

    const fileReader = new FileReader();
    fileReader.onload = () => {
      setReceiptImage(fileReader.result as string);
    };
    fileReader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageFile(file);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMsg('Amount must be a dynamic valid number greater than 0');
      return;
    }

    if (!accountId) {
      setErrorMsg('Please associate an active payment credit/debit account');
      return;
    }

    // Verify account balance for expenditures
    if (type === 'expense' && !editingTransaction) {
      const parentAcc = accounts.find(a => a.id === accountId);
      if (parentAcc && parentAcc.balance < numericAmount) {
        setErrorMsg(`Insufficient funds inside ${parentAcc.name}. Active Balance: ${currency} ${parentAcc.balance}`);
        return;
      }
    }

    // Custom Category injection trigger
    let customCatObj = undefined;
    let finalCategoryId = categoryId;

    if (showCustomCatInput && customCatName.trim()) {
      customCatObj = {
        name: customCatName.trim(),
        type: type
      };
      // We will generate the target ID in the parent onSave
      finalCategoryId = 'cat_' + customCatName.trim().toLowerCase().replace(/\s+/g, '_');
    } else if (!categoryId) {
      setErrorMsg('Please select a valid budget category');
      return;
    }

    const tagsArr = tagsStr
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    onSave({
      amount: numericAmount,
      date,
      type,
      accountId,
      categoryId: finalCategoryId,
      description,
      receiptImage,
      tags: tagsArr
    }, customCatObj);
  };

  // Quick select a tag suggestion
  const appendTag = (tag: string) => {
    const existing = tagsStr
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);
    
    if (!existing.includes(tag)) {
      existing.push(tag);
      setTagsStr(existing.join(', '));
    }
  };

  const getFilteredCategories = () => {
    return categories.filter(c => c.type === type);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-850 shadow-lg max-w-xl mx-auto">
      <div className="flex items-center justify-between pb-4 border-b border-slate-50 dark:border-slate-800 mb-5">
        <h3 className="font-bold text-slate-950 dark:text-white text-base flex items-center gap-2">
          <LucideIcon name={editingTransaction ? 'Edit3' : 'PlusCircle'} className="text-emerald-500" />
          {editingTransaction ? 'Modify Transaction Statement' : 'Log New Transaction Flow'}
        </h3>
        
        <button
          onClick={onCancel}
          className="text-slate-400 hover:text-slate-600 dark:text-slate-500 hover:dark:text-slate-300 p-1.5 rounded-lg"
        >
          <LucideIcon name="X" size={18} />
        </button>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-4 text-xs sm:text-sm">
        
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30 text-rose-600 dark:text-rose-450 p-2.5 rounded-xl flex items-center gap-1.5 font-medium leading-relaxed">
            <LucideIcon name="AlertCircle" size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Transaction Type selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-450 uppercase mb-1.5">Flow Type Selection</label>
          <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-850 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => handleTypeChange('expense')}
              className={`py-2 text-center rounded-lg font-bold flex items-center justify-center gap-1 transition-all ${
                type === 'expense'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-550 hover:bg-slate-105'
              }`}
            >
              <LucideIcon name="ArrowDownLeft" size={15} />
              💸 Expense Outflow
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('income')}
              className={`py-2 text-center rounded-lg font-bold flex items-center justify-center gap-1 transition-all ${
                type === 'income'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-550 hover:bg-slate-105'
              }`}
            >
              <LucideIcon name="ArrowUpRight" size={15} />
              💰 Income Inflow
            </button>
          </div>
        </div>

        {/* Grid Area: Amount & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Amount ({currency})</label>
            <input
              type="number"
              required
              className="w-full bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white text-sm border-0 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-emerald-500"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Date</label>
            <input
              type="date"
              required
              className="w-full bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white text-sm border-0 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-emerald-500"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        {/* Paid from / Paid to Account dropdown */}
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            {type === 'income' ? 'Deposit Into (Payment Source)' : 'Paid From (Debit Account)'}
          </label>
          <CustomSelect
            options={accounts.map(acc => ({
              value: acc.id,
              label: `${acc.name} (Balance: ${currency} ${acc.balance.toLocaleString()})`,
              icon: acc.icon || (acc.type === 'cash' ? 'Wallet' : 'CreditCard')
            }))}
            value={accountId}
            onChange={(val) => setAccountId(val)}
            placeholder="-- Choose Account Asset --"
          />
        </div>

        {/* Category dropdown & Custom Adding slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs font-medium text-slate-500">
            <span>Accounting Category</span>
            <button
              type="button"
              onClick={() => setShowCustomCatInput(!showCustomCatInput)}
              className="text-emerald-500 font-semibold hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <LucideIcon name={showCustomCatInput ? 'ChevronUp' : 'PlusCircle'} size={12} />
              {showCustomCatInput ? 'Dismiss custom Add' : 'Define Custom Category'}
            </button>
          </div>

          {showCustomCatInput ? (
            <div className="bg-slate-50 dark:bg-slate-850/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Set Custom {type} Category Label</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="flex-1 bg-white dark:bg-slate-900 border-0 rounded-lg px-2.5 py-1.5 text-xs text-slate-850 dark:text-white focus:ring-1 focus:ring-emerald-500"
                  placeholder="e.g. Tea House, Subscriptions"
                  value={customCatName}
                  onChange={(e) => setCustomCatName(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <CustomSelect
              options={getFilteredCategories().map(cat => ({
                value: cat.id,
                label: cat.name,
                icon: cat.icon
              }))}
              value={categoryId}
              onChange={(val) => setCategoryId(val)}
              placeholder="-- Select Category --"
            />
          )}
        </div>

        {/* Description & Tags */}
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Description / Memo</label>
          <input
            type="text"
            className="w-full bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white text-sm border-0 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-emerald-500"
            placeholder="e.g. Bought monthly coffee stock"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Tags input & Quick Selection Recommendations */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            Tags (Optional, comma separated)
          </label>
          <input
            type="text"
            className="w-full bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white text-sm border-0 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-emerald-500"
            placeholder="e.g. Lunch, Uber, Upwork"
            value={tagsStr}
            onChange={(e) => setTagsStr(e.target.value)}
          />

          {suggestedTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-slate-400 font-medium">Quick Tag Suggestions:</span>
              {suggestedTags.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => appendTag(tag)}
                  className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 hover:text-emerald-500 text-[10px] sm:text-xs px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                >
                  +{tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Receipt Upload Vault: Supports Drag and Drop + Click Upload */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
            Receipt / Screenshot attachment
          </label>
          
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer border-2 border-dashed rounded-xl p-4 text-center transition-all flex flex-col items-center justify-center min-h-[100px] ${
              dragOver
                ? 'border-emerald-500 bg-emerald-500/5'
                : 'border-slate-200 dark:border-slate-800 hover:border-emerald-500/50'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageFile(file);
              }}
            />

            {receiptImage ? (
              <div className="space-y-2">
                <img
                  src={receiptImage}
                  alt="Receipt Preview"
                  referrerPolicy="no-referrer"
                  className="max-h-24 mx-auto rounded-lg object-contain shadow"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setReceiptImage(undefined);
                  }}
                  className="text-xs text-rose-500 hover:underline flex items-center justify-center gap-1 mx-auto cursor-pointer"
                >
                  <LucideIcon name="Trash2" size={12} />
                  Remove receipt
                </button>
              </div>
            ) : (
              <>
                <LucideIcon name="Camera" className="text-slate-400" size={24} />
                <span className="text-xs text-slate-550 block mt-1.5 font-medium">
                  Drag and drop a screenshot or click to upload
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">JPEG / PNG files max 2MB (kept offline)</span>
              </>
            )}
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-3 pt-4 border-t border-slate-50 dark:border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 text-center bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 hover:dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold rounded-xl text-sm transition-all"
          >
            Cancel / Close
          </button>
          
          <button
            type="submit"
            className="flex-1 py-2.5 text-center bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-1 cursor-pointer"
          >
            <LucideIcon name="Check" size={16} />
            {editingTransaction ? 'Update Entry' : 'Verify & Log Entry'}
          </button>
        </div>

      </form>
    </div>
  );
}
