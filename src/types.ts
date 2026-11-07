/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AccountType = 'cash' | 'digital';
export type CategoryType = 'income' | 'expense';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  icon?: string;
  isCustom?: boolean;
}

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  icon: string; // Lucide icon name
  isCustom?: boolean;
}

export interface Transaction {
  id: string;
  amount: number;
  type: CategoryType;
  accountId: string;
  categoryId: string;
  date: string; // YYYY-MM-DD
  description: string;
  receiptImage?: string; // base64 string
  tags?: string[];
  transferId?: string; // Links transaction to transfer (e.g. transfer fees)
}

export interface Transfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string; // YYYY-MM-DD
  description?: string;
  fee?: number; // Optional transaction fee or shopkeeper charges
  feeAccountId?: string; // Account from which fees were paid
}

export interface Budget {
  id: string;
  categoryId: string;
  monthlyLimit: number;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  dateCreated: string;
}

export interface CreditRecordItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface CreditPayment {
  id: string;
  amount: number;
  date: string; // YYYY-MM-DD
  accountId: string; // wallet/account adjusted
  notes?: string;
}

export interface CreditRecord {
  id: string;
  type: 'sale' | 'purchase'; // sale = credit sale (receivable), purchase = credit purchase (payable)
  partyName: string; // Buyer or Seller name
  city: string; // Custom city name/location
  phone?: string; // Optional phone number for buyer or seller
  amount: number; // total amount of sale/purchase
  repaidAmount: number; // current cleared amount
  dateCreated: string; // YYYY-MM-DD
  dueDate?: string; // Optional due date YYYY-MM-DD
  description?: string;
  status: 'pending' | 'partial' | 'paid';
  items?: CreditRecordItem[]; // invoice items
  payments?: CreditPayment[]; // individual payments towards credit record
  accountId?: string; // Optional linked account where payments are filed
}

export interface DebtPayment {
  id: string;
  amount: number;
  date: string; // YYYY-MM-DD
  accountId: string; // wallet/account adjusted
  notes?: string;
}

export interface DebtEntry {
  id: string;
  type: 'gave' | 'taken'; // 'gave' = loan given (receivable), 'taken' = loan taken (payable)
  personName: string;
  amount: number;
  repaidAmount: number;
  accountId: string; // original account linked to this debt
  dueDate?: string; // Optional due date YYYY-MM-DD
  dateCreated: string; // YYYY-MM-DD
  description?: string;
  status: 'active' | 'settled';
  payments: DebtPayment[];
}

export interface Activity {
  id: string;
  description: string;
  timestamp: string;
  stateSnapshot: AppState;
}

export interface AppState {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  transfers: Transfer[];
  budgets: Budget[];
  goals: Goal[];
  debts?: DebtEntry[];
  creditRecords?: CreditRecord[];
  currency: string;
  theme: 'light' | 'dark';
  colorTheme?: string; // App primary accent color brand
  userName?: string;
  userAvatar?: string;
  userAge?: string;
  userProfession?: string;
  hasOnboarded?: boolean;
  hasWiped?: boolean;
}

declare global {
  interface Window {
    showConfirm?: (message: string, onConfirm: () => void, title?: string) => void;
    showAlert?: (message: string, title?: string) => void;
  }
}

