/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { AppState } from '../types';
import { exportToCSV, exportTransfersToCSV } from '../utils/financeHelpers';
import LucideIcon from './LucideIcon';
import CustomSelect from './CustomSelect';
import { THEME_PRESETS } from '../utils/themeHelper';

interface SettingsProps {
  appState: AppState;
  onImportBackup: (imported: AppState) => void;
  onResetData: () => void;
  onUpdateStateValue: <T extends keyof AppState>(key: T, value: AppState[T]) => void;
  onAbsoluteZeroReset: () => void;
  currentUser: any;
  onDeleteAccount: () => Promise<void>;
}

export default function Settings({
  appState,
  onImportBackup,
  onResetData,
  onUpdateStateValue,
  onAbsoluteZeroReset,
  currentUser,
  onDeleteAccount
}: SettingsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);

  // Fallback Export Modal States for Mobile
  const [exportModal, setExportModal] = useState<{
    isOpen: boolean;
    title: string;
    filename: string;
    content: string;
    type: 'json' | 'csv';
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Trigger JSON file export
  const handleExportJSON = () => {
    try {
      const jsonString = JSON.stringify(appState, null, 2);
      
      // Modern standards-compliant Blob URL download
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const filename = `taskflow-finance-backup-${new Date().toISOString().substring(0, 10)}.json`;
      
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", url);
      downloadAnchor.setAttribute("download", filename);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);
      URL.revokeObjectURL(url);

      // Trigger user-friendly fallback copy modal automatically to assist mobile/app-view users
      setExportModal({
        isOpen: true,
        title: "Database Backup Exported",
        filename,
        content: jsonString,
        type: 'json'
      });
    } catch (e) {
      window.showAlert?.('Error creating backup: ' + e);
    }
  };

  // Trigger CSV/Excel spreadsheet download
  const handleExportExcel = () => {
    try {
      const csvData = exportToCSV(appState.transactions, appState.accounts, appState.categories);
      
      // Modern standards-compliant Blob URL download
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const filename = `taskflow-finance-ledger-${new Date().toISOString().substring(0, 10)}.csv`;

      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", url);
      downloadAnchor.setAttribute("download", filename);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);
      URL.revokeObjectURL(url);

      // Trigger user-friendly fallback copy modal automatically to assist mobile/app-view users
      setExportModal({
        isOpen: true,
        title: "Excel (CSV) Spreadsheet Exported",
        filename,
        content: csvData,
        type: 'csv'
      });
    } catch (e) {
      window.showAlert?.('Error exporting Excel sheet: ' + e);
    }
  };

  // Clipboard copies for mobile app backups
  const handleCopyBackup = async (text: string) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      window.showAlert?.("Failed to copy automatically. Please select all the text inside the code block and copy manually.");
    }
  };

  // Import JSON backup
  const handleJSONFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError('');
    setImportSuccess(false);
    
    const file = e.target.files?.[0];
    if (!file) return;

    const fileReader = new FileReader();
    fileReader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text) as AppState;

        // Perform schema validations
        if (!parsed.accounts || !Array.isArray(parsed.accounts)) throw new Error("Missing 'accounts' catalog");
        if (!parsed.categories || !Array.isArray(parsed.categories)) throw new Error("Missing 'categories' catalog");
        if (!parsed.transactions || !Array.isArray(parsed.transactions)) throw new Error("Missing 'transactions' table");
        if (!parsed.transfers || !Array.isArray(parsed.transfers)) throw new Error("Missing 'transfers' table");

        onImportBackup(parsed);
        setImportSuccess(true);
        if (fileInputRef.current) fileInputRef.current.value = ''; // clear input
      } catch (err: any) {
        setImportError(`Failed to restore backup: ${err.message || 'Malformed file structure'}`);
      }
    };
    fileReader.readAsText(file);
  };

  const triggerReset = () => {
    window.showConfirm?.(
      "🚨 WARNING: Are you sure you want to reset all data?\n\nThis will permanently wipe custom categories, custom starting balances, transactions, transfers, budgets, goals, and receipt attachments. This action is irreversible!",
      () => {
        onResetData();
        // Give time for custom confirmation or show alert after resetting
        setTimeout(() => {
          window.showAlert?.("Application database has been successfully reset to factory defaults!");
        }, 100);
      }
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Header card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-950 dark:text-white flex items-center gap-2">
          <LucideIcon name="Settings" className="text-emerald-500" />
          Settings Panel
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Configure defaults, toggle visual modes, and securely download absolute local ledger backups inside your desktop folder.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Localization & Preferences Control */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-5">
          <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-850">
            <LucideIcon name="Sliders" className="text-slate-500" />
            General Preferences
          </h3>

          {/* Theme selection toggle */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-slate-850 dark:text-slate-205 block">Dark Interface Toggle</span>
              <span className="text-xs text-slate-450 block mt-0.5">Toggle eye-safe high-contrast dark palette.</span>
            </div>
            <button
              onClick={() => onUpdateStateValue('theme', appState.theme === 'light' ? 'dark' : 'light')}
              className={`w-12 h-6 rounded-full p-0.5 transition-colors duration-300 pointer-events-auto cursor-pointer flex ${
                appState.theme === 'dark' ? 'bg-emerald-500 justify-end' : 'bg-slate-200 justify-start'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white shadow-md block" />
            </button>
          </div>

          {/* Color Theme Selector */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-850">
            <label className="block text-sm font-semibold text-slate-850 dark:text-slate-205 mb-1 text-slate-900 dark:text-white">
              App Theme Style (Color Accent)
            </label>
            <span className="text-xs text-slate-450 block mb-3 leading-relaxed">
              Choose your favorite brand theme. Real-time updates apply across navigation hubs, statement records, and charts instantly.
            </span>
            
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(THEME_PRESETS).map(([key, value]) => {
                const isActive = (appState.colorTheme || 'purple') === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onUpdateStateValue('colorTheme', key)}
                    className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold border text-left cursor-pointer transition-all duration-200 select-none ${
                      isActive 
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                        : 'border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-605 dark:text-slate-400'
                    }`}
                  >
                    {/* Circle preview of the color */}
                    <span 
                      className="w-4 h-4 rounded-full shrink-0 border border-black/10" 
                      style={{ backgroundColor: value.colors[500] }} 
                    />
                    <span className="truncate">{value.name.split(' ')[0]} Theme</span>
                    {isActive && (
                      <span className="ml-auto text-emerald-550 font-bold">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

            {/* Currency selection default */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-850">
            <label className="block text-sm font-semibold text-slate-850 dark:text-slate-205 mb-1">
              Primary Currency Identifier
            </label>
            <span className="text-xs text-slate-450 block mb-2 leading-relaxed">
              Define the default currency label displayed around balance sheets. Standard default is Pakistani Rupees (PKR).
            </span>
            <CustomSelect
              options={[
                { value: 'PKR', label: 'PKR (₨ - Pakistani Rupee)', icon: 'Banknote' },
                { value: 'USD', label: 'USD ($ - US Dollar)', icon: 'DollarSign' },
                { value: 'EUR', label: 'EUR (€ - Euro)', icon: 'Euro' },
                { value: 'GBP', label: 'GBP (£ - British Pound)', icon: 'Coins' },
                { value: 'AED', label: 'AED (د.إ - UAE Dirham)', icon: 'Coins' },
                { value: 'INR', label: 'INR (₹ - Indian Rupee)', icon: 'Coins' },
                { value: 'SAR', label: 'SAR (ر.س - Saudi Riyal)', icon: 'Coins' },
              ]}
              value={appState.currency}
              onChange={(val) => onUpdateStateValue('currency', val)}
            />
          </div>
        </div>

        {/* Database Backup & Import Control */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm space-y-5">
          <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-850">
            <LucideIcon name="Database" className="text-slate-500" />
            Data Backup & Restore
          </h3>

          <div className="space-y-3">
            {/* Download JSON backup */}
            <button
              onClick={handleExportJSON}
              className="w-full text-left p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-lg text-emerald-500">
                  <LucideIcon name="Download" size={18} />
                </div>
                <div>
                  <span className="text-xs sm:text-sm font-semibold text-slate-850 dark:text-slate-205 block">Export JSON Database</span>
                  <span className="text-[10px] text-slate-450 block">Complete raw schema and attachment ledger.</span>
                </div>
              </div>
              <LucideIcon name="ChevronRight" size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Export Spreadsheet format */}
            <button
              onClick={handleExportExcel}
              className="w-full text-left p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-lg text-indigo-500">
                  <LucideIcon name="Grid" size={18} />
                </div>
                <div>
                  <span className="text-xs sm:text-sm font-semibold text-slate-850 dark:text-slate-205 block">Export Excel (CSV)</span>
                  <span className="text-[10px] text-slate-450 block">Opens natively in Excel / Sheets for editing.</span>
                </div>
              </div>
              <LucideIcon name="ChevronRight" size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Restore/Import backup file input wrapper */}
            <div>
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleJSONFileSelect}
                className="hidden"
                id="restore-file-input"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full text-left p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 dark:bg-amber-500/5 rounded-lg text-amber-550">
                    <LucideIcon name="UploadCloud" size={18} />
                  </div>
                  <div>
                    <span className="text-xs sm:text-sm font-semibold text-slate-850 dark:text-slate-205 block">Import Backup File</span>
                    <span className="text-[10px] text-slate-450 block">Upload previous .json backup to override active records.</span>
                  </div>
                </div>
                <LucideIcon name="ChevronRight" size={16} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Feedback states */}
          {importSuccess && (
            <div className="bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-450 p-2.5 rounded-xl text-xs flex items-center gap-1.5 animate-bounce">
              <LucideIcon name="CheckCircle" size={16} />
              <span>Backup restored successfully! All dashboards updated.</span>
            </div>
          )}

          {importError && (
            <div className="bg-rose-50 border border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30 text-rose-600 p-2.5 rounded-xl text-xs flex items-center gap-1.5">
              <LucideIcon name="AlertTriangle" size={16} />
              <span>{importError}</span>
            </div>
          )}
        </div>

      </div>

      {/* Absolute Zero-Out Option Panel for True Day 1 Fresh Start */}
      <div className="bg-gradient-to-br from-emerald-500/10 to-blue-500/10 dark:from-emerald-950/20 dark:to-slate-900 rounded-2xl p-6 border border-emerald-500/20 dark:border-emerald-800/20 shadow-sm space-y-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-emerald-500 rounded-2xl text-white shadow-lg shadow-emerald-500/20 shrink-0">
            <LucideIcon name="Sparkles" size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              Absolute Zero-Out (Fresh Start - Day 1)
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Permanently wipe 100% of all registered transactions, transfers, custom savings targets, and active budgets. This will also reset the starting baseline balance of all wallets & cards to exactly <strong>0</strong>.
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium">
              ✓ Recommended if you want to start tracking your actual daily finances from a completely empty, clean day-1 slate.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-slate-200/50 dark:border-slate-800/50 pt-4 gap-4">
          <span className="text-[11px] text-slate-500">
            Wipes all transactions from local memory immediately.
          </span>
          <button
            onClick={() => {
              window.showConfirm?.(
                "🚨 Day 1 Slate Confirmation:\n\nAre you sure you want to completely WIPE all transactions, transfers, budgets, goals, and set all account balances to 0?\n\nThis will give you a 100% fresh, blank application with empty charts.",
                () => {
                  onAbsoluteZeroReset();
                }
              );
            }}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl cursor-pointer shadow-md hover:shadow-lg transition-all whitespace-nowrap active:scale-[0.98]"
          >
            Wipe All & Start Fresh (0)
          </button>
        </div>
      </div>

      {/* Load Sample Seed Data Controls */}
      <div className="bg-slate-100 dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <LucideIcon name="Info" className="text-slate-500" />
              Load Interactive Practice Seeds
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
              Restore pre-populated sample accounts (Savour dinner, Upwork freelancing, rent, clothing budgets) so you can interact with mock charts and features for practice. Done locally in browser storage.
            </p>
          </div>

          <button
            onClick={triggerReset}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 dark:bg-slate-805 dark:hover:bg-slate-700 text-white font-bold text-xs sm:text-sm rounded-xl cursor-pointer shadow-sm hover:shadow transition-all whitespace-nowrap"
          >
            Load Demo Seeds & Data
          </button>
        </div>
      </div>

      {/* Danger Zone - Account Deletion */}
      <div className="bg-red-500/[0.08] dark:bg-red-500/[0.05] rounded-2xl p-6 border border-red-500/20 dark:border-red-900/30 shadow-sm space-y-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-rose-600 rounded-2xl text-white shadow-lg shadow-rose-500/20 shrink-0">
            <LucideIcon name="AlertTriangle" size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
              Danger Zone (Account Deletion)
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              If you delete your registered cloud profile (<strong>@{currentUser?.username}</strong>), it will instantly purge all matching starting balances, categories, receipts and financial transitions from the live database. This operation is absolutely permanent.
            </p>
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-2 font-medium">
              ⚠ Warning: Once processed, you will be automatically logged out and you will not be able to retrieve this information.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-slate-200/50 dark:border-slate-800/50 pt-4 gap-4">
          <span className="text-[11px] text-slate-500">
            Removes database documents and local security tokens.
          </span>
          <button
            onClick={() => {
              window.showConfirm?.(
                `🚨 PERMANENT ACCOUNT DELETION:\n\nAre you sure you want to permanently delete user account @${currentUser?.username} and all saved records?\n\nThis cannot be custom undone.`,
                async () => {
                  try {
                    await onDeleteAccount();
                  } catch (e) {
                    window.showAlert?.("Deletion Error: " + e);
                  }
                }
              );
            }}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm rounded-xl cursor-pointer shadow-md hover:shadow-lg transition-all whitespace-nowrap active:scale-[0.98]"
          >
            Delete My Account & Data
          </button>
        </div>
      </div>

      {/* Modern Fail-Safe Export Modal for Mobile Devices */}
      {exportModal?.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
            onClick={() => setExportModal(null)}
          />
          
          {/* Main Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative z-10 transform scale-100 space-y-4 animate-scaleIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-150 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0 select-none">
                  <LucideIcon name={exportModal.type === 'json' ? 'Download' : 'Grid'} size={18} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base tracking-tight leading-none">
                    {exportModal.title}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-mono tracking-wider mt-0.5 block">
                    {exportModal.filename}
                  </span>
                </div>
              </div>
              
              <button
                onClick={() => setExportModal(null)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-650 transition cursor-pointer"
              >
                <LucideIcon name="X" size={20} />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-950/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80">
              🚨 <strong>Mobile Helper:</strong> If the file did not download automatically onto your phone or device, click <strong>Copy Data</strong> below. You can paste the code directly into notes, WhatsApp, email, or a file editor to securely archive it!
            </p>

            <div className="relative">
              <textarea
                readOnly
                value={exportModal.content}
                className="w-full h-44 p-3 bg-slate-950 text-emerald-400 dark:text-emerald-300 rounded-xl font-mono text-[10px] leading-relaxed border border-slate-800 focus:outline-none resize-none select-all"
              />
              <div className="absolute bottom-3 right-3 bg-slate-950/80 backdrop-blur-xs px-2 py-1 rounded text-[8px] font-mono text-slate-500 uppercase tracking-widest select-none">
                Scroll to view ({exportModal.type.toUpperCase()})
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setExportModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer"
              >
                Done
              </button>
              <button
                onClick={() => handleCopyBackup(exportModal.content)}
                className={`px-5 py-2 ${copied ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-violet-600 hover:bg-violet-700'} text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-1`}
              >
                <LucideIcon name={copied ? "Check" : "Copy"} size={14} />
                {copied ? "Copied!" : "Copy Data"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
