/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Account, Transfer } from '../types';
import { formatPKR, formatDate } from '../utils/financeHelpers';
import LucideIcon from './LucideIcon';
import CustomSelect from './CustomSelect';

interface TransferModuleProps {
  accounts: Account[];
  transfers: Transfer[];
  onAddTransfer: (fromAccountId: string, toAccountId: string, amount: number, date: string, description: string, fee: number, feeAccountId: string) => void;
  onDeleteTransfer: (transferId: string) => void;
  currency: string;
}

export default function TransferModule({
  accounts,
  transfers,
  onAddTransfer,
  onDeleteTransfer,
  currency
}: TransferModuleProps) {
  const [fromAccId, setFromAccId] = useState('');
  const [toAccId, setToAccId] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [feeStr, setFeeStr] = useState(''); // Tracking shopkeeper / bank transaction fee
  const [feeAccId, setFeeAccId] = useState(''); // Tracking which account fee is paid from
  const [dateStr, setDateStr] = useState(new Date().toISOString().substring(0, 10));
  const [desc, setDesc] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const parsedFee = parseFloat(feeStr) || 0;
  const isFeeDisabled = !feeStr || isNaN(parsedFee) || parsedFee <= 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fromAccId) {
      setErrorMsg('Please choose the source account');
      return;
    }
    if (!toAccId) {
      setErrorMsg('Please choose the destination account');
      return;
    }
    if (fromAccId === toAccId) {
      setErrorMsg('Source and Destination accounts cannot be the same');
      return;
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      setErrorMsg('Please enter a valid amount greater than 0');
      return;
    }

    const fee = parseFloat(feeStr) || 0;
    if (isNaN(fee) || fee < 0) {
      setErrorMsg('Transaction fee must be 0 or greater');
      return;
    }

    if (!dateStr) {
      setErrorMsg('Please select a transfer date');
      return;
    }

    // Verify origin account balance
    const sourceAcc = accounts.find(a => a.id === fromAccId);
    if (!sourceAcc) {
      setErrorMsg('Source account not found');
      return;
    }

    // Select the fee paying account: defaults to fromAccId if not custom selected or empty
    const selectedFeeAccId = fee > 0 ? (feeAccId || fromAccId) : '';

    if (fee > 0) {
      if (selectedFeeAccId === fromAccId) {
        const totalRequired = amount + fee;
        if (sourceAcc.balance < totalRequired) {
          setErrorMsg(`Insufficient balance in ${sourceAcc.name}. Transfer requires ${formatPKR(amount, currency)} + fee of ${formatPKR(fee, currency)} (Total: ${formatPKR(totalRequired, currency)}). Available: ${formatPKR(sourceAcc.balance, currency)}`);
          return;
        }
      } else {
        // Different accounts for transfer amount and charges
        if (sourceAcc.balance < amount) {
          setErrorMsg(`Insufficient balance in ${sourceAcc.name} for transfer amount of ${formatPKR(amount, currency)}. Available: ${formatPKR(sourceAcc.balance, currency)}`);
          return;
        }
        const feeAcc = accounts.find(a => a.id === selectedFeeAccId);
        if (!feeAcc) {
          setErrorMsg('Charges paid-from account not found');
          return;
        }
        if (feeAcc.balance < fee) {
          setErrorMsg(`Insufficient balance in ${feeAcc.name} for transfer charges of ${formatPKR(fee, currency)}. Available: ${formatPKR(feeAcc.balance, currency)}`);
          return;
        }
      }
    } else {
      if (sourceAcc.balance < amount) {
        setErrorMsg(`Insufficient balance in ${sourceAcc.name} for transfer amount of ${formatPKR(amount, currency)}. Available: ${formatPKR(sourceAcc.balance, currency)}`);
        return;
      }
    }

    onAddTransfer(fromAccId, toAccId, amount, dateStr, desc, fee, selectedFeeAccId);

    // Reset Form
    setFromAccId('');
    setToAccId('');
    setAmountStr('');
    setFeeStr('');
    setFeeAccId('');
    setDesc('');
    window.showAlert?.('Balance transferred successfully!');
  };

  const getAccountName = (id: string) => {
    return accounts.find(a => a.id === id)?.name || 'Unknown Account';
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Create Transfer Form */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm self-start">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-xl text-emerald-500">
              <LucideIcon name="ArrowLeftRight" size={24} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Account Transfer</h2>
              <p className="text-xs text-slate-500">Move balances without counting as Income or Expense.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30 text-rose-600 dark:text-rose-450 p-2.5 rounded-lg text-xs flex items-center gap-1.5">
                <LucideIcon name="AlertCircle" size={14} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* From Account / Origin */}
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                From (Source Account)
              </label>
              <CustomSelect
                options={accounts.map(acc => ({
                  value: acc.id,
                  label: `${acc.name} (${formatPKR(acc.balance, currency)})`,
                  icon: acc.icon || (acc.type === 'cash' ? 'Wallet' : 'CreditCard')
                }))}
                value={fromAccId}
                onChange={(val) => setFromAccId(val)}
                placeholder="-- Select Source Account --"
              />
            </div>

            {/* Down arrow marker */}
            <div className="flex justify-center -my-2">
              <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-750 flex items-center justify-center text-slate-400">
                <LucideIcon name="ArrowDown" size={16} />
              </div>
            </div>

            {/* To Account / Destination */}
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                To (Destination Account)
              </label>
              <CustomSelect
                options={accounts.map(acc => ({
                  value: acc.id,
                  label: `${acc.name} (${formatPKR(acc.balance, currency)})`,
                  icon: acc.icon || (acc.type === 'cash' ? 'Wallet' : 'CreditCard')
                }))}
                value={toAccId}
                onChange={(val) => setToAccId(val)}
                placeholder="-- Select Destination Account --"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Amount ({currency})
              </label>
              <input
                type="number"
                className="w-full bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white text-sm border-0 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-emerald-500"
                placeholder="0.00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
              />
            </div>

            {/* Transaction Fee / Shopkeeper Charges */}
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 flex justify-between items-center">
                <span>Shopkeeper / Transfer Charges (Optional)</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-505">Deducted as real expense</span>
              </label>
              <input
                type="number"
                className="w-full bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white text-sm border-0 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-emerald-500"
                placeholder="0.00 (e.g. 50 PKR shopkeeper/bank fee)"
                value={feeStr}
                onChange={(e) => setFeeStr(e.target.value)}
              />
            </div>

            {/* Custom charges paid from selection */}
            <div>
              <label className={`block text-xs font-medium mb-1 flex justify-between items-center transition-colors ${
                isFeeDisabled ? 'text-slate-400 dark:text-slate-600' : 'text-slate-500 dark:text-slate-400'
              }`}>
                <span>Transaction charges paid from?</span>
                {isFeeDisabled && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">Enter charges above to change</span>
                )}
              </label>
              <CustomSelect
                options={accounts.map(acc => ({
                  value: acc.id,
                  label: `${acc.name} (${formatPKR(acc.balance, currency)})`,
                  icon: acc.icon || (acc.type === 'cash' ? 'Wallet' : 'CreditCard')
                }))}
                value={feeAccId || fromAccId}
                onChange={(val) => setFeeAccId(val)}
                placeholder="-- Select Charges Account --"
                disabled={isFeeDisabled}
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Transfer Date
              </label>
              <input
                type="date"
                className="w-full bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white text-sm border-0 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-emerald-500"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Memo / Description (Optional)
              </label>
              <textarea
                rows={2}
                className="w-full bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white text-sm border-0 rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-emerald-500"
                placeholder="e.g. Moved cash to digital wallet for shopping"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-sm rounded-xl hover:shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LucideIcon name="RefreshCw" size={16} />
              Authorize Balance Transfer
            </button>
          </form>
        </div>

        {/* Right Side: Transfer Records Ledger */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
            <h3 className="text-base font-semibold text-slate-950 dark:text-white mb-4">Transfer Records History</h3>
            
            {transfers.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                  <LucideIcon name="History" size={24} />
                </div>
                <h4 className="text-slate-900 dark:text-white font-medium text-sm">No Transfer History</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto mt-0.5">Authorizations of balance transfers will render in sequence here for auditing.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[500px] overflow-y-auto pr-2">
                {[...transfers].sort((a,b) => b.date.localeCompare(a.date)).map((tr) => (
                  <div key={tr.id} className="py-3.5 flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 group-hover:text-emerald-500 group-hover:bg-emerald-50 dark:group-hover:bg-slate-850 transition-colors">
                        <LucideIcon name="ArrowLeftRight" size={16} />
                      </div>
                      <div>
                        {/* Transfer route */}
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                          <span>{getAccountName(tr.fromAccountId)}</span>
                          <LucideIcon name="ChevronRight" size={12} className="text-slate-400" />
                          <span className="text-emerald-600 dark:text-emerald-400">{getAccountName(tr.toAccountId)}</span>
                        </div>
                        {/* Date and Description */}
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                          <span>{formatDate(tr.date)}</span>
                          {tr.description && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                              <span className="truncate max-w-[150px] italic">"{tr.description}"</span>
                            </>
                          )}
                          {tr.fee !== undefined && tr.fee > 0 && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 dark:bg-rose-950/20 text-[10px] font-bold text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30 rounded-full flex-wrap">
                                <LucideIcon name="Percent" size={10} className="inline mr-0.5" />
                                <span>Charges: {formatPKR(tr.fee, currency)}</span>
                                {tr.feeAccountId && tr.feeAccountId !== tr.fromAccountId && (
                                  <span className="text-slate-500 dark:text-slate-400 font-medium italic sm:ml-1 text-[10px]">
                                    (Paid from: {getAccountName(tr.feeAccountId)})
                                  </span>
                                )}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200">
                        {formatPKR(tr.amount, currency)}
                      </span>
                      <button
                        onClick={() => {
                          window.showConfirm?.(
                            'Reverse and delete this transfer record? Balance adjustments will roll back.',
                            () => {
                              onDeleteTransfer(tr.id);
                            }
                          );
                        }}
                        className="p-1 cursor-pointer text-slate-400 hover:text-rose-500 dark:text-slate-650 hover:dark:text-rose-455 rounded opacity-65 sm:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
                        title="Delete transfer record"
                      >
                        <LucideIcon name="Trash2" size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
