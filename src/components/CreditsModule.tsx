/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Account, CreditRecord, CreditPayment, CreditRecordItem } from '../types';
import { formatPKR, formatDate } from '../utils/financeHelpers';
import LucideIcon from './LucideIcon';

interface CreditsModuleProps {
  creditRecords: CreditRecord[];
  accounts: Account[];
  onAddCreditRecord: (
    record: Omit<CreditRecord, 'id' | 'repaidAmount' | 'payments' | 'status'>,
    adjustWallet: boolean,
    initialPaidAmount: number
  ) => void;
  onAddCreditPayment: (recordId: string, payment: Omit<CreditPayment, 'id'>, adjustWallet: boolean) => void;
  onSettleCreditRecord: (recordId: string, accountId: string, adjustWallet: boolean) => void;
  onDeleteCreditRecord: (recordId: string) => void;
  onEditCreditRecord: (
    recordId: string,
    updatedData: Partial<Omit<CreditRecord, 'id' | 'payments' | 'repaidAmount' | 'status'>>
  ) => void;
  currency: string;
}

export default function CreditsModule({
  creditRecords = [],
  accounts = [],
  onAddCreditRecord,
  onAddCreditPayment,
  onSettleCreditRecord,
  onDeleteCreditRecord,
  onEditCreditRecord,
  currency
}: CreditsModuleProps) {
  // Navigation & Filtering Filters
  const [filterType, setFilterType] = useState<'all' | 'sales' | 'purchases' | 'pending' | 'settled'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Credit Record Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [recordType, setRecordType] = useState<'sale' | 'purchase'>('sale');
  const [partyName, setPartyName] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [dateCreated, setDateCreated] = useState(() => new Date().toISOString().substring(0, 10));
  const [dueDate, setDueDate] = useState('');
  const [accountId, setAccountId] = useState(() => accounts[0]?.id || '');
  const [adjustWallet, setAdjustWallet] = useState(true);
  const [initialDownpayment, setInitialDownpayment] = useState('');

  // Elegant Custom Dropdown States
  const [isMainAccDropdownOpen, setIsMainAccDropdownOpen] = useState(false);
  const [isPaymentAccDropdownOpen, setIsPaymentAccDropdownOpen] = useState(false);
  const [isSettleAccDropdownOpen, setIsSettleAccDropdownOpen] = useState(false);
  
  // Dynamic Item List inside Adding Modal
  const [itemsList, setItemsList] = useState<Omit<CreditRecordItem, 'id'>[]>([
    { name: '', quantity: 1, price: 0 }
  ]);

  // Collapsible expansions
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Partial Payment Modal State
  const [payingRecord, setPayingRecord] = useState<CreditRecord | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentAccountId, setPaymentAccountId] = useState(() => accounts[0]?.id || '');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentAdjustWallet, setPaymentAdjustWallet] = useState(true);

  // Settlement Confirmation Modal State
  const [settlingRecord, setSettlingRecord] = useState<CreditRecord | null>(null);
  const [settleAccountId, setSettleAccountId] = useState(() => accounts[0]?.id || '');
  const [settleAdjustWallet, setSettleAdjustWallet] = useState(true);

  // Delete Confirm State
  const [recordToDelete, setRecordToDelete] = useState<CreditRecord | null>(null);

  // Edit Credit Record Modal State
  const [editingRecord, setEditingRecord] = useState<CreditRecord | null>(null);
  const [editPartyName, setEditPartyName] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDateCreated, setEditDateCreated] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editItemsList, setEditItemsList] = useState<Omit<CreditRecordItem, 'id'>[]>([]);
  const [editAccountId, setEditAccountId] = useState('');
  const [isEditAccDropdownOpen, setIsEditAccDropdownOpen] = useState(false);

  const handleOpenEditModal = (rec: CreditRecord) => {
    setEditingRecord(rec);
    setEditPartyName(rec.partyName);
    setEditCity(rec.city);
    setEditPhone(rec.phone || '');
    setEditDescription(rec.description || '');
    setEditDateCreated(rec.dateCreated);
    setEditDueDate(rec.dueDate || '');
    setEditAccountId(rec.accountId || accounts[0]?.id || '');
    setEditItemsList(rec.items ? rec.items.map(it => ({ name: it.name, quantity: it.quantity, price: it.price })) : [{ name: '', quantity: 1, price: 0 }]);
  };

  const handleUpdateEditItemField = (idx: number, field: keyof Omit<CreditRecordItem, 'id'>, value: any) => {
    const updated = [...editItemsList];
    updated[idx] = {
      ...updated[idx],
      [field]: value
    };
    setEditItemsList(updated);
  };

  const handleAddEditItemLine = () => {
    setEditItemsList([...editItemsList, { name: '', quantity: 1, price: 0 }]);
  };

  const handleRemoveEditItemLine = (idx: number) => {
    if (editItemsList.length <= 1) return;
    setEditItemsList(editItemsList.filter((_, i) => i !== idx));
  };

  const calculatedEditInvoiceTotal = useMemo(() => {
    return editItemsList.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  }, [editItemsList]);

  const handleSaveEditRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    if (!editPartyName.trim()) {
      alert('Please specify name.');
      return;
    }
    if (!editCity.trim()) {
      alert('Please specify city.');
      return;
    }
    if (calculatedEditInvoiceTotal <= 0) {
      alert('Invoice grand total must be greater than 0 PKR.');
      return;
    }

    const finalizedItems: CreditRecordItem[] = editItemsList
      .filter(it => it.name.trim() !== '')
      .map((it, i) => ({
        id: 'it_line_' + Date.now().toString() + '_' + i,
        name: it.name,
        quantity: typeof it.quantity === 'number' ? it.quantity : Number(it.quantity) || 0,
        price: typeof it.price === 'number' ? it.price : Number(it.price) || 0
      }));

    onEditCreditRecord(editingRecord.id, {
      partyName: editPartyName.trim(),
      city: editCity.trim(),
      phone: editPhone.trim() || undefined,
      amount: calculatedEditInvoiceTotal,
      dateCreated: editDateCreated,
      dueDate: editDueDate || undefined,
      description: editDescription.trim() || undefined,
      items: finalizedItems,
      accountId: editAccountId || undefined
    });

    setEditingRecord(null);
  };

  // Helpers for items edit
  const handleAddItemLine = () => {
    setItemsList([...itemsList, { name: '', quantity: 1, price: 0 }]);
  };

  const handleRemoveItemLine = (idx: number) => {
    if (itemsList.length <= 1) return;
    setItemsList(itemsList.filter((_, i) => i !== idx));
  };

  const handleUpdateItemField = (idx: number, field: keyof Omit<CreditRecordItem, 'id'>, value: any) => {
    const updated = [...itemsList];
    updated[idx] = {
      ...updated[idx],
      [field]: value
    };
    setItemsList(updated);
  };

  // Math calculated values for total cost
  const calculatedInvoiceTotal = useMemo(() => {
    return itemsList.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  }, [itemsList]);

  // Overall statistics
  const metrics = useMemo(() => {
    let salesTotal = 0;
    let salesOutstanding = 0;
    let purchasesTotal = 0;
    let purchasesOutstanding = 0;
    let settledSalesCount = 0;
    let settledPurchasesCount = 0;

    creditRecords.forEach(rec => {
      const remaining = Math.max(0, rec.amount - rec.repaidAmount);
      if (rec.type === 'sale') {
        salesTotal += rec.amount;
        salesOutstanding += remaining;
        if (rec.status === 'paid') settledSalesCount++;
      } else {
        purchasesTotal += rec.amount;
        purchasesOutstanding += remaining;
        if (rec.status === 'paid') settledPurchasesCount++;
      }
    });

    return {
      salesTotal,
      salesOutstanding,
      purchasesTotal,
      purchasesOutstanding,
      settledSalesCount,
      settledPurchasesCount,
      netReceivables: salesOutstanding - purchasesOutstanding
    };
  }, [creditRecords]);

  // Filter and Search matching
  const filteredList = useMemo(() => {
    return creditRecords.filter(rec => {
      // Type matches
      if (filterType === 'sales' && rec.type !== 'sale') return false;
      if (filterType === 'purchases' && rec.type !== 'purchase') return false;
      if (filterType === 'pending' && rec.status === 'paid') return false;
      if (filterType === 'settled' && rec.status !== 'paid') return false;

      // Query matches
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesParty = rec.partyName.toLowerCase().includes(q);
        const matchesCity = (rec.city || '').toLowerCase().includes(q);
        const matchesPhone = (rec.phone || '').toLowerCase().includes(q);
        const matchesDesc = (rec.description || '').toLowerCase().includes(q);
        const matchesItems = rec.items?.some(it => it.name.toLowerCase().includes(q)) || false;

        return matchesParty || matchesCity || matchesPhone || matchesDesc || matchesItems;
      }

      return true;
    });
  }, [creditRecords, filterType, searchQuery]);

  // Reset core adding form
  const resetAddForm = () => {
    setPartyName('');
    setCity('');
    setPhone('');
    setDescription('');
    setDateCreated(new Date().toISOString().substring(0, 10));
    setDueDate('');
    setAccountId(accounts[0]?.id || '');
    setInitialDownpayment('');
    setAdjustWallet(true);
    setItemsList([{ name: '', quantity: 1, price: 0 }]);
  };

  // Dispatchers
  const handleSubmitRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyName.trim()) {
      alert('Please specify the deal party name (customer or reseller).');
      return;
    }
    if (!city.trim()) {
      alert('Please specify the city location of trade dealings.');
      return;
    }
    if (calculatedInvoiceTotal <= 0) {
      alert('Invoice grand total must be greater than 0 PKR. Please configure item prices and quantities.');
      return;
    }

    const downpaymentVal = parseFloat(initialDownpayment) || 0;
    if (downpaymentVal < 0) {
      alert('Advance downpayment cannot be negative.');
      return;
    }
    
    if (downpaymentVal > calculatedInvoiceTotal) {
      alert('Downpayment cannot exceed the grand invoice total.');
      return;
    }

    // Build unique sub-items
    const finalizedItems: CreditRecordItem[] = itemsList
      .filter(it => it.name.trim() !== '')
      .map((it, i) => ({
        id: 'it_line_' + Date.now().toString() + '_' + i,
        name: it.name,
        quantity: it.quantity,
        price: it.price
      }));

    onAddCreditRecord(
      {
        type: recordType,
        partyName: partyName.trim(),
        city: city.trim(),
        phone: phone.trim() || undefined,
        amount: calculatedInvoiceTotal,
        dateCreated,
        dueDate: dueDate || undefined,
        description: description.trim() || undefined,
        items: finalizedItems,
        accountId: accountId || undefined
      },
      adjustWallet,
      downpaymentVal
    );

    setIsAddModalOpen(false);
    resetAddForm();
  };

  const handleOpenPayment = (rec: CreditRecord) => {
    setPayingRecord(rec);
    const balance = Math.max(0, rec.amount - rec.repaidAmount);
    setPaymentAmount(balance.toString());
    setPaymentAccountId(rec.accountId || accounts[0]?.id || '');
    setPaymentDate(new Date().toISOString().substring(0, 10));
    setPaymentNotes('');
    setPaymentAdjustWallet(true);
  };

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingRecord) return;

    const payAmt = parseFloat(paymentAmount);
    if (!payAmt || payAmt <= 0) {
      alert('Specify a positive installment amount.');
      return;
    }

    const outstanding = Math.max(0, payingRecord.amount - payingRecord.repaidAmount);
    if (payAmt > outstanding + 0.01) {
      alert(`Installment amount cannot exceed the pending outstanding dues of ${formatPKR(outstanding, currency)}`);
      return;
    }

    onAddCreditPayment(
      payingRecord.id,
      {
        amount: payAmt,
        date: paymentDate,
        accountId: paymentAccountId,
        notes: paymentNotes.trim() || undefined
      },
      paymentAdjustWallet
    );

    setPayingRecord(null);
  };

  const handleOpenSettle = (rec: CreditRecord) => {
    setSettlingRecord(rec);
    setSettleAccountId(rec.accountId || accounts[0]?.id || '');
    setSettleAdjustWallet(true);
  };

  const handleSubmitSettle = () => {
    if (!settlingRecord) return;
    onSettleCreditRecord(settlingRecord.id, settleAccountId, settleAdjustWallet);
    setSettlingRecord(null);
  };

  const handleDeleteRecord = (recId: string) => {
    onDeleteCreditRecord(recId);
    setRecordToDelete(null);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-6 flex-1 min-w-0" id="credit_master_section">
      {/* Overview stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fadeIn">
        {/* Sales Receivable Card */}
        <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/5 dark:from-emerald-950/20 dark:to-slate-900 border border-emerald-500/20 dark:border-emerald-900/40 p-4 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden" id="stat_sales">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-600 dark:text-emerald-400">Credit Sales Outstanding</span>
            <div className="p-1 px-1.5 bg-emerald-500/10 dark:bg-emerald-500/20 text-[9px] font-black text-emerald-600 dark:text-emerald-400 rounded-lg">Receivable</div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-none">
              {formatPKR(metrics.salesOutstanding, currency)}
            </h3>
            <p className="text-[10px] text-slate-450 dark:text-slate-400 mt-1.5 leading-tight">
              Earned Sales: <span className="font-semibold text-slate-700 dark:text-slate-300">{formatPKR(metrics.salesTotal, currency)}</span> ({metrics.settledSalesCount} settled)
            </p>
          </div>
        </div>

        {/* Purchases Payable Card */}
        <div className="bg-gradient-to-br from-rose-500/10 to-orange-500/5 dark:from-rose-950/20 dark:to-slate-900 border border-rose-500/20 dark:border-rose-900/40 p-4 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden" id="stat_purchases">
          <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider uppercase text-rose-600 dark:text-rose-450">Credit Purchases Outstanding</span>
            <div className="p-1 px-1.5 bg-rose-500/10 dark:bg-rose-500/20 text-[9px] font-black text-rose-600 dark:text-rose-455 rounded-lg">Payable</div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-none">
              {formatPKR(metrics.purchasesOutstanding, currency)}
            </h3>
            <p className="text-[10px] text-slate-450 dark:text-slate-400 mt-1.5 leading-tight">
              Acquired Stock: <span className="font-semibold text-slate-700 dark:text-slate-300">{formatPKR(metrics.purchasesTotal, currency)}</span> ({metrics.settledPurchasesCount} settled)
            </p>
          </div>
        </div>

        {/* Net Asset Balance Difference */}
        <div className="bg-gradient-to-br from-indigo-500/10 to-sky-500/5 dark:from-indigo-950/25 dark:to-slate-900 border border-indigo-500/20 dark:border-indigo-900/40 p-4 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden" id="stat_net">
          <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider uppercase text-indigo-600 dark:text-indigo-400">Net Trade Credit Position</span>
            <div className="p-1 text-[9px] text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1">
              <LucideIcon name="Scale" size={11} /> Balance
            </div>
          </div>
          <div className="mt-3">
            <h3 className={`text-xl sm:text-2xl font-black leading-none ${metrics.netReceivables >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {metrics.netReceivables >= 0 ? '+' : ''}{formatPKR(metrics.netReceivables, currency)}
            </h3>
            <p className="text-[10px] text-slate-450 dark:text-slate-400 mt-1.5 leading-tight">
              {metrics.netReceivables >= 0 
                ? "Net surplus of trade cash receivables" 
                : "Obligations exceed receivables balance"
              }
            </p>
          </div>
        </div>

        {/* Ledger total transaction records count */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden" id="stat_count">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider uppercase text-slate-450 dark:text-slate-400">Deal Files Cleared</span>
            <div className="p-1 text-slate-400 dark:text-slate-650">
              <LucideIcon name="ShieldCheck" size={13} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-none">
              {(metrics.settledSalesCount + metrics.settledPurchasesCount)} / {creditRecords.length}
            </h3>
            <p className="text-[10px] text-slate-450 dark:text-slate-400 mt-1.5 leading-tight">
              Completed trade files overall: <span className="font-semibold text-slate-700 dark:text-slate-300">
                {creditRecords.length > 0 
                  ? Math.round(((metrics.settledSalesCount + metrics.settledPurchasesCount) / creditRecords.length) * 100) 
                  : 0}%
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Actions and filter panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-4 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm" id="credits_filter_panel">
        <div className="flex flex-wrap items-center gap-1.5">
          {(['all', 'sales', 'purchases', 'pending', 'settled'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilterType(f)}
              className={`p-1.5 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer transition ${
                filterType === f
                  ? 'bg-emerald-500 text-white font-black shadow-inner shadow-black/10'
                  : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-300'
              }`}
              id={`filter_btn_${f}`}
            >
              {f === 'sales' ? 'Receivable Sales' : f === 'purchases' ? 'Payable Purchases' : f}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Search bar input */}
          <div className="relative flex-1 sm:w-60">
            <LucideIcon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search seller, buyer, city or goods..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-white placeholder:text-slate-400"
              id="search_field_credits"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 block text-[10px] font-bold"
              >
                Clear
              </button>
            )}
          </div>

          <button
            onClick={() => {
              resetAddForm();
              setIsAddModalOpen(true);
            }}
            className="p-2 px-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-500/10 cursor-pointer transition"
            id="open_add_credit_modal"
          >
            <LucideIcon name="Plus" size={14} /> Add Credit Bilateral
          </button>
        </div>
      </div>

      {/* Main Listing Grid */}
      {filteredList.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-450 dark:text-slate-550 flex flex-col items-center justify-center gap-2" id="credits_empty_state">
          <span className="text-4xl">🧾</span>
          <h4 className="font-bold text-slate-700 dark:text-slate-355 text-sm">No Credit Dealing Logs</h4>
          <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mt-0.5">
            There are no credit records matching your active filters. Click the button above to record credit acquisitions or client deliverables.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4" id="credits_listing_grid">
          {filteredList.map(rec => {
            const remaining = Math.max(0, rec.amount - rec.repaidAmount);
            const isSettled = rec.status === 'paid';
            const progressPct = Math.min(100, Math.round((rec.repaidAmount / rec.amount) * 100));

            // Is Overdue check
            let isOverdue = false;
            let daysText = '';
            if (!isSettled && rec.dueDate) {
              const diffTime = new Date(rec.dueDate).getTime() - new Date().getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              if (diffDays < 0) {
                isOverdue = true;
                daysText = `${Math.abs(diffDays)} days overdue`;
              } else if (diffDays === 0) {
                daysText = 'Due today';
              } else {
                daysText = `Due in ${diffDays} days`;
              }
            }

            return (
              <div
                key={rec.id}
                className={`bg-white dark:bg-slate-900 border transition-all duration-300 rounded-2xl shadow-sm ${
                  expandedId === rec.id 
                    ? 'ring-1 ring-slate-200 dark:ring-slate-850 border-slate-200 dark:border-slate-800' 
                    : 'border-slate-100 dark:border-slate-800 hover:border-slate-200'
                }`}
                id={`credit_row_card_${rec.id}`}
              >
                {/* Collapsible Header */}
                <div 
                  onClick={() => toggleExpand(rec.id)}
                  className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="flex items-start gap-3.5">
                    <div className={`p-2.5 rounded-xl shrink-0 ${
                      rec.type === 'sale' 
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500' 
                        : 'bg-rose-50 dark:bg-rose-950/30 text-rose-500'
                    }`}>
                      <LucideIcon name={rec.type === 'sale' ? 'TrendingUp' : 'TrendingDown'} size={18} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-slate-800 dark:text-white text-sm sm:text-base pr-1 truncate">
                          {rec.partyName}
                        </h4>
                        
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap bg-slate-50 dark:bg-slate-950 p-1 px-2 rounded-lg">
                          <LucideIcon name="MapPin" size={10} className="text-slate-400" />
                          <span className="truncate">{rec.city}</span>
                        </div>

                        {rec.phone && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-450 dark:text-slate-400 font-medium whitespace-nowrap bg-slate-50 dark:bg-slate-950 p-1 px-2 rounded-lg">
                            <LucideIcon name="Phone" size={10} className="text-slate-400" />
                            <span>{rec.phone}</span>
                          </div>
                        )}

                        {rec.dueDate && (
                          <span className={`text-[10px] font-semibold p-1 px-2 rounded-lg flex items-center gap-1 ${
                            isOverdue 
                              ? 'bg-rose-500/10 text-rose-500' 
                              : isSettled 
                                ? 'bg-slate-50 dark:bg-slate-950 text-slate-400' 
                                : 'bg-amber-500/10 text-amber-500'
                          }`}>
                            <LucideIcon name="Calendar" size={10} />
                            {isSettled ? `Settled on ${formatDate(rec.dueDate)}` : daysText}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-450 dark:text-slate-400 mt-1 lines-clamp-1 max-w-xl">
                        {rec.description || 'No credit description summary attached.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-none pt-3 md:pt-0 border-slate-50 dark:border-slate-850">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 pr-0.5">PENDING DUES</span>
                      <h4 className="text-base sm:text-lg font-black text-slate-800 dark:text-white leading-none mt-1">
                        {formatPKR(remaining, currency)}
                      </h4>
                      <p className="text-[10px] text-slate-450 dark:text-slate-400 mt-1">
                        Total Invoice: <span className="font-semibold text-slate-700 dark:text-slate-300">{formatPKR(rec.amount, currency)}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* State status tag badge */}
                      <span className={`p-1 px-2.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        rec.status === 'paid' 
                          ? 'bg-emerald-500/10 text-emerald-500' 
                          : rec.status === 'partial'
                            ? 'bg-amber-500/10 text-amber-500 animate-pulse'
                            : 'bg-red-500/10 text-red-500'
                      }`}>
                        {rec.status === 'paid' ? 'Settled' : rec.status === 'partial' ? 'Part-Paid' : 'Pending'}
                      </span>

                      <div className="text-slate-400">
                        <LucideIcon name={expandedId === rec.id ? "ChevronUp" : "ChevronDown"} size={16} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Collapsible Expansion Content */}
                {expandedId === rec.id && (
                  <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-850 bg-slate-50/20 dark:bg-slate-900/40 space-y-5 rounded-b-2xl animate-fadeIn">
                    
                    {/* Visual Progress bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-500">Repayment Clearance Progress</span>
                        <span className="font-black text-slate-800 dark:text-white">{progressPct}% ({formatPKR(rec.repaidAmount, currency)} cleared)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden flex shadow-inner">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            rec.type === 'sale' ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-rose-500 to-orange-400'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Collapsible detail grids: item list, payment log, description note */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1.5">
                      
                      {/* Left Block: Invoice Item list (O(1) table structure) */}
                      <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4 shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-850 pb-2.5 mb-2.5">
                          <span className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                            <LucideIcon name="FileSpreadsheet" size={13} className="text-slate-400" />
                            Trade Invoice Line Items
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold">
                            {rec.items?.length || 0} distinct articles
                          </span>
                        </div>

                        {!rec.items || rec.items.length === 0 ? (
                          <p className="text-xs text-slate-400 italic py-2 text-center">No explicit sub-items prefilled for this deal file.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="border-b border-slate-50 dark:border-slate-850 text-slate-450 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                                  <th className="pb-2">Description / Goods</th>
                                  <th className="pb-2 text-center">Quantity</th>
                                  <th className="pb-2 text-right">Unit Price</th>
                                  <th className="pb-2 text-right">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50 dark:divide-slate-850 text-slate-700 dark:text-slate-350">
                                {rec.items.map(item => (
                                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                                    <td className="py-2.5 font-bold truncate max-w-[140px]" title={item.name}>{item.name}</td>
                                    <td className="py-2.5 text-center font-mono">{item.quantity}</td>
                                    <td className="py-2.5 text-right font-mono">{formatPKR(item.price, currency)}</td>
                                    <td className="py-2.5 text-right font-black text-slate-850 dark:text-white font-mono">
                                      {formatPKR(item.quantity * item.price, currency)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="border-t border-slate-100 dark:border-slate-800 text-slate-850 dark:text-white font-black text-xs">
                                  <td colSpan={3} className="pt-3 font-bold">Invoice Grand Total</td>
                                  <td className="pt-3 text-right font-mono">{formatPKR(rec.amount, currency)}</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* Right Block: Payments timeline log */}
                      <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-850 pb-2.5 mb-2.5">
                            <span className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                              <LucideIcon name="History" size={13} className="text-slate-400" />
                              Installment Timelines
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">
                              {rec.payments?.length || 0} clear logs
                            </span>
                          </div>

                          {!rec.payments || rec.payments.length === 0 ? (
                            <p className="text-xs text-slate-400 italic py-6 text-center">No payment log installments recorded yet.</p>
                          ) : (
                            <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                              {rec.payments.map((p, pIdx) => {
                                const accObj = accounts.find(a => a.id === p.accountId);
                                return (
                                  <div 
                                    key={p.id} 
                                    className="p-2 border border-slate-100 dark:border-slate-850 rounded-lg bg-slate-50/50 dark:bg-slate-950/20 text-[11px] relative overflow-hidden group/payrow"
                                  >
                                    <div className="flex items-center justify-between font-bold text-slate-800 dark:text-white">
                                      <span className="font-mono">{formatPKR(p.amount, currency)}</span>
                                      <span className="text-[10px] text-slate-400">{formatDate(p.date)}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-slate-450 dark:text-slate-500 mt-1 leading-normal">
                                      <p className="truncate max-w-[130px]">{p.notes || 'Bilateral installment payment unit.'}</p>
                                      {accObj && (
                                        <div className="flex items-center gap-1 whitespace-nowrap bg-slate-100 dark:bg-slate-800 p-0.5 px-1 rounded text-slate-600 dark:text-slate-400 text-[9px] font-bold">
                                          <LucideIcon name="CreditCard" size={8} />
                                          {accObj.name}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Expandable row Footer Action elements */}
                        <div className="pt-4 border-t border-slate-50 dark:border-slate-850 flex items-center flex-wrap gap-2 justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                // Delete trigger
                                setRecordToDelete(rec);
                              }}
                              className="p-1 px-2.5 border border-rose-100 text-rose-500 hover:bg-rose-50 dark:border-rose-950/40 dark:hover:bg-rose-950/20 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition"
                              title="Deport file entry completely"
                            >
                              <LucideIcon name="Trash2" size={12} /> Wipe Entry
                            </button>

                            <button
                              onClick={() => handleOpenEditModal(rec)}
                              className="p-1 px-2.5 border border-amber-200/60 dark:border-amber-900/50 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition"
                              title="Edit entry details"
                            >
                              <LucideIcon name="Edit3" size={12} /> Edit Entry
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {!isSettled && (
                              <>
                                <button
                                  onClick={() => handleOpenSettle(rec)}
                                  className="p-1 px-2.5 bg-slate-150 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold cursor-pointer transition"
                                >
                                  Instant Settle
                                </button>

                                <button
                                  onClick={() => handleOpenPayment(rec)}
                                  className="p-1 px-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold shadow-sm cursor-pointer transition flex items-center gap-0.5"
                                >
                                  <LucideIcon name="Plus" size={11} /> Log Payment
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: ADD CREDIT RECORD */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/65 dark:bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal border glow accents */}
            <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${
              recordType === 'sale' ? 'from-emerald-500 to-teal-400' : 'from-rose-500 to-orange-400'
            }`} />

            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">Record Credit Dealing</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Define buyers/vendors parameters, items log, and installment baselines.</p>
              </div>

              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 hover:bg-slate-150 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer transition"
              >
                <LucideIcon name="X" size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitRecord} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              
              {/* Record Type tab toggle button */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black tracking-wider text-slate-450 dark:text-slate-500 block">Trading Deal Type</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100/60 dark:bg-slate-950 p-1.5 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setRecordType('sale')}
                    className={`p-2 rounded-xl text-xs font-bold text-center cursor-pointer transition flex items-center justify-center gap-1.5 ${
                      recordType === 'sale'
                        ? 'bg-emerald-500 text-white font-black shadow-md shadow-emerald-500/20'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    <LucideIcon name="TrendingUp" size={13} />
                    Credit Sale (Receivable)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecordType('purchase')}
                    className={`p-2 rounded-xl text-xs font-bold text-center cursor-pointer transition flex items-center justify-center gap-1.5 ${
                      recordType === 'purchase'
                        ? 'bg-rose-500 text-white font-black shadow-md shadow-rose-500/20'
                        : 'text-slate-400 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    <LucideIcon name="TrendingDown" size={13} />
                    Credit Purchase (Payable)
                  </button>
                </div>
              </div>

              {/* Bilateral Party Name, Phone & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black tracking-wider text-slate-450 dark:text-slate-500 block">
                    {recordType === 'sale' ? 'Buyer Name' : 'Seller Name'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={recordType === 'sale' ? 'e.g. Ali Ahmed' : 'e.g. Sufyan Yarn Store'}
                    value={partyName}
                    onChange={e => setPartyName(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-white placeholder:text-slate-400/70"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black tracking-wider text-slate-450 dark:text-slate-500 block">
                    {recordType === 'sale' ? 'Buyer Phone Number' : 'Seller Phone Number'}
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 03001234567 (optional)"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-white placeholder:text-slate-400/70"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black tracking-wider text-slate-450 dark:text-slate-500 block">
                    {recordType === 'sale' ? "Buyer's City" : "Seller's City"} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lahore, Faisalabad"
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-550 text-slate-800 dark:text-white placeholder:text-slate-400/70"
                  />
                </div>
              </div>

              {/* Created & Due Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black tracking-wider text-slate-450 dark:text-slate-500 block">Invoice Event Date</label>
                  <input
                    type="date"
                    required
                    value={dateCreated}
                    onChange={e => setDateCreated(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black tracking-wider text-slate-450 dark:text-slate-500 block">Bilateral Grace Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Dynamic Sub-items list detail mapping */}
              <div className="border border-slate-100 dark:border-slate-800 p-4 rounded-2xl bg-slate-50/10 dark:bg-slate-950/10 space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="text-[10px] uppercase font-black tracking-wider text-slate-500 block">Itemized Merchandise Lines</span>
                  <button
                    type="button"
                    onClick={handleAddItemLine}
                    className="p-1 px-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 transition text-emerald-500 text-[10px] font-black rounded-md flex items-center gap-1 cursor-pointer"
                  >
                    <LucideIcon name="Plus" size={10} /> Add Line Item
                  </button>
                </div>

                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                  {itemsList.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 border-b sm:border-none pb-3.5 sm:pb-0 border-slate-100 dark:border-slate-800">
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          required
                          placeholder="Items / Description description"
                          value={item.name}
                          onChange={e => handleUpdateItemField(idx, 'name', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-white"
                        />
                      </div>

                      <div className="w-16">
                        <input
                          type="number"
                          required
                          min="1"
                          placeholder="Qty"
                          value={item.quantity || ''}
                          onChange={e => handleUpdateItemField(idx, 'quantity', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 font-mono text-center text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none text-slate-800 dark:text-white"
                        />
                      </div>

                      <div className="w-24">
                        <input
                          type="number"
                          required
                          min="0"
                          placeholder="Unit PKR"
                          value={item.price || ''}
                          onChange={e => handleUpdateItemField(idx, 'price', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 font-mono text-right text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none text-slate-800 dark:text-white"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItemLine(idx)}
                        disabled={itemsList.length <= 1}
                        className="p-1.5 text-slate-400 hover:text-rose-500 disabled:opacity-30 rounded-lg cursor-pointer transition shrink-0"
                      >
                        <LucideIcon name="Trash2" size={13} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="pt-2 text-right text-xs font-black text-slate-800 dark:text-white flex justify-between">
                  <span>Grand Total Cumulative Sum:</span>
                  <span className="font-mono text-emerald-500 dark:text-emerald-400 text-sm">
                    {formatPKR(calculatedInvoiceTotal, currency)}
                  </span>
                </div>
              </div>

              {/* Downpayment & Wallet Setup */}
              <div className="bg-slate-50/50 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-850 grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black tracking-wider text-slate-450 dark:text-slate-500 block">Advance Downpayment Paid</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 5000 (leave empty if zero)"
                    value={initialDownpayment}
                    onChange={e => setInitialDownpayment(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 dark:text-white placeholder:text-slate-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black tracking-wider text-slate-450 dark:text-slate-500 block">Checking Cash/Bank Drawer</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsMainAccDropdownOpen(!isMainAccDropdownOpen)}
                      className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl flex items-center justify-between text-slate-700 dark:text-white cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none"
                    >
                      <span className="font-semibold text-left truncate pr-2">
                        {accounts.find(a => a.id === accountId)?.name || 'Select Account'}
                        {accountId && (
                          <span className="text-[10px] text-slate-400 font-mono ml-1.5">
                            ({formatPKR(accounts.find(a => a.id === accountId)?.balance || 0, currency)})
                          </span>
                        )}
                      </span>
                      <LucideIcon name="ChevronsUpDown" size={12} className="text-slate-400" />
                    </button>

                    {isMainAccDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsMainAccDropdownOpen(false)} />
                        <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl shadow-xl z-20 py-1 divide-y divide-slate-100 dark:divide-slate-850">
                          {accounts.map(acc => (
                            <button
                              key={acc.id}
                              type="button"
                              onClick={() => {
                                setAccountId(acc.id);
                                setIsMainAccDropdownOpen(false);
                              }}
                              className={`w-full px-3 py-1.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-950 flex items-center justify-between transition cursor-pointer ${
                                acc.id === accountId 
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold' 
                                  : 'text-slate-700 dark:text-white'
                              }`}
                            >
                              <span>{acc.name}</span>
                              <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">{formatPKR(acc.balance, currency)}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Adjust wallet checkbox container */}
              <label className="flex items-start gap-2.5 p-1 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={adjustWallet}
                  onChange={e => setAdjustWallet(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Sync with Wallet Cash balance</span>
                  <p className="text-[10.5px] text-slate-400 dark:text-slate-500 leading-tight mt-0.5">
                    Ensures advance downpayment portion is automatically reported in transaction ledger logs and immediately clears from/to the selected account drawer.
                  </p>
                </div>
              </label>

              {/* General Description Note */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black tracking-wider text-slate-450 dark:text-slate-500 block">General Deal Context / Description</label>
                <textarea
                  placeholder="Attach general context notes regarding deliverables, warranty periods, etc."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-white placeholder:text-slate-405"
                />
              </div>

              {/* Footer submitting operations button */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/10 cursor-pointer transition"
                >
                  Confirm Credit Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: LOG PARTIAL PAYMENT */}
      {payingRecord && (
        <div className="fixed inset-0 bg-slate-900/65 dark:bg-black/80 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden">
            
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">Log Credit Installment</h3>
              <p className="text-[10px] text-slate-450 mt-0.5">Recording repayment payment cleared with "{payingRecord.partyName}"</p>
            </div>

            <form onSubmit={handleSubmitPayment} className="p-5 sm:p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black tracking-wider text-slate-450 dark:text-slate-50 block">Payment Clearing Amount ({currency})</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-white"
                />
                <p className="text-[10.5px] text-slate-400">
                  Total pending outstanding dues: <span className="font-bold">{formatPKR(Math.max(0, payingRecord.amount - payingRecord.repaidAmount), currency)}</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black tracking-wider text-slate-455 dark:text-slate-50 block">Date Cleared</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={e => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-800 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black tracking-wider text-slate-455 dark:text-slate-55 block">Account Wallet Used</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsPaymentAccDropdownOpen(!isPaymentAccDropdownOpen)}
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between text-slate-800 dark:text-white cursor-pointer hover:border-slate-350 dark:hover:border-slate-750 focus:outline-none"
                    >
                      <span className="font-semibold text-left truncate pr-2">
                        {accounts.find(a => a.id === paymentAccountId)?.name || 'Select Account'}
                        {paymentAccountId && (
                          <span className="text-[9px] text-slate-400 font-mono ml-1">
                            ({formatPKR(accounts.find(a => a.id === paymentAccountId)?.balance || 0, currency)})
                          </span>
                        )}
                      </span>
                      <LucideIcon name="ChevronsUpDown" size={12} className="text-slate-400" />
                    </button>

                    {isPaymentAccDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsPaymentAccDropdownOpen(false)} />
                        <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl shadow-xl z-20 py-1 divide-y divide-slate-100 dark:divide-slate-850">
                          {accounts.map(acc => (
                            <button
                              key={acc.id}
                              type="button"
                              onClick={() => {
                                setPaymentAccountId(acc.id);
                                setIsPaymentAccDropdownOpen(false);
                              }}
                              className={`w-full px-3 py-1.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-950 flex items-center justify-between transition cursor-pointer ${
                                acc.id === paymentAccountId 
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold' 
                                  : 'text-slate-700 dark:text-white'
                              }`}
                            >
                              <span>{acc.name}</span>
                              <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">{formatPKR(acc.balance, currency)}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black tracking-wider text-slate-450 dark:text-slate-50 block">Installment Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Cleared 2nd installment via Easypaisa transit"
                  value={paymentNotes}
                  onChange={e => setPaymentNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none text-slate-800 dark:text-white"
                />
              </div>

              {/* Adjust wallet check inside partial payment */}
              <label className="flex items-start gap-2.5 p-1 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={paymentAdjustWallet}
                  onChange={e => setPaymentAdjustWallet(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Sync with Wallet Balance</span>
                  <p className="text-[10px] text-slate-400 dark:text-slate-550 leading-tight mt-0.5">
                    Allows the transaction logs to automatically register of this installment receipt.
                  </p>
                </div>
              </label>

              <div className="pt-4 border-t border-slate-50 dark:border-slate-850 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setPayingRecord(null)}
                  className="px-4 py-2 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded-xl cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition"
                >
                  Log Installment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CONFIRM INSTANT FULL SETTLEMENT */}
      {settlingRecord && (
        <div className="fixed inset-0 bg-slate-900/65 dark:bg-black/80 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-5 sm:p-6 space-y-4">
            
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">Instant Credit Settlement</h3>
              <p className="text-xs text-slate-450 mt-1">
                You are about to record the full final settlement of <span className="font-bold text-slate-800 dark:text-white">
                  {formatPKR(Math.max(0, settlingRecord.amount - settlingRecord.repaidAmount), currency)}
                </span> for the trade deal file of "{settlingRecord.partyName}".
              </p>
            </div>

            <div className="space-y-3.5 bg-slate-50/50 dark:bg-slate-950 p-4 border border-slate-100 dark:border-slate-850 rounded-2xl">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black tracking-wider text-slate-450 dark:text-slate-50 block">Select Settlement Source</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsSettleAccDropdownOpen(!isSettleAccDropdownOpen)}
                    className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between text-slate-800 dark:text-white cursor-pointer hover:border-slate-350 dark:hover:border-slate-750 focus:outline-none"
                  >
                    <span className="font-semibold text-left truncate pr-2">
                      {accounts.find(a => a.id === settleAccountId)?.name || 'Select Account'}
                      {settleAccountId && (
                        <span className="text-[9px] text-slate-400 font-mono ml-1">
                          ({formatPKR(accounts.find(a => a.id === settleAccountId)?.balance || 0, currency)})
                        </span>
                      )}
                    </span>
                    <LucideIcon name="ChevronsUpDown" size={12} className="text-slate-400" />
                  </button>

                  {isSettleAccDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsSettleAccDropdownOpen(false)} />
                      <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl shadow-xl z-20 py-1 divide-y divide-slate-100 dark:divide-slate-850">
                        {accounts.map(acc => (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() => {
                              setSettleAccountId(acc.id);
                              setIsSettleAccDropdownOpen(false);
                            }}
                            className={`w-full px-3 py-1.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-950 flex items-center justify-between transition cursor-pointer ${
                              acc.id === settleAccountId 
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold' 
                                : 'text-slate-700 dark:text-white'
                            }`}
                          >
                            <span>{acc.name}</span>
                            <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">{formatPKR(acc.balance, currency)}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <label className="flex items-start gap-2.5 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={settleAdjustWallet}
                  onChange={e => setSettleAdjustWallet(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Sync with Wallet Cash balance</span>
                  <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                    Automatically credits or debits the cash/digital drawer accordingly in the main ledger statement journal.
                  </p>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setSettlingRecord(null)}
                className="px-4 py-2 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl cursor-pointer"
              >
                Go Back
              </button>
              <button
                onClick={handleSubmitSettle}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition"
              >
                Complete Settlement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: DELETE CONFIRMATION FILE */}
      {recordToDelete && (
        <div className="fixed inset-0 bg-slate-900/65 dark:bg-black/80 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-5 sm:p-6 space-y-4">
            
            <div>
              <h3 className="text-base sm:text-lg font-black text-rose-500">Deport Credit File?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you absolutely sure you want to delete the complete Credit Deal history with <span className="font-bold text-slate-800 dark:text-white">"{recordToDelete.partyName}"</span>? This will permanently wipe all invoice items and installment log timelines associated with this file.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setRecordToDelete(null)}
                className="px-4 py-2 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl cursor-pointer"
              >
                No, Keep Card
              </button>
              <button
                onClick={() => handleDeleteRecord(recordToDelete.id)}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition"
              >
                Delete File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: EDIT CREDIT RECORD */}
      {editingRecord && (
        <div className="fixed inset-0 bg-slate-900/65 dark:bg-black/80 flex items-center justify-center p-4 z-50 animate-fadeIn overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl p-5 sm:p-6 my-8 space-y-5 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] uppercase font-black text-amber-500 tracking-wider">Adjustment Ledger</span>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Edit Credit {editingRecord.type === 'sale' ? 'Sale (Receivable)' : 'Purchase (Payable)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="p-1 px-2.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white transition rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSaveEditRecord} className="space-y-4">
              {/* Bilateral Party Name, Phone & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black tracking-wider text-slate-450 dark:text-slate-500 block">
                    {editingRecord.type === 'sale' ? 'Buyer Name' : 'Seller Name'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={editingRecord.type === 'sale' ? 'e.g. Ali Ahmed' : 'e.g. Sufyan Yarn Store'}
                    value={editPartyName}
                    onChange={e => setEditPartyName(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-white placeholder:text-slate-400/70"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black tracking-wider text-slate-450 dark:text-slate-500 block">
                    {editingRecord.type === 'sale' ? 'Buyer Phone Number' : 'Seller Phone Number'}
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 03001234567 (optional)"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-white placeholder:text-slate-400/70"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black tracking-wider text-slate-450 dark:text-slate-500 block">
                    {editingRecord.type === 'sale' ? "Buyer's City" : "Seller's City"} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Lahore, Faisalabad"
                    value={editCity}
                    onChange={e => setEditCity(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-555 text-slate-800 dark:text-white placeholder:text-slate-400/70"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black tracking-wider text-slate-450 dark:text-slate-500 block">Checking Cash/Bank Drawer</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsEditAccDropdownOpen(!isEditAccDropdownOpen)}
                      className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between text-slate-800 dark:text-white cursor-pointer hover:border-slate-350 dark:hover:border-slate-755 focus:outline-none"
                    >
                      <span className="font-semibold text-left truncate pr-2">
                        {accounts.find(a => a.id === editAccountId)?.name || 'Select Account'}
                        {editAccountId && (
                          <span className="text-[9px] text-slate-400 font-mono ml-1">
                            ({formatPKR(accounts.find(a => a.id === editAccountId)?.balance || 0, currency)})
                          </span>
                        )}
                      </span>
                      <LucideIcon name="ChevronsUpDown" size={12} className="text-slate-400" />
                    </button>

                    {isEditAccDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsEditAccDropdownOpen(false)} />
                        <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl shadow-xl z-20 py-1 divide-y divide-slate-100 dark:divide-slate-850">
                          {accounts.map(acc => (
                            <button
                              key={acc.id}
                              type="button"
                              onClick={() => {
                                setEditAccountId(acc.id);
                                setIsEditAccDropdownOpen(false);
                              }}
                              className={`w-full px-3 py-1.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-950 flex items-center justify-between transition cursor-pointer ${
                                acc.id === editAccountId 
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold' 
                                  : 'text-slate-700 dark:text-white'
                              }`}
                            >
                              <span>{acc.name}</span>
                              <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">{formatPKR(acc.balance, currency)}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Created & Due Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black tracking-wider text-slate-450 dark:text-slate-505 block">Invoice Event Date</label>
                  <input
                    type="date"
                    required
                    value={editDateCreated}
                    onChange={e => setEditDateCreated(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black tracking-wider text-slate-450 dark:text-slate-505 block">Bilateral Grace Due Date</label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={e => setEditDueDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Dynamic Sub-items list detail mapping */}
              <div className="border border-slate-100 dark:border-slate-800 p-4 rounded-2xl bg-slate-50/10 dark:bg-slate-950/10 space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span className="text-[10px] uppercase font-black tracking-wider text-slate-500 block">Itemized Merchandise Lines</span>
                  <button
                    type="button"
                    onClick={handleAddEditItemLine}
                    className="p-1 px-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 transition text-emerald-500 text-[10px] font-black rounded-md flex items-center gap-1 cursor-pointer"
                  >
                    <LucideIcon name="Plus" size={10} /> Add Line Item
                  </button>
                </div>

                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                  {editItemsList.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 border-b sm:border-none pb-3.5 sm:pb-0 border-slate-100 dark:border-slate-800">
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          required
                          placeholder="Items / Description description"
                          value={item.name}
                          onChange={e => handleUpdateEditItemField(idx, 'name', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-white"
                        />
                      </div>

                      <div className="w-16">
                        <input
                          type="number"
                          required
                          min="1"
                          placeholder="Qty"
                          value={item.quantity || ''}
                          onChange={e => handleUpdateEditItemField(idx, 'quantity', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 font-mono text-center text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none text-slate-800 dark:text-white"
                        />
                      </div>

                      <div className="w-24">
                        <input
                          type="number"
                          required
                          min="0"
                          placeholder="Unit PKR"
                          value={item.price || ''}
                          onChange={e => handleUpdateEditItemField(idx, 'price', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1.5 font-mono text-right text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none text-slate-800 dark:text-white"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveEditItemLine(idx)}
                        disabled={editItemsList.length <= 1}
                        className="p-1.5 text-slate-400 hover:text-rose-500 disabled:opacity-30 rounded-lg cursor-pointer transition shrink-0"
                      >
                        <LucideIcon name="Trash2" size={13} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="pt-2 text-right text-xs font-black text-slate-800 dark:text-white flex justify-between">
                  <span>Grand Total Cumulative Sum:</span>
                  <span className="font-mono text-emerald-500 dark:text-emerald-400 text-sm">
                    {formatPKR(calculatedEditInvoiceTotal, currency)}
                  </span>
                </div>
              </div>

              {/* General Description Note */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-black tracking-wider text-slate-450 dark:text-slate-500 block">General Deal Context / Description</label>
                <textarea
                  placeholder="Attach general context notes regarding deliverables, warranty periods, etc."
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-white placeholder:text-slate-405"
                />
              </div>

              {/* Footer submitting operations button */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl cursor-pointer"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl shadow-md cursor-pointer transition flex items-center gap-1"
                >
                  <LucideIcon name="Check" size={13} /> Apply Adjustments
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
