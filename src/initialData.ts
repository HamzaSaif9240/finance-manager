/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Account, Category, Transaction, Transfer, Budget, Goal, CreditRecord } from './types';

export const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'acc_pocket_cash', name: 'Pocket Money Cash', type: 'cash', balance: 5000 },
  { id: 'acc_home_cash', name: 'Home Cash', type: 'cash', balance: 2000 },
  { id: 'acc_business_cash', name: 'Business Cash', type: 'cash', balance: 15000 },
  { id: 'acc_easypaisa', name: 'Easypaisa', type: 'digital', balance: 10000 },
  { id: 'acc_jazzcash', name: 'JazzCash', type: 'digital', balance: 3500 },
  { id: 'acc_nayapay', name: 'Nayapay', type: 'digital', balance: 2500 },
  { id: 'acc_meezan', name: 'Meezan Bank', type: 'digital', balance: 1200 },
  { id: 'acc_bank', name: 'Bank Account', type: 'digital', balance: 45000 },
];

export const DEFAULT_CATEGORIES: Category[] = [
  // Income Categories
  { id: 'cat_salary', name: 'Salary', type: 'income', icon: 'Briefcase' },
  { id: 'cat_freelance', name: 'Freelancing', type: 'income', icon: 'Laptop' },
  { id: 'cat_business_inc', name: 'Business Income', type: 'income', icon: 'TrendingUp' },
  { id: 'cat_commission', name: 'Commission', type: 'income', icon: 'Percent' },
  { id: 'cat_pocket_inc', name: 'Pocket Money', type: 'income', icon: 'Coins' },
  { id: 'cat_gift', name: 'Gift', type: 'income', icon: 'Gift' },
  { id: 'cat_scholarship', name: 'Scholarship', type: 'income', icon: 'GraduationCap' },
  { id: 'cat_prize', name: 'Prize Money', type: 'income', icon: 'Award' },
  { id: 'cat_investment', name: 'Investment Return', type: 'income', icon: 'LineChart' },
  { id: 'cat_profit', name: 'Profit', type: 'income', icon: 'DollarSign' },
  { id: 'cat_refund', name: 'Refund', type: 'income', icon: 'Undo' },
  { id: 'cat_other_inc', name: 'Other Income', type: 'income', icon: 'PlusCircle' },

  // Expense Categories
  { id: 'cat_food', name: 'Food', type: 'expense', icon: 'Coffee' },
  { id: 'cat_transport', name: 'Transport', type: 'expense', icon: 'Car' },
  { id: 'cat_education', name: 'Education', type: 'expense', icon: 'BookOpen' },
  { id: 'cat_shopping', name: 'Shopping', type: 'expense', icon: 'ShoppingBag' },
  { id: 'cat_bills', name: 'Bills', type: 'expense', icon: 'FileText' },
  { id: 'cat_health', name: 'Health', type: 'expense', icon: 'HeartPulse' },
  { id: 'cat_entertainment', name: 'Entertainment', type: 'expense', icon: 'Gamepad2' },
  { id: 'cat_transfer_fee', name: 'Transaction Charges', type: 'expense', icon: 'Percent' },
  { id: 'cat_other_exp', name: 'Other', type: 'expense', icon: 'Grid' },
];

// Preset subcategories/suggestions to load in Forms dynamically
export const CATEGORY_TAG_SUGGESTIONS: Record<string, string[]> = {
  // Expense
  'cat_food': ['Lunch', 'Dinner', 'Snacks', 'Tea'],
  'cat_transport': ['Fuel', 'Uber', 'Bus', 'Rickshaw'],
  'cat_education': ['Books', 'Fees', 'Notes', 'Courses'],
  'cat_shopping': ['Clothes', 'Electronics', 'Personal Items'],
  'cat_bills': ['Internet', 'Electricity', 'Mobile Load'],
  'cat_health': ['Medicine', 'Doctor'],
  'cat_entertainment': ['Movies', 'Games', 'Subscriptions'],
  'cat_other_exp': ['Miscellaneous'],
  // Income
  'cat_pocket_inc': ['Pocket Money Cash', 'Easypaisa Send', 'Salary Advance'],
  'cat_freelance': ['Upwork', 'Fiverr', 'Direct Client'],
};

// Seed some data to make the experience ultra-premium and fully populated with real histories
export const SEED_TRANSACTIONS = (): Transaction[] => {
  const t: Transaction[] = [
    // May 2026
    {
      id: 'tx_seed_1',
      amount: 45000,
      type: 'income',
      accountId: 'acc_bank',
      categoryId: 'cat_salary',
      date: '2026-05-01',
      description: 'Monthly Salary received',
      tags: ['Salary']
    },
    {
      id: 'tx_seed_2',
      amount: 8000,
      type: 'income',
      accountId: 'acc_easypaisa',
      categoryId: 'cat_freelance',
      date: '2026-05-10',
      description: 'Upwork Web Design Logo project',
      tags: ['Upwork']
    },
    {
      id: 'tx_seed_3',
      amount: 5000,
      type: 'income',
      accountId: 'acc_pocket_cash',
      categoryId: 'cat_pocket_inc',
      date: '2026-05-12',
      description: 'Monthly Pocket Money Cash allowance',
      tags: ['Pocket Money Cash']
    },
    // Expenses May 2026
    {
      id: 'tx_seed_4',
      amount: 4500,
      type: 'expense',
      accountId: 'acc_pocket_cash',
      categoryId: 'cat_food',
      date: '2026-05-03',
      description: 'Dinner with friends at Savour',
      tags: ['Dinner']
    },
    {
      id: 'tx_seed_5',
      amount: 3200,
      type: 'expense',
      accountId: 'acc_easypaisa',
      categoryId: 'cat_bills',
      date: '2026-05-15',
      description: 'Nayatel Internet Monthly bill',
      tags: ['Internet']
    },
    {
      id: 'tx_seed_6',
      amount: 1500,
      type: 'expense',
      accountId: 'acc_meezan',
      categoryId: 'cat_entertainment',
      date: '2026-05-18',
      description: 'Netflix subscription share',
      tags: ['Subscriptions']
    },
    {
      id: 'tx_seed_7',
      amount: 5000,
      type: 'expense',
      accountId: 'acc_bank',
      categoryId: 'cat_shopping',
      date: '2026-05-20',
      description: 'Eid clothes collection',
      tags: ['Clothes']
    },
    {
      id: 'tx_seed_8',
      amount: 3000,
      type: 'expense',
      accountId: 'acc_bank',
      categoryId: 'cat_education',
      date: '2026-05-21',
      description: 'Bought React Native Udemy course',
      tags: ['Courses']
    },
    {
      id: 'tx_seed_9',
      amount: 1200,
      type: 'expense',
      accountId: 'acc_pocket_cash',
      categoryId: 'cat_transport',
      date: '2026-05-22',
      description: 'Uber Ride to office',
      tags: ['Uber']
    },
    {
      id: 'tx_seed_10',
      amount: 1800,
      type: 'expense',
      accountId: 'acc_pocket_cash',
      categoryId: 'cat_health',
      date: '2026-05-25',
      description: 'Weekly allergy medicines',
      tags: ['Medicine']
    },

    // June 2026 (Modern Date starts from metadata: June 1st)
    {
      id: 'tx_seed_11',
      amount: 50000,
      type: 'income',
      accountId: 'acc_bank',
      categoryId: 'cat_salary',
      date: '2026-06-01',
      description: 'June Base Salary credit',
      tags: ['Salary']
    },
    {
      id: 'tx_seed_12',
      amount: 1200,
      type: 'expense',
      accountId: 'acc_easypaisa',
      categoryId: 'cat_food',
      date: '2026-06-01',
      description: 'Office tea & evening snacks',
      tags: ['Tea', 'Snacks']
    }
  ];
  return t;
};

export const SEED_TRANSFERS = (): Transfer[] => [
  {
    id: 'tr_seed_1',
    fromAccountId: 'acc_pocket_cash',
    toAccountId: 'acc_easypaisa',
    amount: 3000,
    date: '2026-05-14',
    description: 'Deposited pocket money cash to Easypaisa Account'
  }
];

export const SEED_BUDGETS = (): Budget[] => [
  { id: 'bd_seed_1', categoryId: 'cat_food', monthlyLimit: 12000 },
  { id: 'bd_seed_2', categoryId: 'cat_bills', monthlyLimit: 15000 },
  { id: 'bd_seed_3', categoryId: 'cat_shopping', monthlyLimit: 10000 },
  { id: 'bd_seed_4', categoryId: 'cat_transport', monthlyLimit: 5000 },
];

export const SEED_GOALS = (): Goal[] => [
  { id: 'go_seed_1', name: 'New iPhone 15 Pro', targetAmount: 250000, savedAmount: 85000, dateCreated: '2026-04-10' },
  { id: 'go_seed_2', name: 'Laptop Upgrade Plan', targetAmount: 120000, savedAmount: 45000, dateCreated: '2026-05-01' },
];

export const SEED_CREDIT_RECORDS = (): CreditRecord[] => [
  {
    id: 'cr_seed_1',
    type: 'sale',
    partyName: 'Ali Ahmed',
    city: 'Lahore',
    amount: 15400,
    repaidAmount: 5000,
    dateCreated: '2026-05-10',
    dueDate: '2026-06-20',
    status: 'partial',
    description: 'Sold office electronic accessories to clean out excess store stocks.',
    items: [
      { id: 'it_1', name: 'HP Monitor 24"', quantity: 1, price: 12000 },
      { id: 'it_2', name: 'Wireless Keyboard & Mouse Combo', quantity: 1, price: 3400 }
    ],
    payments: [
      { id: 'cp_1', amount: 5000, date: '2026-05-10', accountId: 'acc_meezan', notes: 'Advance payment received on bank transfer' }
    ]
  },
  {
    id: 'cr_seed_2',
    type: 'purchase',
    partyName: 'Sufyan Traders',
    city: 'Faisalabad',
    amount: 35000,
    repaidAmount: 35000,
    dateCreated: '2026-05-15',
    dueDate: '2026-06-10',
    status: 'paid',
    description: 'Bulk yarn and cloth purchases for manufacturing resale.',
    items: [
      { id: 'it_3', name: 'Premium Cotton Rolls', quantity: 5, price: 5000 },
      { id: 'it_4', name: 'Blend Silk Rolls', quantity: 2, price: 5000 }
    ],
    payments: [
      { id: 'cp_2', amount: 15000, date: '2026-05-15', accountId: 'acc_business_cash', notes: 'Token cash payment handed over' },
      { id: 'cp_3', amount: 20000, date: '2026-06-02', accountId: 'acc_bank', notes: 'Fully paid and settled via direct bank transfer clearance' }
    ]
  },
  {
    id: 'cr_seed_3',
    type: 'sale',
    partyName: 'Zainab Cloth House',
    city: 'Multan',
    amount: 12800,
    repaidAmount: 0,
    dateCreated: '2026-06-03',
    dueDate: '2026-06-18',
    status: 'pending',
    description: 'Sales of summer collection volume prints on short term credit terms.',
    items: [
      { id: 'it_5', name: 'Summer Volume Print Suits', quantity: 8, price: 1600 }
    ],
    payments: []
  }
];

