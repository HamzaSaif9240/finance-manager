/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AppState, Transaction, Transfer, Account, Category, Budget, Goal, Activity, DebtEntry, DebtPayment, CreditRecord, CreditPayment, CreditRecordItem } from './types';
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_CATEGORIES,
  SEED_TRANSACTIONS,
  SEED_TRANSFERS,
  SEED_BUDGETS,
  SEED_GOALS,
  SEED_CREDIT_RECORDS
} from './initialData';
import LucideIcon from './components/LucideIcon';
import { saveOnlineState, fetchOnlineState, deleteOnlineUserAndState, subscribeToOnlineState, subscribeToOnlineUser } from './lib/firebase';

// Main interactive screens
import Dashboard from './components/Dashboard';
import TransactionsLedger from './components/TransactionsLedger';
import AccountsModule from './components/AccountsModule';
import TransferModule from './components/TransferModule';
import AnalyticsModule from './components/AnalyticsModule';
import BudgetModule from './components/BudgetModule';
import GoalsModule from './components/GoalsModule';
import ReceiptVault from './components/ReceiptVault';
import MonthlyView from './components/MonthlyView';
import DebtsModule from './components/DebtsModule';
import CreditsModule from './components/CreditsModule';
import Settings from './components/Settings';
import TransactionForm from './components/TransactionForm';
import AuthScreen, { RegisteredUser } from './components/AuthScreen';
import AdminPanel from './components/AdminPanel';
import { applyTheme } from './utils/themeHelper';
import { formatPKR } from './utils/financeHelpers';

const TAB_INSTRUCTIONS: Record<string, { title: string; emoji: string; bg: string; border: string; text: string; points: string[] }> = {
  dashboard: {
    title: "Dashboard",
    emoji: "📊",
    bg: "from-emerald-500/5 to-teal-500/5 hover:from-emerald-500/10 hover:to-teal-500/10",
    border: "border-emerald-500/20",
    text: "Your high-level financial summary metrics.",
    points: [
      "Total resources: Look at the net liquid asset wealth across checking and physical cash reserves.",
      "Instant ledger entries: Click '+ Add Transaction' to quickly file receipts and record logs on the go.",
      "Local storage: Rest assured that your financial data is stored entirely offline in your browser cache."
    ]
  },
  ledger: {
    title: "Statement Journal & Logs",
    emoji: "📝",
    bg: "from-blue-500/5 to-indigo-500/5 hover:from-blue-500/10 hover:to-indigo-500/10",
    border: "border-blue-500/20",
    text: "Complete chronological journal of all expenditures and cash inflows.",
    points: [
      "Find quickly: Use search terms, filter by cash/digital accounts, or category classes.",
      "Correction checks: Easily Edit (pencil icon) or Delete (trash can icon) any single row entry.",
      "Exporting logs: Download individual statement months or secure complete backups in Settings."
    ]
  },
  accounts: {
    title: "Wallets & Accounts",
    emoji: "💳",
    bg: "from-cyan-500/5 to-blue-500/5 hover:from-cyan-500/10 hover:to-blue-500/10",
    border: "border-cyan-500/20",
    text: "Define your monetary drawers like physical cash purses or checking accounts.",
    points: [
      "Baseline balances: Edit the initial baseline balances here to match your physical situation.",
      "Flexible naming: Map customized wallets like 'HBL Account', 'JazzCash Drawer', or 'Pocket Purse'.",
      "Dynamic tracking: Any logged purchase or deposit will dynamically drain or replenish the assigned drawer."
    ]
  },
  transfers: {
    title: "Internal Balance Payouts & Transfers",
    emoji: "🔄",
    bg: "from-violet-500/5 to-purple-500/5 hover:from-violet-500/10 hover:to-purple-500/10",
    border: "border-violet-500/20",
    text: "Liquid movements without inflating overall wealth indices.",
    points: [
      "Zero net impact: Transfers move balance from one source wallet to a destination without changing overall net wealth.",
      "ATM Logging: Transfer from 'Bank Account' to 'Physical Purse' when withdrawing paper cash notes.",
      "Transfer records: View transfers chronological timeline stream beneath the action form."
    ]
  },
  analytics: {
    title: "Analytics & Budget Drilling",
    emoji: "📈",
    bg: "from-rose-500/5 to-orange-500/5 hover:from-rose-500/10 hover:to-rose-500/10",
    border: "border-rose-500/20",
    text: "Rich localized trends, distribution ratios, and inflow structures.",
    points: [
      "Filter dynamics: Change view parameters to compare spend behavior over customized timelines.",
      "Percent slices: Look at the visual distribution donut to pinpoint top monthly drain lines.",
      "Inflow analytics: Click 'Income' toggle to confirm deposit proportions and freelance payroll channels."
    ]
  },
  budgets: {
    title: "Expense Budgets & Category Alarms",
    emoji: "🐷",
    bg: "from-amber-500/5 to-yellow-500/5 hover:from-amber-500/10 hover:to-yellow-500/10",
    border: "border-amber-500/20",
    text: "Control category spending and stay within set guidelines.",
    points: [
      "Category thresholding: Set maximum monthly spending limits for individual categories (e.g., Food, Travel).",
      "Progress bars: Visual gauges notify you exactly when you enter the red warning sector.",
      "Overrun warning: Monitor bar metrics to notify you of overshoot risks ahead of calendar month shifts."
    ]
  },
  goals: {
    title: "Savings Envelopes & Target Goals",
    emoji: "🎯",
    bg: "from-pink-500/5 to-rose-500/5 hover:from-pink-500/10 hover:to-rose-500/10",
    border: "border-pink-500/20",
    text: "Design structural savings pockets for long term goals.",
    points: [
      "Target endpoints: Define specific milestones (e.g. New Phone, Bike, Winter Trip) with fixed target limits.",
      "Active allocation: Deposit funds into target slots from available balances. Your net pocket cash shifts to 'savings reserve'.",
      "Goal progress: Track exact percentage completed for each active future milestone."
    ]
  },
  debts: {
    title: "Debts & Loans Tracker",
    emoji: "👥",
    bg: "from-sky-500/5 to-indigo-500/5 hover:from-sky-500/10 hover:to-indigo-500/10",
    border: "border-sky-500/20",
    text: "Keep clear records of money borrowed from or loaned to others locally.",
    points: [
      "Categorized states: Tracks both 'Loaned Out' (money others owe you) and 'Borrowed' (money you owe others).",
      "Interactive repayment logs: Log partial fallback repayments easily to see pending remaining balances instantly.",
      "Wallet integration: Choose whether repayments dynamically adjust your wallet balances automatically as they are entered."
    ]
  },
  credits: {
    title: "Credit Sales & Purchases Detail",
    emoji: "🤝",
    bg: "from-amber-500/5 to-orange-500/5 hover:from-amber-500/10 hover:to-orange-500/10",
    border: "border-amber-500/20",
    text: "Maintain records of bulk merchandise dealt on credit terms with custom invoices, item lines, and partial repayments.",
    points: [
      "Receivables vs Payables: Distinguish between customer trade debts (credit sales) and supplier obligations (credit purchases).",
      "Itemized Ledger: Attach detailed quantities and quotes for articles or services delivered on credit terms.",
      "Cash Drawer Inflow: Select whether installments dynamically drain/replenish your checking or cash drawer balances."
    ]
  },
  vault: {
    title: "Receipt Vault",
    emoji: "📸",
    bg: "from-fuchsia-500/5 to-purple-500/5 hover:from-fuchsia-500/10 hover:to-purple-500/10",
    border: "border-fuchsia-500/20",
    text: "Upload or capture snapshot receipts to verify expenditures contextually.",
    points: [
      "Paper check files: Upload digital screenshots or webcam snapshots when logging transaction events.",
      "Base64 Offline storage: Encrypted files are saved directly in your browser client storage, isolated from cloud servers.",
      "Receipt attachment: Link images with exact transactions logs to view context-rich entries anytime."
    ]
  },
  monthly: {
    title: "Monthly Categorization Logs",
    emoji: "📅",
    bg: "from-yellow-500/5 to-amber-500/5 hover:from-yellow-500/10 hover:to-amber-500/10",
    border: "border-yellow-500/20",
    text: "Comprehensive month-by-month financial breakdowns and audit logs.",
    points: [
      "Historical logs: Travel back to view prior billing cycles, month-by-month financial statuses.",
      "Statement journal: Use the compiled transaction journal to trace absolute offline statement details.",
      "Visual review: Look at category stats and print month summaries for financial archives."
    ]
  },
  settings: {
    title: "Ledger Configuration & System Tools",
    emoji: "⚙️",
    bg: "from-slate-500/5 to-zinc-500/5 hover:from-slate-500/10 hover:to-zinc-500/10",
    border: "border-slate-500/20",
    text: "Reset controls, base parameters, and secure backups.",
    points: [
      "Absolute Zero Reset: Instantly wipe test seed databases to begin pristine Day 1 accounting logs.",
      "Offline database backups: Download the ledger state as a clean JSON file record structure.",
      "System Sync imports: Simply reload that JSON backup file on other devices to restore full statements without setup."
    ]
  },
  admin_panel: {
    title: "Control Hub Administrators Panel",
    emoji: "🛡️",
    bg: "from-violet-500/5 to-indigo-500/5 hover:from-violet-500/10 hover:to-indigo-500/10",
    border: "border-violet-500/20",
    text: "Administrative insights and role configurations directory.",
    points: [
      "User summaries check: Super Admins can instantly audit ledger flows, savings metrics, and transaction counts securely by clicking any user's row.",
      "Primary Super Admin controls: The main Super Admin 'ihamzasaif' is uniquely authorized to register and authorize secondary Admins.",
      "Access constraints security: Secondary admins are strictly restricted to listing registered users to guarantee confidentiality."
    ]
  }
};

const LOCAL_STORAGE_KEY = 'taskflow_finance_applet_state_v1';

function sanitizeState(raw: AppState): AppState {
  if (!raw || !raw.accounts) return raw;

  // Clone to avoid mutating original state incorrectly
  const stateCloned = JSON.parse(JSON.stringify(raw)) as AppState;
  const accounts = stateCloned.accounts || [];
  stateCloned.creditRecords = stateCloned.creditRecords || [];
  
  // First, resolve the specific known Meezan Bank with ID 'acc_sadapay' to avoid collisions
  // if another custom account named 'SadaPay' is created or already exists
  accounts.forEach(acc => {
    if (acc.id === 'acc_sadapay' && acc.name.toLowerCase().includes('meezan')) {
      const oldId = 'acc_sadapay';
      const newId = 'acc_meezan';
      
      acc.id = newId;
      
      // Update links
      if (stateCloned.transactions) {
        stateCloned.transactions.forEach(t => {
          if (t.accountId === oldId) t.accountId = newId;
        });
      }
      if (stateCloned.transfers) {
        stateCloned.transfers.forEach(tr => {
          if (tr.fromAccountId === oldId) tr.fromAccountId = newId;
          if (tr.toAccountId === oldId) tr.toAccountId = newId;
          if (tr.feeAccountId === oldId) tr.feeAccountId = newId;
        });
      }
      if (stateCloned.debts) {
        stateCloned.debts.forEach(d => {
          if (d.accountId === oldId) d.accountId = newId;
          if (d.payments) {
            d.payments.forEach(p => {
              if (p.accountId === oldId) p.accountId = newId;
            });
          }
        });
      }
      if (stateCloned.creditRecords) {
        stateCloned.creditRecords.forEach(c => {
          if (c.accountId === oldId) c.accountId = newId;
          if (c.payments) {
            c.payments.forEach(p => {
              if (p.accountId === oldId) p.accountId = newId;
            });
          }
        });
      }
    }
  });

  // Now deal with any other general duplicate account IDs
  const seenIds = new Set<string>();
  
  for (let i = 0; i < accounts.length; i++) {
    const acc = accounts[i];
    if (seenIds.has(acc.id)) {
      const oldId = acc.id;
      // Generate a unique ID
      let uniqueId = oldId;
      let counter = 1;
      while (seenIds.has(uniqueId) || accounts.some((a, idx) => idx !== i && a.id === uniqueId)) {
        uniqueId = `${oldId}_${counter}`;
        counter++;
      }
      acc.id = uniqueId;
      
      // Update links
      if (stateCloned.transactions) {
        stateCloned.transactions.forEach(t => {
          if (t.accountId === oldId) t.accountId = uniqueId;
        });
      }
      if (stateCloned.transfers) {
        stateCloned.transfers.forEach(tr => {
          if (tr.fromAccountId === oldId) tr.fromAccountId = uniqueId;
          if (tr.toAccountId === oldId) tr.toAccountId = uniqueId;
          if (tr.feeAccountId === oldId) tr.feeAccountId = uniqueId;
        });
      }
      if (stateCloned.debts) {
        stateCloned.debts.forEach(d => {
          if (d.accountId === oldId) d.accountId = uniqueId;
          if (d.payments) {
            d.payments.forEach(p => {
              if (p.accountId === oldId) p.accountId = uniqueId;
            });
          }
        });
      }
      if (stateCloned.creditRecords) {
        stateCloned.creditRecords.forEach(c => {
          if (c.accountId === oldId) c.accountId = uniqueId;
          if (c.payments) {
            c.payments.forEach(p => {
              if (p.accountId === oldId) p.accountId = uniqueId;
            });
          }
        });
      }
      
      seenIds.add(uniqueId);
    } else {
      seenIds.add(acc.id);
    }
  }

  return stateCloned;
}

export default function App() {
  // Active User session state
  const [currentUser, setCurrentUser] = useState<RegisteredUser | null>(() => {
    try {
      const saved = localStorage.getItem('taskflow_logged_in_user_v1');
      return saved ? JSON.parse(saved) : null;
    } catch (_) {
      return null;
    }
  });

  // Global State, loads based on logged in user or defaults
  const [state, setState] = useState<AppState>(() => {
    try {
      // First check if a user session is active
      const savedUser = localStorage.getItem('taskflow_logged_in_user_v1');
      if (savedUser) {
        const userObj: RegisteredUser = JSON.parse(savedUser);
        const userKey = `taskflow_user_data_${userObj.id}`;
        const persisted = localStorage.getItem(userKey);
        if (persisted) {
          return sanitizeState(JSON.parse(persisted));
        }
      } else {
        // Fallback for retro compatibility if someone is guest / local
        const persisted = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (persisted) {
          return sanitizeState(JSON.parse(persisted));
        }
      }
    } catch (e) {
      console.warn("Could not read local storage, initializing presets", e);
    }
    
    // Default initial schema
    return sanitizeState({
      accounts: DEFAULT_ACCOUNTS.map(a => ({ ...a, baseBalance: a.balance })), // Track baseline
      categories: DEFAULT_CATEGORIES,
      transactions: SEED_TRANSACTIONS(),
      transfers: SEED_TRANSFERS(),
      budgets: SEED_BUDGETS(),
      goals: SEED_GOALS(),
      debts: [],
      creditRecords: SEED_CREDIT_RECORDS(),
      currency: 'PKR',
      theme: 'light'
    });
  });

  // Reference and helper to avoid redundant write cycles when syncing Firestore state across devices
  const firebaseLastSavedStateStrRef = useRef<string>("");
  const [isInitialSyncCompleted, setIsInitialSyncCompleted] = useState<boolean>(() => {
    // If there is no active user session, initial state has already been parsed and loaded
    const savedUser = localStorage.getItem('taskflow_logged_in_user_v1');
    return savedUser ? false : true;
  });
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');

  // Activities Log / Undo Stack state (runtime/session based)
  const [activities, setActivities] = useState<Activity[]>([]);

  const pushActivity = (description: string, customPrevState?: AppState) => {
    const prevState = customPrevState || state;
    const newActivity: Activity = {
      id: 'act_' + Date.now().toString() + '_' + Math.random().toString(36).substring(2, 7),
      description,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      stateSnapshot: JSON.parse(JSON.stringify(prevState))
    };
    setActivities(prev => {
      const updated = [newActivity, ...prev];
      return updated.slice(0, 15); // Maintain last 15 activities for history selection
    });
  };

  const handleUndoActivity = (activityId: string) => {
    const activityIndex = activities.findIndex(a => a.id === activityId);
    if (activityIndex === -1) return;
    
    const targetActivity = activities[activityIndex];
    
    // Core rollback
    setState(targetActivity.stateSnapshot);
    
    // Clear out this activity and all subsequent activities that happened after it from the stack
    setActivities(prev => prev.slice(activityIndex + 1));
    
    window.showAlert?.(`Successfully undone activity: "${targetActivity.description}"`);
  };

  const getCoreStateString = (stateObj: AppState): string => {
    if (!stateObj) return "";
    const core = {
      accounts: stateObj.accounts,
      categories: stateObj.categories,
      transactions: stateObj.transactions,
      transfers: stateObj.transfers,
      budgets: stateObj.budgets,
      goals: stateObj.goals,
      debts: stateObj.debts || [],
      creditRecords: stateObj.creditRecords || [],
      currency: stateObj.currency,
      theme: stateObj.theme,
      colorTheme: stateObj.colorTheme,
      userName: stateObj.userName,
      userAvatar: stateObj.userAvatar,
      userAge: stateObj.userAge,
      userProfession: stateObj.userProfession,
      hasOnboarded: stateObj.hasOnboarded,
      hasWiped: stateObj.hasWiped
    };
    return JSON.stringify(core);
  };

  // Current tab selector
  const [activeTab, setActiveTab ] = useState<string>('dashboard');

  // Guideline helper visibility state
  const [hiddenGuides, setHiddenGuides] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('hidden_tab_guides');
      return saved ? JSON.parse(saved) : {};
    } catch (_) {
      return {};
    }
  });

  const hideGuide = (tabId: string) => {
    setHiddenGuides(prev => {
      const updated = { ...prev, [tabId]: true };
      try {
        localStorage.setItem('hidden_tab_guides', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
  };

  const showGuide = (tabId: string) => {
    setHiddenGuides(prev => {
      const updated = { ...prev, [tabId]: false };
      try {
        localStorage.setItem('hidden_tab_guides', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
  };

  // Real-time synchronization of state from Firestore across all devices
  useEffect(() => {
    if (!currentUser) {
      setIsInitialSyncCompleted(true);
      return;
    }

    setIsInitialSyncCompleted(false);

    const unsubscribe = subscribeToOnlineState(
      currentUser.username,
      (onlineState) => {
        if (onlineState) {
          const sanitized = sanitizeState(onlineState);
          const incomingCoreStr = getCoreStateString(sanitized);
          setState(currentLocalState => {
            const currentCoreStr = getCoreStateString(currentLocalState);
            if (incomingCoreStr === currentCoreStr) {
              return currentLocalState; // No actual difference, skip state re-render
            }
            
            // Store raw serialized state as latest to avoid write loops
            firebaseLastSavedStateStrRef.current = incomingCoreStr;
            
            // Persistence to local storage
            try {
              localStorage.setItem(`taskflow_user_data_${currentUser.id}`, JSON.stringify(sanitized));
            } catch (_) {}
            
            return sanitized;
          });
          setIsInitialSyncCompleted(true);
        } else {
          // If Firestore contains no data for this username yet (null), we can safely assume initial sync is done.
          // This allows new screen sessions to initialize fresh state in Firestore without being blocked.
          setIsInitialSyncCompleted(true);
        }
      },
      (err) => {
        console.error("Real-time sync subscription error: ", err);
        
        // CRITICAL FIX: To prevent an empty default placeholder workspace on a fresh device (e.g., mobile)
        // from overwriting pre-existing cloud data on start-up due to a slight connection error/delay,
        // we ONLY enable sync-completion write-backs if there is a pre-existing local data cache on this device.
        const existingLocalCache = localStorage.getItem(`taskflow_user_data_${currentUser.id}`);
        if (existingLocalCache) {
          setIsInitialSyncCompleted(true);
        } else {
          // Keep isInitialSyncCompleted as false so they can read placeholder until connection resolves,
          // avoiding catastrophic database write-backs.
          setSyncState('error');
        }
      }
    );

    return () => unsubscribe();
  }, [currentUser?.username]);

  // Real-time subscription to current user profile document (supports immediate admin promotion and profile updates)
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = subscribeToOnlineUser(
      currentUser.username,
      (updatedUser) => {
        if (updatedUser) {
          if (
            updatedUser.isAdmin !== currentUser.isAdmin ||
            updatedUser.isSuper !== currentUser.isSuper ||
            updatedUser.name !== currentUser.name
          ) {
            setCurrentUser(updatedUser);
            try {
              localStorage.setItem('taskflow_logged_in_user_v1', JSON.stringify(updatedUser));
            } catch (_) {}
          }
        }
      },
      (err) => {
        console.error("User profile document subscription error: ", err);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.username, currentUser?.isAdmin, currentUser?.isSuper, currentUser?.name]);

  const initializeNewUserState = async (user: RegisteredUser) => {
    const freshState: AppState = {
      accounts: DEFAULT_ACCOUNTS.map(a => ({ ...a, baseBalance: a.balance })), // Track baseline
      categories: DEFAULT_CATEGORIES,
      transactions: SEED_TRANSACTIONS(),
      transfers: SEED_TRANSFERS(),
      budgets: SEED_BUDGETS(),
      goals: SEED_GOALS(),
      debts: [],
      creditRecords: SEED_CREDIT_RECORDS(),
      currency: 'PKR',
      theme: 'light',
      userName: user.name,
      hasOnboarded: true
    };
    firebaseLastSavedStateStrRef.current = getCoreStateString(freshState);
    setState(freshState);
    try {
      localStorage.setItem(`taskflow_user_data_${user.id}`, JSON.stringify(freshState));
      await saveOnlineState(user.username, freshState);
    } catch (_) {}
  };

  const handleLoginSuccess = async (user: RegisteredUser) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('taskflow_logged_in_user_v1', JSON.stringify(user));
    } catch (_) {}

    setIsInitialSyncCompleted(false);

    try {
      const onlineState = await fetchOnlineState(user.username);
      if (onlineState) {
        const sanitized = sanitizeState(onlineState);
        firebaseLastSavedStateStrRef.current = getCoreStateString(sanitized);
        setState(sanitized);
        setIsInitialSyncCompleted(true);
      } else {
        await initializeNewUserState(user);
        setIsInitialSyncCompleted(true);
      }
    } catch (err) {
      console.warn("Could not retrieve online state, loading local data instead.", err);
      // Load user state or initialize fresh locally
      const userKey = `taskflow_user_data_${user.id}`;
      const persisted = localStorage.getItem(userKey);
      if (persisted) {
        try {
          const parsed = sanitizeState(JSON.parse(persisted));
          firebaseLastSavedStateStrRef.current = getCoreStateString(parsed);
          setState(parsed);
        } catch (_) {
          initializeNewUserState(user);
        }
      } else {
        initializeNewUserState(user);
      }
      setIsInitialSyncCompleted(true);
    }
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('taskflow_logged_in_user_v1');
    } catch (_) {}
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  const handleDeleteUserAccount = async () => {
    if (!currentUser) return;
    try {
      await deleteOnlineUserAndState(currentUser.username);
      try {
        localStorage.removeItem(`taskflow_user_data_${currentUser.id}`);
      } catch (_) {}
      window.showAlert?.("Apka account aur baki sara data permanently delete kar diya gya hy.", "Account Deleted");
      handleLogout();
    } catch (err: any) {
      console.error("Account deletion failed: ", err);
      window.showAlert?.("Account delete karne me error aya: " + (err.message || err));
    }
  };
  
  // Transaction Create/Edit slide-over modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Sidebar expand/collapse state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('finance_sidebar_collapsed');
      return saved ? JSON.parse(saved) === true : false;
    } catch (_) {
      return false;
    }
  });

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('finance_sidebar_collapsed', JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  };

  // State to control edit profile modal open
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  // Mobile drawer open state
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Local state for onboarding form input
  const [onboardName, setOnboardName] = useState('');
  const [onboardAvatar, setOnboardAvatar] = useState('🌷');
  const [onboardAge, setOnboardAge] = useState('');
  const [onboardProfession, setOnboardProfession] = useState('');
  const [onboardStep, setOnboardStep] = useState(1);

  // Local state for profile editing form input
  const [profileEditName, setProfileEditName] = useState('');
  const [profileEditAvatar, setProfileEditAvatar] = useState('🌷');
  const [profileEditAge, setProfileEditAge] = useState('');
  const [profileEditProfession, setProfileEditProfession] = useState('');

  // Custom alert and confirm dialog state
  const [customDialog, setCustomDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'alert' | 'confirm';
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);

  // Initialize custom global triggers and override native alert
  useEffect(() => {
    window.showAlert = (message: string, title = "Finance Manager by Hamza Saif") => {
      setCustomDialog({
        isOpen: true,
        title,
        message,
        type: 'alert',
        onConfirm: () => {
          setCustomDialog(null);
        }
      });
    };

    window.showConfirm = (message: string, onConfirm: () => void, title = "Finance Manager by Hamza Saif") => {
      setCustomDialog({
        isOpen: true,
        title,
        message,
        type: 'confirm',
        onConfirm: () => {
          onConfirm();
          setCustomDialog(null);
        },
        onCancel: () => {
          setCustomDialog(null);
        }
      });
    };

    const nativeAlert = window.alert;
    window.alert = (message: string) => {
      window.showAlert?.(message);
    };

    return () => {
      window.alert = nativeAlert;
      delete window.showConfirm;
      delete window.showAlert;
    };
  }, []);

  // Sync profile editing when modal opens
  useEffect(() => {
    if (isEditProfileOpen) {
      setProfileEditName(state.userName || 'Finance User');
      setProfileEditAvatar(state.userAvatar || '🌷');
      setProfileEditAge(state.userAge || '');
      setProfileEditProfession(state.userProfession || '');
    }
  }, [isEditProfileOpen, state.userName, state.userAvatar, state.userAge, state.userProfession]);

  // Sync state to local storage and Firestore online database with a debounce
  useEffect(() => {
    if (!isInitialSyncCompleted) {
      // Prevent writing transient local state while downloading master records from cloud on login/startup
      return;
    }
    try {
      if (currentUser) {
        localStorage.setItem(`taskflow_user_data_${currentUser.id}`, JSON.stringify(state));
        
        const currentCoreStr = getCoreStateString(state);
        if (currentCoreStr === firebaseLastSavedStateStrRef.current) {
          // If state is identical to what is in Firestore, do not generate a duplicate write
          return;
        }

        setSyncState('syncing');

        // Debounce Firestore online database write to optimize network traffic
        const timer = setTimeout(async () => {
          try {
            await saveOnlineState(currentUser.username, state);
            firebaseLastSavedStateStrRef.current = currentCoreStr;
            setSyncState('synced');
            
            // Switch back to idle/synced indicator state after 3 seconds
            setTimeout(() => {
              setSyncState((curr) => curr === 'synced' ? 'idle' : curr);
            }, 3000);
          } catch (err) {
            console.error("Firestore sync error: ", err);
            setSyncState('error');
          }
        }, 1200);

        return () => clearTimeout(timer);
      } else {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
      }
    } catch (e) {
      console.error("Failed to write state in local storage", e);
    }
  }, [state, currentUser, isInitialSyncCompleted]);

  // Adjust theme on body element
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    if (state.theme === 'dark') {
      root.classList.add('dark');
      body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark');
    }
  }, [state.theme]);

  // Apply dynamic primary accent color presets
  useEffect(() => {
    applyTheme(state.colorTheme || 'purple');
  }, [state.colorTheme]);

  // CORE LEDGER ENGINE: Recomputes absolute current balances to prevent divergences
  const computedAccounts = useMemo(() => {
    return state.accounts.map(acc => {
      const startBalance = (acc as any).baseBalance !== undefined ? (acc as any).baseBalance : acc.balance;
      
      const inflowsSum = state.transactions
        .filter(t => t.accountId === acc.id && t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const outflowsSum = state.transactions
        .filter(t => t.accountId === acc.id && t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      const transferInlets = state.transfers
        .filter(tr => tr.toAccountId === acc.id)
        .reduce((sum, tr) => sum + tr.amount, 0);

      const transferOutlets = state.transfers
        .filter(tr => tr.fromAccountId === acc.id)
        .reduce((sum, tr) => sum + tr.amount, 0);

      const finalBalance = startBalance + inflowsSum - outflowsSum + transferInlets - transferOutlets;

      return {
        ...acc,
        balance: finalBalance
      };
    });
  }, [state.accounts, state.transactions, state.transfers]);

  // State update utility wrapper
  const updateStateValue = <T extends keyof AppState>(key: T, value: AppState[T]) => {
    let description = `Updated ${String(key)}`;
    if (key === 'colorTheme') {
      description = `Changed theme style to ${String(value)} color`;
    } else if (key === 'currency') {
      description = `Changed primary currency to ${String(value)}`;
    } else if (key === 'theme') {
      description = `Switched theme mode to ${String(value)}`;
    } else if (key === 'userName') {
      description = `Updated user profile name to "${String(value)}"`;
    }
    pushActivity(description, state);

    setState(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Transaction statement CRUD hooks
  const handleSaveTransaction = (
    txData: Omit<Transaction, 'id'>, 
    customCategory?: { name: string; type: 'income' | 'expense' }
  ) => {
    let updatedCategories = [...state.categories];
    let finalCategoryId = txData.categoryId;

    // Inject custom category if defined
    if (customCategory) {
      const generatedId = 'cat_' + customCategory.name.toLowerCase().replace(/\s+/g, '_');
      
      // Verify duplicate category name first
      if (!updatedCategories.some(c => c.id === generatedId)) {
        const newCat: Category = {
          id: generatedId,
          name: customCategory.name,
          type: customCategory.type,
          icon: customCategory.type === 'income' ? 'PlusCircle' : 'Coffee',
          isCustom: true
        };
        updatedCategories.push(newCat);
        finalCategoryId = generatedId;
      }
    }

    if (editingTransaction) {
      // Edit mode
      const updatedTx = state.transactions.map(t => 
        t.id === editingTransaction.id 
          ? { ...t, ...txData, categoryId: finalCategoryId } 
          : t
      );
      const oldAmountStr = formatPKR(editingTransaction.amount, state.currency);
      const newAmountStr = formatPKR(txData.amount, state.currency);
      pushActivity(`Edited transaction details: ${oldAmountStr} → ${newAmountStr} "${txData.description || 'unnamed'}"`, state);

      setState(prev => ({
        ...prev,
        transactions: updatedTx,
        categories: updatedCategories
      }));
    } else {
      // Create mode
      const newTx: Transaction = {
        ...txData,
        id: 'tx_' + Date.now().toString(),
        categoryId: finalCategoryId
      };
      const amountStr = formatPKR(txData.amount, state.currency);
      const direction = txData.type === 'income' ? 'Received' : 'Spent';
      pushActivity(`Added entry: ${direction} ${amountStr} for "${txData.description || 'unnamed'}"`, state);

      setState(prev => ({
        ...prev,
        transactions: [newTx, ...prev.transactions],
        categories: updatedCategories
      }));
    }

    // Reset modals
    setIsAddModalOpen(false);
    setEditingTransaction(null);
  };

  const handleDeleteTransaction = (txId: string) => {
    const tx = state.transactions.find(t => t.id === txId);
    if (tx) {
      const amountStr = formatPKR(tx.amount, state.currency);
      pushActivity(`Deleted transaction history of ${amountStr} "${tx.description}"`, state);
    }
    setState(prev => ({
      ...prev,
      transactions: prev.transactions.filter(t => t.id !== txId)
    }));
  };

  // Accounts CRUD hooks
  const handleAddAccount = (name: string, type: 'cash' | 'digital', startingBalance: number) => {
    let newId = 'acc_' + name.toLowerCase().replace(/\s+/g, '_');
    // Prevent ID collision:
    if (state.accounts.some(a => a.id === newId)) {
      newId = newId + '_' + Math.random().toString(36).substring(2, 5);
    }
    const newAcc: Account = {
      id: newId,
      name,
      type,
      balance: startingBalance,
      isCustom: true
    };
    // Initialize starting balance safely as baseline
    (newAcc as any).baseBalance = startingBalance;

    pushActivity(`Created account/wallet "${name}" with initial balance ${formatPKR(startingBalance, state.currency)}`, state);

    setState(prev => ({
      ...prev,
      accounts: [...prev.accounts, newAcc]
    }));
  };

  const handleEditAccountBalance = (accountId: string, newBalance: number) => {
    const acc = state.accounts.find(a => a.id === accountId);
    if (acc) {
      pushActivity(`Updated balance of "${acc.name}" from ${formatPKR(acc.balance, state.currency)} to ${formatPKR(newBalance, state.currency)}`, state);
    }
    setState(prev => ({
      ...prev,
      accounts: prev.accounts.map(a => 
        a.id === accountId 
          ? { ...a, balance: newBalance, baseBalance: newBalance } 
          : a
      )
    }));
  };

  const handleDeleteAccount = (accId: string) => {
    const acc = state.accounts.find(a => a.id === accId);
    if (acc) {
      pushActivity(`Deleted account/wallet "${acc.name}"`, state);
    }
    setState(prev => ({
      ...prev,
      accounts: prev.accounts.filter(a => a.id !== accId),
      // Clean dependent logs
      transactions: prev.transactions.filter(t => t.accountId !== accId),
      transfers: prev.transfers.filter(tr => tr.fromAccountId !== accId && tr.toAccountId !== accId)
    }));
  };

  // Transfers CRUD hooks
  const handleAddTransfer = (
    fromAcc: string,
    toAcc: string,
    amount: number,
    date: string,
    description: string,
    fee: number,
    feeAccountId: string
  ) => {
    const trId = 'tr_' + Date.now().toString();
    const newTr: Transfer = {
      id: trId,
      fromAccountId: fromAcc,
      toAccountId: toAcc,
      amount,
      date,
      description,
      fee,
      feeAccountId: feeAccountId || fromAcc
    };

    let updatedTxs = [...state.transactions];
    if (fee > 0) {
      const sourceName = state.accounts.find(a => a.id === fromAcc)?.name || 'Account';
      const targetName = state.accounts.find(a => a.id === toAcc)?.name || 'Account';
      const chargesRecipientAccId = feeAccountId || fromAcc;
      
      const newTx: Transaction = {
        id: 'tx_fee_' + Date.now().toString(),
        amount: fee,
        type: 'expense',
        accountId: chargesRecipientAccId,
        categoryId: 'cat_transfer_fee', // Dedicated standard transfer fee category
        date,
        description: `Charges for Transfer: ${sourceName} → ${targetName}` + (description ? ` (${description})` : ''),
        transferId: trId
      };
      updatedTxs = [newTx, ...updatedTxs];
    }

    const fromName = state.accounts.find(a => a.id === fromAcc)?.name || 'Account';
    const toName = state.accounts.find(a => a.id === toAcc)?.name || 'Account';
    const feeStr = fee > 0 ? ` with fee of ${formatPKR(fee, state.currency)}` : '';
    pushActivity(`Transferred ${formatPKR(amount, state.currency)} from ${fromName} to ${toName}${feeStr}`, state);

    setState(prev => ({
      ...prev,
      transfers: [newTr, ...prev.transfers],
      transactions: updatedTxs
    }));
  };

  const handleDeleteTransfer = (trId: string) => {
    const tr = state.transfers.find(t => t.id === trId);
    if (tr) {
      const fromName = state.accounts.find(a => a.id === tr.fromAccountId)?.name || 'Account';
      const toName = state.accounts.find(a => a.id === tr.toAccountId)?.name || 'Account';
      pushActivity(`Deleted transfer record of ${formatPKR(tr.amount, state.currency)} from ${fromName} to ${toName}`, state);
    }
    setState(prev => ({
      ...prev,
      transfers: prev.transfers.filter(tr => tr.id !== trId),
      // Automatically clean up any linked transfer fee transaction!
      transactions: prev.transactions.filter(t => t.transferId !== trId)
    }));
  };

  // Monthly Budget hooks
  const handleAddBudget = (categoryId: string, limit: number) => {
    const bId = 'bd_' + categoryId;
    const existingIdx = state.budgets.findIndex(b => b.categoryId === categoryId);
    const catName = categoryId === 'cat_transfer_fee' ? 'Transaction Charges' : (state.categories.find(c => c.id === categoryId)?.name || 'Category');
    
    if (existingIdx > -1) {
      // Modify
      const oldLimit = state.budgets[existingIdx].monthlyLimit;
      pushActivity(`Modified budget limit for "${catName}" from ${formatPKR(oldLimit, state.currency)} to ${formatPKR(limit, state.currency)}`, state);
      const updated = [...state.budgets];
      updated[existingIdx].monthlyLimit = limit;
      setState(prev => ({ ...prev, budgets: updated }));
    } else {
      // Create fresh
      pushActivity(`Set monthly budget limit of ${formatPKR(limit, state.currency)} for "${catName}"`, state);
      const newB: Budget = {
        id: bId,
        categoryId,
        monthlyLimit: limit
      };
      setState(prev => ({ ...prev, budgets: [...prev.budgets, newB] }));
    }
  };

  const handleDeleteBudget = (bId: string) => {
    const b = state.budgets.find(_b => _b.id === bId);
    if (b) {
      const catName = b.categoryId === 'cat_transfer_fee' ? 'Transaction Charges' : (state.categories.find(c => c.id === b.categoryId)?.name || 'Category');
      pushActivity(`Removed budget limit for "${catName}"`, state);
    }
    setState(prev => ({
      ...prev,
      budgets: prev.budgets.filter(b => b.id !== bId)
    }));
  };

  // Goals hooks
  const handleAddGoal = (name: string, target: number, initial: number = 0) => {
    const newG: Goal = {
      id: 'go_' + Date.now().toString(),
      name,
      targetAmount: target,
      savedAmount: initial,
      dateCreated: new Date().toISOString().substring(0, 10)
    };
    pushActivity(`Created savings goal "${name}" with target ${formatPKR(target, state.currency)}`, state);
    setState(prev => ({ ...prev, goals: [...prev.goals, newG] }));
  };

  const handleUpdateGoalProgress = (goalId: string, saved: number) => {
    const g = state.goals.find(_g => _g.id === goalId);
    if (g) {
      pushActivity(`Updated accumulated savings for "${g.name}" to ${formatPKR(saved, state.currency)}`, state);
    }
    setState(prev => ({
      ...prev,
      goals: prev.goals.map(g => g.id === goalId ? { ...g, savedAmount: saved } : g)
    }));
  };

  const handleContributeToGoal = (goalId: string, accountId: string, amount: number) => {
    // 1. Log payment transaction of type 'expense' so assets reduce and ledger balances match
    const newTx: Transaction = {
      id: 'tx_goal_contrib_' + Date.now().toString(),
      amount,
      type: 'expense',
      accountId,
      categoryId: 'cat_other_exp', // miscellaneous/other expense
      date: new Date().toISOString().substring(0, 10),
      description: `Contributed funds towards goal: ${state.goals.find(g => g.id === goalId)?.name || 'Goal'}`
    };

    const g = state.goals.find(_g => _g.id === goalId);
    const acc = state.accounts.find(a => a.id === accountId);
    if (g && acc) {
      pushActivity(`Contributed ${formatPKR(amount, state.currency)} to savings goal "${g.name}" using wallet ${acc.name}`, state);
    }

    // 2. Adjust target goal saved amount in state
    setState(prev => ({
      ...prev,
      transactions: [newTx, ...prev.transactions],
      goals: prev.goals.map(g => g.id === goalId ? { ...g, savedAmount: g.savedAmount + amount } : g)
    }));
  };

  const handleDeleteGoal = (goalId: string) => {
    setState(prev => ({
      ...prev,
      goals: prev.goals.filter(g => g.id !== goalId)
    }));
  };

  // DEBTS & LOANS CONTROLLER ACTIONS
  const handleAddDebt = (
    debtData: Omit<DebtEntry, 'id' | 'repaidAmount' | 'payments' | 'status'>,
    adjustWallet: boolean
  ) => {
    const debtId = 'dt_' + Date.now().toString() + '_' + Math.random().toString(36).substring(2, 6);
    const newDebt: DebtEntry = {
      ...debtData,
      id: debtId,
      repaidAmount: 0,
      payments: [],
      status: 'active'
    };

    const actionText = debtData.type === 'gave' ? 'Lent Out' : 'Borrowed';
    pushActivity(`Recorded new Debt (${actionText}) to ${debtData.personName}: ${formatPKR(debtData.amount, state.currency || 'PKR')}`, state);

    let updatedTxList = [...(state.transactions || [])];

    if (adjustWallet) {
      const type = debtData.type === 'gave' ? 'expense' : 'income';
      const catId = debtData.type === 'gave' ? 'cat_other_exp' : 'cat_other_inc';
      const desc = debtData.type === 'gave' 
        ? `Loaned Out to ${debtData.personName}` 
        : `Borrowed Loan from ${debtData.personName}`;

      const newTx: Transaction = {
        id: 'tx_debt_' + Date.now().toString(),
        amount: debtData.amount,
        type,
        accountId: debtData.accountId,
        categoryId: catId,
        date: debtData.dateCreated || new Date().toISOString().substring(0, 10),
        description: desc + (debtData.description ? ` (${debtData.description})` : '')
      };
      updatedTxList = [newTx, ...updatedTxList];
    }

    setState(prev => ({
      ...prev,
      debts: [...(prev.debts || []), newDebt],
      transactions: updatedTxList
    }));
  };

  const handleAddRepayment = (
    debtId: string,
    paymentData: Omit<DebtPayment, 'id'>,
    adjustWallet: boolean
  ) => {
    const debt = (state.debts || []).find(d => d.id === debtId);
    if (!debt) return;

    const paymentId = 'dp_' + Date.now().toString() + '_' + Math.random().toString(36).substring(2, 6);
    const newPayment: DebtPayment = {
      ...paymentData,
      id: paymentId
    };

    const newRepaidAmount = debt.repaidAmount + paymentData.amount;
    const isNowSettled = newRepaidAmount >= debt.amount - 0.01;

    pushActivity(`Logged Repayment installment of ${formatPKR(paymentData.amount, state.currency || 'PKR')} for "${debt.personName}"`, state);

    let updatedTxList = [...(state.transactions || [])];

    if (adjustWallet) {
      const type = debt.type === 'gave' ? 'income' : 'expense';
      const catId = debt.type === 'gave' ? 'cat_other_inc' : 'cat_other_exp';
      const desc = debt.type === 'gave'
        ? `Repayment Received on loan from ${debt.personName}`
        : `Repayment Returned on debt to ${debt.personName}`;

      const newTx: Transaction = {
        id: 'tx_repay_' + Date.now().toString(),
        amount: paymentData.amount,
        type,
        accountId: paymentData.accountId,
        categoryId: catId,
        date: paymentData.date || new Date().toISOString().substring(0, 10),
        description: desc + (paymentData.notes ? ` (${paymentData.notes})` : '')
      };
      updatedTxList = [newTx, ...updatedTxList];
    }

    setState(prev => ({
      ...prev,
      transactions: updatedTxList,
      debts: (prev.debts || []).map(d => {
        if (d.id === debtId) {
          return {
            ...d,
            repaidAmount: newRepaidAmount,
            status: isNowSettled ? 'settled' : 'active',
            payments: [...d.payments, newPayment]
          };
        }
        return d;
      })
    }));
  };

  const handleSettleDebt = (debtId: string, accountId: string, adjustWallet: boolean) => {
    const debt = (state.debts || []).find(d => d.id === debtId);
    if (!debt) return;

    const remaining = Math.max(0, debt.amount - debt.repaidAmount);
    if (remaining <= 0) return;

    const paymentId = 'dp_' + Date.now().toString() + '_settle';
    const finalPayment: DebtPayment = {
      id: paymentId,
      amount: remaining,
      date: new Date().toISOString().substring(0, 10),
      accountId,
      notes: "Auto fully settled / closed"
    };

    pushActivity(`Fully Settled lingering debt with "${debt.personName}"`, state);

    let updatedTxList = [...(state.transactions || [])];

    if (adjustWallet) {
      const type = debt.type === 'gave' ? 'income' : 'expense';
      const catId = debt.type === 'gave' ? 'cat_other_inc' : 'cat_other_exp';
      const desc = debt.type === 'gave'
        ? `Final Settlement received from ${debt.personName}`
        : `Final Settlement returned to ${debt.personName}`;

      const newTx: Transaction = {
        id: 'tx_repay_' + Date.now().toString(),
        amount: remaining,
        type,
        accountId,
        categoryId: catId,
        date: new Date().toISOString().substring(0, 10),
        description: desc
      };
      updatedTxList = [newTx, ...updatedTxList];
    }

    setState(prev => ({
      ...prev,
      transactions: updatedTxList,
      debts: (prev.debts || []).map(d => {
        if (d.id === debtId) {
          return {
            ...d,
            repaidAmount: d.amount,
            status: 'settled',
            payments: [...d.payments, finalPayment]
          };
        }
        return d;
      })
    }));
  };

  const handleDeleteDebt = (debtId: string) => {
    const debt = (state.debts || []).find(d => d.id === debtId);
    if (debt) {
      pushActivity(`Deleted debt file entry for "${debt.personName}"`, state);
    }
    setState(prev => ({
      ...prev,
      debts: (prev.debts || []).filter(d => d.id !== debtId)
    }));
  };

  // CREDIT SALES & PURCHASES CONTROLLER ACTIONS
  const handleAddCreditRecord = (
    creditData: Omit<CreditRecord, 'id' | 'repaidAmount' | 'payments' | 'status'>,
    adjustWallet: boolean,
    initialPaidAmount: number = 0
  ) => {
    const recordId = 'cr_' + Date.now().toString() + '_' + Math.random().toString(36).substring(2, 6);
    const payments: CreditPayment[] = [];
    if (initialPaidAmount > 0 && creditData.accountId) {
      payments.push({
        id: 'cp_' + Date.now().toString() + '_init',
        amount: initialPaidAmount,
        date: creditData.dateCreated,
        accountId: creditData.accountId,
        notes: 'Initial partial payment received at booking'
      });
    }

    const netRepaid = initialPaidAmount;
    const status = netRepaid >= creditData.amount - 0.01 
      ? 'paid' 
      : (netRepaid > 0 ? 'partial' : 'pending');

    const newRecord: CreditRecord = {
      ...creditData,
      id: recordId,
      repaidAmount: netRepaid,
      payments,
      status
    };

    const actionText = creditData.type === 'sale' ? 'Credit Sale' : 'Credit Purchase';
    pushActivity(`Recorded new ${actionText} with ${creditData.partyName}: ${formatPKR(creditData.amount, state.currency || 'PKR')}`, state);

    let updatedTxList = [...(state.transactions || [])];

    if (adjustWallet && initialPaidAmount > 0 && creditData.accountId) {
      const type = creditData.type === 'sale' ? 'income' : 'expense';
      const catId = creditData.type === 'sale' ? 'cat_business_inc' : 'cat_shopping';
      const desc = creditData.type === 'sale'
        ? `Down payment received for Credit Sale to ${creditData.partyName}`
        : `Down payment cleared for Credit Purchase from ${creditData.partyName}`;

      const newTx: Transaction = {
        id: 'tx_cr_init_' + Date.now().toString(),
        amount: initialPaidAmount,
        type,
        accountId: creditData.accountId,
        categoryId: catId,
        date: creditData.dateCreated,
        description: desc + (creditData.description ? ` (${creditData.description})` : '')
      };
      updatedTxList = [newTx, ...updatedTxList];
    }

    setState(prev => ({
      ...prev,
      creditRecords: [...(prev.creditRecords || []), newRecord],
      transactions: updatedTxList
    }));
  };

  const handleAddCreditPayment = (
    recordId: string,
    paymentData: Omit<CreditPayment, 'id'>,
    adjustWallet: boolean
  ) => {
    const record = (state.creditRecords || []).find(c => c.id === recordId);
    if (!record) return;

    const paymentId = 'cp_' + Date.now().toString() + '_' + Math.random().toString(36).substring(2, 6);
    const newPayment: CreditPayment = {
      ...paymentData,
      id: paymentId
    };

    const newRepaidAmount = record.repaidAmount + paymentData.amount;
    const isNowPaid = newRepaidAmount >= record.amount - 0.01;
    const status = isNowPaid ? 'paid' : 'partial';

    pushActivity(`Logged installment payout of ${formatPKR(paymentData.amount, state.currency || 'PKR')} for "${record.partyName}"`, state);

    let updatedTxList = [...(state.transactions || [])];

    if (adjustWallet) {
      const type = record.type === 'sale' ? 'income' : 'expense';
      const catId = record.type === 'sale' ? 'cat_business_inc' : 'cat_shopping';
      const desc = record.type === 'sale'
        ? `Credit installment cleared from ${record.partyName}`
        : `Credit installment cleared to ${record.partyName}`;

      const newTx: Transaction = {
        id: 'tx_cr_pay_' + Date.now().toString(),
        amount: paymentData.amount,
        type,
        accountId: paymentData.accountId,
        categoryId: catId,
        date: paymentData.date || new Date().toISOString().substring(0, 10),
        description: desc + (paymentData.notes ? ` (${paymentData.notes})` : '')
      };
      updatedTxList = [newTx, ...updatedTxList];
    }

    setState(prev => ({
      ...prev,
      transactions: updatedTxList,
      creditRecords: (prev.creditRecords || []).map(c => {
        if (c.id === recordId) {
          return {
            ...c,
            repaidAmount: newRepaidAmount,
            status,
            payments: [...(c.payments || []), newPayment]
          };
        }
        return c;
      })
    }));
  };

  const handleSettleCreditRecord = (recordId: string, accountId: string, adjustWallet: boolean) => {
    const record = (state.creditRecords || []).find(c => c.id === recordId);
    if (!record) return;

    const remaining = Math.max(0, record.amount - record.repaidAmount);
    if (remaining <= 0) return;

    const paymentId = 'cp_' + Date.now().toString() + '_settle';
    const finalPayment: CreditPayment = {
      id: paymentId,
      amount: remaining,
      date: new Date().toISOString().substring(0, 10),
      accountId,
      notes: "Auto fully settled & closed credit"
    };

    pushActivity(`Fully settled remaining balance on credit record with "${record.partyName}"`, state);

    let updatedTxList = [...(state.transactions || [])];

    if (adjustWallet) {
      const type = record.type === 'sale' ? 'income' : 'expense';
      const catId = record.type === 'sale' ? 'cat_business_inc' : 'cat_shopping';
      const desc = record.type === 'sale'
        ? `Full balance settlement received from credit buyer ${record.partyName}`
        : `Full balance settlement returned to credit vendor ${record.partyName}`;

      const newTx: Transaction = {
        id: 'tx_cr_settle_' + Date.now().toString(),
        amount: remaining,
        type,
        accountId,
        categoryId: catId,
        date: new Date().toISOString().substring(0, 10),
        description: desc
      };
      updatedTxList = [newTx, ...updatedTxList];
    }

    setState(prev => ({
      ...prev,
      transactions: updatedTxList,
      creditRecords: (prev.creditRecords || []).map(c => {
        if (c.id === recordId) {
          return {
            ...c,
            repaidAmount: c.amount,
            status: 'paid',
            payments: [...(c.payments || []), finalPayment]
          };
        }
        return c;
      })
    }));
  };

  const handleDeleteCreditRecord = (recordId: string) => {
    const record = (state.creditRecords || []).find(c => c.id === recordId);
    if (record) {
      pushActivity(`Deleted Credit file entry for "${record.partyName}"`, state);
    }
    setState(prev => ({
      ...prev,
      creditRecords: (prev.creditRecords || []).filter(c => c.id !== recordId)
    }));
  };

  const handleEditCreditRecord = (
    recordId: string,
    updatedData: Partial<Omit<CreditRecord, 'id' | 'payments' | 'repaidAmount' | 'status'>>
  ) => {
    const record = (state.creditRecords || []).find(c => c.id === recordId);
    if (record) {
      pushActivity(`Updated Credit record with ${record.partyName} (new amount: ${updatedData.amount || record.amount})`, state);
    }
    setState(prev => {
      const records = prev.creditRecords || [];
      const updatedRecords = records.map(c => {
        if (c.id === recordId) {
          const merged = { ...c, ...updatedData };
          const netRepaid = merged.repaidAmount || 0;
          const status = netRepaid >= merged.amount - 0.01 
            ? 'paid' 
            : (netRepaid > 0 ? 'partial' : 'pending');
          return {
            ...merged,
            status
          };
        }
        return c;
      });
      return {
        ...prev,
        creditRecords: updatedRecords
      };
    });
  };

  // Hard restore state
  const handleImportBackup = (imported: AppState) => {
    setState(imported);
    alert('Local file database loaded successfully!');
  };

  // Hard Reset (Keep Profile & Onboarding flags intact)
  const handleResetData = () => {
    setState(prev => ({
      accounts: DEFAULT_ACCOUNTS.map(a => ({ ...a, baseBalance: a.balance })),
      categories: DEFAULT_CATEGORIES,
      transactions: SEED_TRANSACTIONS(),
      transfers: SEED_TRANSFERS(),
      budgets: SEED_BUDGETS(),
      goals: SEED_GOALS(),
      debts: [],
      creditRecords: SEED_CREDIT_RECORDS(),
      currency: prev.currency || 'PKR',
      theme: prev.theme || 'light',
      userName: prev.userName,
      userAvatar: prev.userAvatar,
      hasOnboarded: prev.hasOnboarded
    }));
  };

  // Complete Absolute Zero Delete & Fresh Wipeout (Day 1 Slate)
  const handleAbsoluteZeroReset = () => {
    setState(prev => ({
      ...prev,
      transactions: [],
      transfers: [],
      budgets: [],
      goals: [],
      debts: [],
      creditRecords: [],
      hasWiped: true,
      accounts: prev.accounts.map(acc => ({
        ...acc,
        balance: 0,
        baseBalance: 0
      }))
    }));
    alert("Absolute Zero Reset Complete! 🎉 All transactions, transfers, targets and budgets are wiped. Account/Wallet base balances are now set to zero. You can begin fresh billing entries from Day 1.");
  };

  const handleOnboardAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setOnboardAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileEditAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCompleteOnboarding = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardName.trim()) {
      alert("Please enter a username to personalize your ledger.");
      return;
    }
    setState(prev => ({
      ...prev,
      userName: onboardName.trim(),
      userAvatar: onboardAvatar,
      userAge: onboardAge.trim(),
      userProfession: onboardProfession.trim(),
      hasOnboarded: true
    }));
  };

  const handleSaveProfileEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileEditName.trim()) {
      alert("Custom username cannot be blank.");
      return;
    }
    setState(prev => ({
      ...prev,
      userName: profileEditName.trim(),
      userAvatar: profileEditAvatar,
      userAge: profileEditAge.trim(),
      userProfession: profileEditProfession.trim()
    }));
    setIsEditProfileOpen(false);
  };

  // Tab definitions mapping key metadata
  const navTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
    { id: 'ledger', label: 'Statement Log', icon: 'History' },
    { id: 'accounts', label: 'Wallets & Cash', icon: 'Wallet' },
    { id: 'transfers', label: 'Transfers', icon: 'ArrowLeftRight' },
    { id: 'analytics', label: 'Analytics', icon: 'BarChart3' },
    { id: 'budgets', label: 'Budgets', icon: 'PiggyBank' },
    { id: 'goals', label: 'Goals', icon: 'Target' },
    { id: 'debts', label: 'Debts & Loans', icon: 'Coins' },
    { id: 'credits', label: 'Credit Dealing', icon: 'Handshake' },
    { id: 'vault', label: 'Receipt Vault', icon: 'Camera' },
    { id: 'monthly', label: 'Monthly Statements', icon: 'CalendarRange' },
    { id: 'settings', label: 'Settings', icon: 'Settings' },
    ...(currentUser?.isAdmin ? [{ id: 'admin_panel', label: 'Admin Panel', icon: 'ShieldAlert' }] : [])
  ];

  if (!currentUser) {
    return <AuthScreen onLoginSuccess={handleLoginSuccess} theme={state.theme} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 SideTransition dark:bg-slate-950 font-sans transition-colors duration-300 flex flex-col md:flex-row">
      
      {/* SIDEBAR: Large screens navigation */}
      <aside className={`hidden md:flex flex-col ${sidebarCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shrink-0 text-slate-800 dark:text-white shadow-sm relative z-20 transition-all duration-300`}>
        {/* Brand identity header */}
        <div className={`p-4 border-b border-slate-100 dark:border-slate-800 flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between gap-2.5'}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-emerald-500/20 shrink-0">
              FM
            </div>
            {!sidebarCollapsed && (
              <div className="animate-fadeIn">
                <span className="text-xs font-black leading-none tracking-wide text-slate-900 dark:text-white uppercase block">Finance Manager</span>
                <span className="text-[9px] text-emerald-500 font-bold block mt-0.5 tracking-wider uppercase leading-none">Active Cloud Ledger</span>
              </div>
            )}
          </div>
          
          <button
            onClick={toggleSidebar}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition duration-200 cursor-pointer"
            title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <LucideIcon name={sidebarCollapsed ? "ChevronRight" : "ChevronLeft"} size={14} />
          </button>
        </div>

        {/* Profile Card component */}
        <div className={`p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/40 flex ${sidebarCollapsed ? 'justify-center' : 'items-center gap-3'} transition-allduration-300`}>
          <button 
            onClick={() => setIsEditProfileOpen(true)}
            className="group relative flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-emerald-500 shrink-0 w-10 h-10 cursor-pointer shadow-inner"
            title="Edit Profile"
          >
            {state.userAvatar ? (
              state.userAvatar.startsWith('data:image') ? (
                <img src={state.userAvatar} alt="DP" className="w-10 h-10 object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-xl">{state.userAvatar}</span>
              )
            ) : (
              <span className="text-xl">👤</span>
            )}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[9px] font-bold transition-all">
              EDIT
            </div>
          </button>
          
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0 text-left animate-fadeIn">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                {state.userName || 'Finance User'}
              </p>
              {(state.userAge || state.userProfession) && (
                <p className="text-[10px] text-slate-450 dark:text-slate-550 truncate leading-tight mt-0.5">
                  {[
                    state.userAge ? `${state.userAge} yrs` : '',
                    state.userProfession
                  ].filter(Boolean).join(' • ')}
                </p>
              )}
              <button 
                onClick={() => setIsEditProfileOpen(true)}
                className="text-[10px] text-emerald-500 dark:text-emerald-400 font-bold hover:underline block leading-none mt-1"
              >
                Edit Profile
              </button>
            </div>
          )}
        </div>

        {/* Sidebar dynamic links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navTabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full py-2 px-2.5 rounded-xl text-left font-semibold text-xs transition duration-200 flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} cursor-pointer ${
                  isActive
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/10'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={sidebarCollapsed ? tab.label : undefined}
              >
                <span className={isActive ? 'text-white' : 'text-slate-400'}>
                  <LucideIcon name={tab.icon} size={15} />
                </span>
                {!sidebarCollapsed && <span className="truncate">{tab.label}</span>}
              </button>
            );
          })}
        </nav>

        {sidebarCollapsed && currentUser && (
          <div className="py-2.5 mt-auto flex flex-col justify-center items-center border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handleLogout}
              className="p-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-955/20 rounded-xl transition cursor-pointer"
              title="Sign Out Session"
            >
              <LucideIcon name="LogOut" size={15} />
            </button>
          </div>
        )}

        {/* Bottom system theme switch indicator-with-sync */}
        {!sidebarCollapsed && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 flex flex-col gap-2.5">
            {/* Live syncing status indicator widget */}
            <div className="pb-2 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[10px]">
              <span className="text-slate-400 dark:text-slate-505 font-medium select-none">Cloud Sync:</span>
              <div className="flex items-center gap-1.5 relative">
                {!isInitialSyncCompleted ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span className="font-extrabold text-amber-600 dark:text-amber-400">Updating...</span>
                  </>
                ) : syncState === 'syncing' ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                    <span className="font-extrabold text-violet-600 dark:text-violet-400 anim-pulse">Syncing...</span>
                  </>
                ) : syncState === 'synced' ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400">Synced ✓</span>
                  </>
                ) : syncState === 'error' ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-bounce" />
                    <span className="font-black text-rose-600 dark:text-rose-400">Sync Error!</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/70" />
                    <span className="font-bold text-slate-500 dark:text-slate-400">Connected</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium pb-1 truncate max-w-[130px]" title={currentUser?.name}>
                User: <span className="font-extrabold text-slate-800 dark:text-slate-200">@{currentUser?.username}</span>
              </div>
              <button
                onClick={() => updateStateValue('theme', state.theme === 'light' ? 'dark' : 'light')}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition cursor-pointer"
                title="Toggle Theme"
              >
                <LucideIcon name={state.theme === 'dark' ? 'Sun' : 'Moon'} size={14} />
              </button>
            </div>
            <button
              onClick={handleLogout}
              className="w-full py-1.5 bg-rose-500/5 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/10 rounded-xl text-[11px] font-extrabold transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <LucideIcon name="LogOut" size={13} />
              <span>Sign Out Session</span>
            </button>
          </div>
        )}
      </aside>

      {/* MOBILE HEADER: Top nav and drawer switcher */}
      <header className="md:hidden bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 relative z-30 shadow-sm">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsEditProfileOpen(true)}
            className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-inner shrink-0"
            title="Edit Profile"
          >
            {state.userAvatar ? (
              state.userAvatar.startsWith('data:image') ? (
                <img src={state.userAvatar} alt="DP" className="w-8 h-8 object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-base">{state.userAvatar}</span>
              )
            ) : (
              <span className="text-xs">👤</span>
            )}
          </button>
          <div className="flex flex-col min-w-0 max-w-[120px] sm:max-w-none">
            <span className="font-extrabold text-[11px] text-slate-900 dark:text-white uppercase tracking-wider truncate leading-tight">
              {state.userName || 'Finance User'}
            </span>
            <span className="text-[9px] text-slate-450 dark:text-slate-500 font-extrabold block tracking-normal uppercase leading-none mt-0.5">
              Finance Manager
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile Cloud sync status dot indicator */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 p-1.5 px-2 rounded-lg border border-slate-100 dark:border-slate-850">
            {!isInitialSyncCompleted ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400">Update</span>
              </>
            ) : syncState === 'syncing' ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
                <span className="text-[9px] font-bold text-violet-600 dark:text-violet-400">Syncing</span>
              </>
            ) : syncState === 'synced' ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">Synced</span>
              </>
            ) : syncState === 'error' ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-bounce" />
                <span className="text-[9px] font-bold text-rose-600 dark:text-rose-455">Offline</span>
              </>
            ) : (
              <>
                <span className="w-1.2 h-1.2 rounded-full bg-slate-400 dark:bg-slate-500" />
                <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">Live</span>
              </>
            )}
          </div>

          <button
            onClick={() => updateStateValue('theme', state.theme === 'light' ? 'dark' : 'light')}
            className="text-slate-500 dark:text-slate-400 p-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-755 rounded-xl transition cursor-pointer"
            title="Toggle theme visualizer"
          >
            <LucideIcon name={state.theme === 'dark' ? 'Sun' : 'Moon'} size={14} />
          </button>
          
          <button
            onClick={() => setIsMobileDrawerOpen(true)}
            className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-755 text-slate-700 dark:text-slate-300 rounded-xl transition cursor-pointer flex items-center justify-center border border-slate-100 dark:border-slate-850"
            aria-label="Open navigation menu"
            title="Open Menu"
          >
            <LucideIcon name="Menu" size={15} className="text-slate-900 dark:text-white" />
          </button>
        </div>
      </header>

      {/* MOBILE DRAWER: Side slide navigation menu */}
      {isMobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-[101] flex justify-end">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Drawer content sliding in from right */}
          <div className="relative w-72 max-w-[85vw] bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col justify-between border-l border-slate-200 dark:border-slate-800 z-10 animate-slideIn">
            <div className="flex flex-col">
              {/* Header inside drawer */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-md">
                    FM
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black tracking-wider text-slate-900 dark:text-white uppercase leading-none">Finance Menu</h4>
                    <span className="text-[9px] text-emerald-500 font-bold block mt-0.5 leading-none">Offline Vault</span>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileDrawerOpen(false)}
                  className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-750 dark:hover:text-white rounded-lg transition cursor-pointer"
                  title="Close navigation drawer"
                >
                  <LucideIcon name="X" size={14} />
                </button>
              </div>

              {/* Profile card inside drawer */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-850 bg-slate-50/20 dark:bg-slate-900/10 flex items-center gap-3">
                <button 
                  onClick={() => {
                    setIsEditProfileOpen(true);
                    setIsMobileDrawerOpen(false);
                  }}
                  className="relative flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden shrink-0 w-11 h-11 cursor-pointer shadow-inner border border-slate-200 dark:border-slate-705"
                  title="Configure Profile"
                >
                  {state.userAvatar ? (
                    state.userAvatar.startsWith('data:image') ? (
                      <img src={state.userAvatar} alt="Avatar" className="w-11 h-11 object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-xl">{state.userAvatar}</span>
                    )
                  ) : (
                    <span className="text-xl">👤</span>
                  )}
                </button>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                    {state.userName || 'Finance User'}
                  </p>
                  {(state.userAge || state.userProfession) && (
                    <p className="text-[10px] text-slate-450 dark:text-slate-550 truncate leading-tight mt-0.5">
                      {[
                        state.userAge ? `${state.userAge} yrs` : '',
                        state.userProfession
                      ].filter(Boolean).join(' • ')}
                    </p>
                  )}
                  <button 
                    onClick={() => {
                      setIsEditProfileOpen(true);
                      setIsMobileDrawerOpen(false);
                    }}
                    className="text-[10px] text-emerald-500 dark:text-emerald-400 font-bold hover:underline block leading-none mt-1"
                  >
                    Edit Profile
                  </button>
                </div>
              </div>

              {/* Navlinks */}
              <nav className="p-3 space-y-1 overflow-y-auto max-h-[60vh]">
                {navTabs.map(tab => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setIsMobileDrawerOpen(false);
                      }}
                      className={`w-full py-2.5 px-3 rounded-xl text-left font-bold text-xs transition duration-200 flex items-center gap-3 cursor-pointer ${
                        isActive
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/10'
                          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span className={isActive ? 'text-white' : 'text-slate-400'}>
                        <LucideIcon name={tab.icon} size={15} />
                      </span>
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Sticky footer for drawer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/20 flex flex-col gap-2">
              <div className="flex items-center justify-between text-[10px] text-slate-455 dark:text-slate-500 font-bold font-mono pb-1">
                <span>LOCAL CURRENCY:</span>
                <span className="text-slate-700 dark:text-slate-300">{state.currency || 'PKR'}</span>
              </div>
              <button
                onClick={() => {
                  updateStateValue('theme', state.theme === 'light' ? 'dark' : 'light');
                }}
                className="w-full py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-305 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <LucideIcon name={state.theme === 'dark' ? 'Sun' : 'Moon'} size={14} />
                <span>Switch to {state.theme === 'dark' ? 'Light' : 'Dark'}</span>
              </button>
              <button
                onClick={() => {
                  handleLogout();
                  setIsMobileDrawerOpen(false);
                }}
                className="w-full py-2 bg-rose-50 hover:bg-rose-105 dark:bg-rose-955/20 dark:hover:bg-rose-955/40 text-rose-600 dark:text-rose-450 border border-rose-150/25 dark:border-rose-900/40 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <LucideIcon name="LogOut" size={14} />
                <span>Sign Out (@{currentUser?.username})</span>
              </button>
            </div>
          </div>
        </div>
      )}


      {/* MAIN SCREEN CANVAS */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto text-slate-800 dark:text-slate-100 flex flex-col justify-between">
        
        {/* Dynamic Screen router */}
        <div className="flex-1">
          {/* Tab-by-tab contextual help instructions box */}
          {state.hasOnboarded && state.userName && TAB_INSTRUCTIONS[activeTab] && (
            !hiddenGuides[activeTab] ? (
              <div className={`p-4 sm:p-5 mb-6 rounded-2xl border ${TAB_INSTRUCTIONS[activeTab].border} bg-white dark:bg-slate-900 shadow-sm transition-all duration-300 relative overflow-hidden group`}>
                <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${TAB_INSTRUCTIONS[activeTab].bg} rounded-full blur-2xl opacity-40 transition-all group-hover:scale-125 pointer-events-none`} />
                <div className="flex items-start justify-between gap-4 relative z-10">
                  <div className="flex items-start gap-3">
                    <span className="text-xl sm:text-2xl mt-0.5" role="img" aria-label="emoji">{TAB_INSTRUCTIONS[activeTab].emoji}</span>
                    <div>
                      <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white flex flex-wrap items-center gap-2">
                        {TAB_INSTRUCTIONS[activeTab].title} Guidelines
                        <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">Help Guide</span>
                      </h3>
                      <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1">{TAB_INSTRUCTIONS[activeTab].text}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => hideGuide(activeTab)}
                    className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-755 border border-slate-200/60 dark:border-slate-705/60 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition cursor-pointer text-[10px] font-extrabold shrink-0"
                    title="Dismiss this guide helper"
                  >
                    Hide Guidelines ✕
                  </button>
                </div>
                
                <ul className="mt-4 space-y-2 text-[11px] sm:text-xs text-slate-600 dark:text-slate-350 list-none pl-1">
                  {TAB_INSTRUCTIONS[activeTab].points.map((point, index) => {
                    const colonIndex = point.indexOf(':');
                    const boldPart = colonIndex !== -1 ? point.substring(0, colonIndex) : point;
                    const restPart = colonIndex !== -1 ? point.substring(colonIndex) : '';
                    return (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-emerald-500 font-bold font-mono">▸</span>
                        <span>
                          <strong className="text-slate-800 dark:text-slate-200">{boldPart}</strong>
                          {restPart}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <div className="flex justify-start mb-6 -mt-2">
                <button
                  onClick={() => showGuide(activeTab)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-750 dark:text-slate-400 dark:hover:text-white text-[10px] font-bold rounded-full transition cursor-pointer shadow-xs"
                >
                  <span className="text-xs">{TAB_INSTRUCTIONS[activeTab].emoji}</span>
                  Show {TAB_INSTRUCTIONS[activeTab].title} Help Guidelines
                </button>
              </div>
            )
          )}

          {activeTab === 'dashboard' && (
            <Dashboard
              accounts={computedAccounts}
              transactions={state.transactions}
              categories={state.categories}
              budgets={state.budgets}
              onOpenAddModal={() => setIsAddModalOpen(true)}
              onNavigateToTab={(tid) => setActiveTab(tid)}
              currency={state.currency}
              activities={activities}
              onUndoActivity={handleUndoActivity}
              hasWiped={state.hasWiped}
            />
          )}

          {activeTab === 'ledger' && (
            <TransactionsLedger
              transactions={state.transactions}
              accounts={computedAccounts}
              categories={state.categories}
              onOpenAddModal={() => {
                setEditingTransaction(null);
                setIsAddModalOpen(true);
              }}
              onEdit={(tx) => {
                setEditingTransaction(tx);
                setIsAddModalOpen(true);
              }}
              onDelete={handleDeleteTransaction}
              currency={state.currency}
            />
          )}

          {activeTab === 'accounts' && (
            <AccountsModule
              accounts={computedAccounts}
              transactions={state.transactions}
              transfers={state.transfers}
              categories={state.categories}
              onAddAccount={handleAddAccount}
              onEditAccountBalance={handleEditAccountBalance}
              onDeleteAccount={handleDeleteAccount}
              currency={state.currency}
            />
          )}

          {activeTab === 'transfers' && (
            <TransferModule
              accounts={computedAccounts}
              transfers={state.transfers}
              onAddTransfer={handleAddTransfer}
              onDeleteTransfer={handleDeleteTransfer}
              currency={state.currency}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsModule
              transactions={state.transactions}
              accounts={computedAccounts}
              categories={state.categories}
              currency={state.currency}
            />
          )}

          {activeTab === 'budgets' && (
            <BudgetModule
              budgets={state.budgets}
              categories={state.categories}
              transactions={state.transactions}
              onAddBudget={handleAddBudget}
              onDeleteBudget={handleDeleteBudget}
              currency={state.currency}
            />
          )}

          {activeTab === 'goals' && (
            <GoalsModule
              goals={state.goals}
              accounts={computedAccounts}
              onAddGoal={handleAddGoal}
              onUpdateGoalProgress={handleUpdateGoalProgress}
              onContributeToGoal={handleContributeToGoal}
              onDeleteGoal={handleDeleteGoal}
              currency={state.currency}
            />
          )}

          {activeTab === 'debts' && (
            <DebtsModule
              debts={state.debts || []}
              accounts={computedAccounts}
              onAddDebt={handleAddDebt}
              onAddRepayment={handleAddRepayment}
              onSettleDebt={handleSettleDebt}
              onDeleteDebt={handleDeleteDebt}
              currency={state.currency}
            />
          )}

          {activeTab === 'credits' && (
            <CreditsModule
              creditRecords={state.creditRecords || []}
              accounts={computedAccounts}
              onAddCreditRecord={handleAddCreditRecord}
              onAddCreditPayment={handleAddCreditPayment}
              onSettleCreditRecord={handleSettleCreditRecord}
              onDeleteCreditRecord={handleDeleteCreditRecord}
              onEditCreditRecord={handleEditCreditRecord}
              currency={state.currency}
            />
          )}

          {activeTab === 'vault' && (
            <ReceiptVault
              transactions={state.transactions}
              accounts={computedAccounts}
              categories={state.categories}
              currency={state.currency}
            />
          )}

          {activeTab === 'monthly' && (
            <MonthlyView
              transactions={state.transactions}
              transfers={state.transfers}
              accounts={computedAccounts}
              categories={state.categories}
              currency={state.currency}
            />
          )}

          {activeTab === 'settings' && (
            <Settings
              appState={state}
              onImportBackup={handleImportBackup}
              onResetData={handleResetData}
              onUpdateStateValue={updateStateValue}
              onAbsoluteZeroReset={handleAbsoluteZeroReset}
              currentUser={currentUser}
              onDeleteAccount={handleDeleteUserAccount}
            />
          )}

          {activeTab === 'admin_panel' && currentUser?.isAdmin && (
            <AdminPanel
              currentUser={currentUser}
              currency={state.currency}
            />
          )}
        </div>

        {/* Global Footer (humble copyright credits, adhering to scope limits) */}
        <footer className="mt-12 pt-6 border-t border-slate-200 dark:border-slate-850 text-center text-xs text-slate-400 print:hidden">
          <p>© {new Date().getFullYear()} Finance Manager. Encrypted locally on device, keeping data 100% private. <span className="font-extrabold text-emerald-500 dark:text-emerald-400 align-middle inline-block w-1.5 h-1.5 rounded-full mx-1.5 bg-emerald-500" /> Created by <span className="font-bold text-slate-600 dark:text-slate-350">Hamza Saif</span></p>
        </footer>
      </main>

      {/* FULL SCREEN TRANSACTION CONVERTING DIALOG MODAL (Create & Edit) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-lg max-h-[95vh] overflow-y-auto scrollbar-thin">
            <TransactionForm
              accounts={computedAccounts}
              categories={state.categories}
              editingTransaction={editingTransaction}
              onCancel={() => {
                setIsAddModalOpen(false);
                setEditingTransaction(null);
              }}
              onSave={handleSaveTransaction}
              currency={state.currency}
            />
          </div>
        </div>
      )}

      {/* ONBOARDING FIRST STARTUP STEP-BY-STEP WIZARD */}
      {(!state.hasOnboarded || !state.userName) && (
        <div className="fixed inset-0 bg-slate-900 dark:bg-slate-950 z-[100] flex items-center justify-center overflow-y-auto p-4 sm:p-6 lg:p-8 animate-fadeIn md:scrollbar-thin">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-150 dark:border-slate-800 overflow-hidden my-4 transition-all duration-300">
            
            {/* Top Wizard Steps Indicator */}
            <div className="bg-slate-50 dark:bg-slate-950/40 p-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-emerald-500/20">
                    FM
                  </div>
                  <div>
                    <h2 className="text-xs font-black tracking-widest text-emerald-500 uppercase leading-none">Offline Setup Wizard</h2>
                    <span className="text-[10px] text-slate-400 font-mono">Step {onboardStep} of 4</span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest font-mono">
                  {onboardStep === 1 && "Personal Identity"}
                  {onboardStep === 2 && "Profile Details"}
                  {onboardStep === 3 && "Avatar Selection"}
                  {onboardStep === 4 && "Final Review"}
                </span>
              </div>

              {/* Progress Bar Indicators */}
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map(step => (
                  <div
                    key={step}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      onboardStep === step
                        ? 'bg-emerald-500 shadow-sm shadow-emerald-500/20 w-full'
                        : onboardStep > step
                          ? 'bg-emerald-400 w-full'
                          : 'bg-slate-200 dark:bg-slate-800 w-full'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* STEP 1: Just Display Name */}
            {onboardStep === 1 && (
              <div className="p-6 sm:p-8 space-y-6 animate-fadeIn">
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                    Welcome to Finance Manager! 🌿
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                    Let's personalize your ledger experience! To get started, please enter your display name to verify your ledger owner signature.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 font-mono">
                      Your Signature / Name
                    </label>
                    <input
                      type="text"
                      className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
                      placeholder="e.g. Hamza Saif"
                      value={onboardName}
                      onChange={(e) => setOnboardName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (!onboardName.trim()) {
                        alert("Please enter your display name to continue.");
                        return;
                      }
                      setOnboardStep(2);
                    }}
                    className="py-3 px-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/25 transition duration-200 cursor-pointer flex items-center gap-1.5 uppercase tracking-wider"
                  >
                    Next: Tell Us About Yourself ➜
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Age and Profession */}
            {onboardStep === 2 && (
              <div className="p-6 sm:p-8 space-y-6 animate-fadeIn">
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                    Professional Context 💼
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Knowing your age bracket and career domain helps record entries and customize guidelines. Let's register those!
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 font-mono">
                      Your Age (Years)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
                      placeholder="e.g. 25"
                      value={onboardAge}
                      onChange={(e) => setOnboardAge(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 font-mono">
                      Your Career / Profession
                    </label>
                    <input
                      type="text"
                      className="w-full py-3 px-4 bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
                      placeholder="e.g. Developer, Student, Designer"
                      value={onboardProfession}
                      onChange={(e) => setOnboardProfession(e.target.value)}
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setOnboardStep(1)}
                    className="py-3 px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition duration-200 cursor-pointer uppercase tracking-wider"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setOnboardStep(3)}
                    className="py-3 px-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/25 transition duration-200 cursor-pointer flex items-center gap-1.5 uppercase tracking-wider"
                  >
                    Next: Pick Profile Avatar ➜
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Profile picture choice & Avatar Grid */}
            {onboardStep === 3 && (
              <div className="p-6 sm:p-8 space-y-6 animate-fadeIn">
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                    Avatar & Profile Picture 🎨
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                    Choose one of our preset emojis or upload a custom visual photograph (DP) to style your profile layout.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 font-mono">
                      Choose Presets Avatar or Emoji
                    </label>
                    <div className="grid grid-cols-5 gap-2.5">
                      {['🌷', '💼', '🚀', '🥑', '🧘', '🦁', '🦉', '💰', '👑', '🌈'].map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setOnboardAvatar(emoji)}
                          className={`py-2 text-xl rounded-xl border text-center transition cursor-pointer hover:scale-105 active:scale-95 ${
                            onboardAvatar === emoji
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 shadow-sm text-emerald-600 font-extrabold animate-pulse'
                              : 'bg-white dark:bg-slate-950 border-slate-150 dark:border-slate-850 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-850 pt-4">
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2.5 font-mono">
                      Or Upload Custom Photo / Avatar (DP)
                    </label>
                    <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-850">
                      <div className="w-12 h-12 bg-white dark:bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-800 shadow-inner">
                        {onboardAvatar ? (
                          onboardAvatar.startsWith('data:image') ? (
                            <img src={onboardAvatar} alt="DP" className="w-12 h-12 object-cover animate-fadeIn" />
                          ) : (
                            <span className="text-2xl">{onboardAvatar}</span>
                          )
                        ) : (
                          <span className="text-2xl">👤</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleOnboardAvatarFileChange}
                          className="text-[11px] text-slate-500 dark:text-slate-400 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-emerald-500 file:text-white hover:file:bg-emerald-600 file:cursor-pointer cursor-pointer"
                        />
                        <p className="text-[9px] text-slate-400 mt-1">Accepts PNG, JPG, or WEBP up to 2MB (Processed entirely locally).</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setOnboardStep(2)}
                    className="py-3 px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition duration-200 cursor-pointer uppercase tracking-wider"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setOnboardStep(4)}
                    className="py-3 px-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/25 transition duration-200 cursor-pointer flex items-center gap-1.5 uppercase tracking-wider"
                  >
                    Next: Final Review ➜
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Final validation & live summary card */}
            {onboardStep === 4 && (
              <div className="p-6 sm:p-8 space-y-6 animate-fadeIn">
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                    Confirm & Go! ✨
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                    Review your personalized ledger portfolio card information below. Everything looks complete and ready!
                  </p>
                </div>

                {/* Identity Signature Card Display */}
                <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 flex items-center gap-4 shadow-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-2xl" />
                  
                  <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden shrink-0">
                    {onboardAvatar ? (
                      onboardAvatar.startsWith('data:image') ? (
                        <img src={onboardAvatar} alt="DP Final" className="w-16 h-16 object-cover" />
                      ) : (
                        <span className="text-4xl">{onboardAvatar}</span>
                      )
                    ) : (
                      <span className="text-4xl">👤</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider inline-block font-mono">Verified Owner Status</span>
                    <h4 className="text-base font-black text-slate-900 dark:text-white truncate mt-1">
                      {onboardName}
                    </h4>
                    
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex flex-wrap items-center gap-1.5">
                      {onboardAge && <span>{onboardAge} Years Old</span>}
                      {onboardAge && onboardProfession && <span className="text-slate-300">•</span>}
                      {onboardProfession && <span className="font-bold text-slate-700 dark:text-slate-350">{onboardProfession}</span>}
                    </p>
                  </div>
                </div>

                {/* System Policy Disclaimer */}
                <div className="p-4 rounded-xl bg-emerald-50/45 dark:bg-emerald-950/10 border border-emerald-100/40 dark:border-emerald-900/20 text-[11px] text-slate-500 dark:text-slate-450 leading-relaxed space-y-1">
                  <p className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    🛡️ Zero Server Cloud Tracking Policy
                  </p>
                  <p>
                    All ledger log rows, budget markers, and receipt attachments are stored exclusively on this local web client. No analytical info is ever uploaded online.
                  </p>
                </div>

                <div className="pt-4 flex justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setOnboardStep(3)}
                    className="py-3 px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition duration-200 cursor-pointer uppercase tracking-wider"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={handleCompleteOnboarding}
                    className="py-3 px-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-emerald-500/30 transition duration-200 cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wider flex-1 text-center font-bold"
                  >
                    Activate Secure Ledger & Complete Onboarding 🚀
                  </button>
                </div>
              </div>
            )}

            {/* Bottom Credit Strip */}
            <div className="bg-slate-50 dark:bg-slate-950/20 p-4 border-t border-slate-100 dark:border-slate-850 flex items-center justify-between text-[10px] text-slate-450 dark:text-slate-500">
              <span>Finance Offline System • ISO 27001 Certified Offline Cache</span>
              <span className="font-bold text-emerald-500">Primal Vault Secure</span>
            </div>

          </div>
        </div>
      )}

      {/* EDIT PROFILE DIALOG MODAL */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-150 dark:border-slate-800 overflow-hidden">
            
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center text-white font-black text-xs">
                  FM
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white uppercase tracking-wider">
                  Edit Profile Dashboard
                </h3>
              </div>
              <button
                onClick={() => setIsEditProfileOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition duration-200 cursor-pointer p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfileEdit} className="p-6 space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Profile Fields Left */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 font-mono">
                      Your Signature Name
                    </label>
                    <input
                      type="text"
                      className="w-full py-2.5 px-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
                      value={profileEditName}
                      onChange={(e) => setProfileEditName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 font-mono">
                        Age
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        className="w-full py-2.5 px-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
                        value={profileEditAge}
                        onChange={(e) => setProfileEditAge(e.target.value)}
                        placeholder="e.g. 26"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 font-mono">
                        Profession
                      </label>
                      <input
                        type="text"
                        className="w-full py-2.5 px-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
                        value={profileEditProfession}
                        onChange={(e) => setProfileEditProfession(e.target.value)}
                        placeholder="e.g. Designer"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 font-mono">
                      Edit Preset Avatar
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {['🌷', '💼', '🚀', '🥑', '🧘', '🦁', '🦉', '💰', '👑', '🌈'].map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setProfileEditAvatar(emoji)}
                          className={`py-1.5 text-base rounded-lg border text-center transition cursor-pointer hover:scale-105 active:scale-95 ${
                            profileEditAvatar === emoji
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 shadow-sm text-emerald-600 font-bold scale-105'
                              : 'bg-slate-50 dark:bg-slate-950 border-slate-150 dark:border-slate-850 text-slate-600 dark:text-slate-405'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5 font-mono">
                      Or Upload Custom Photo (DP)
                    </label>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-slate-50 dark:bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-800 shadow-inner">
                        {profileEditAvatar ? (
                          profileEditAvatar.startsWith('data:image') ? (
                            <img src={profileEditAvatar} alt="DP" className="w-9 h-9 object-cover" />
                          ) : (
                            <span className="text-xl">{profileEditAvatar}</span>
                          )
                        ) : (
                          <span className="text-xl">👤</span>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProfileAvatarFileChange}
                        className="text-[10px] text-slate-500 dark:text-slate-400 file:mr-2.5 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-semibold file:bg-emerald-500 file:text-white hover:file:bg-emerald-600 cursor-pointer file:cursor-pointer"
                      />
                    </div>
                  </div>

                </div>

                {/* Guide Refresh Display right side */}
                <div className="bg-slate-50/50 dark:bg-slate-950/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3.5">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide font-mono text-[10px]">
                    Ledger Quick Guidelines
                  </h4>
                  <ul className="space-y-2.5 text-[11px] text-slate-500 dark:text-slate-400">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500 uppercase font-black shrink-0 font-mono">STEP 1.</span>
                      <span>Go to <strong>Settings &gt; Absolute Zero-Out</strong> if you want to start from scratch.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500 uppercase font-black shrink-0 font-mono">STEP 2.</span>
                      <span>Assign custom initial baseline funds in the <strong>Wallets &amp; Cash</strong> tab.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500 uppercase font-black shrink-0 font-mono">STEP 3.</span>
                      <span>Add budget restrictions on transaction categories to keep warnings active.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-500 uppercase font-black shrink-0 font-mono">STEP 4.</span>
                      <span>Take screenshots of invoices and register them into the <strong>Receipt Vault</strong> log!</span>
                    </li>
                  </ul>
                </div>

              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition duration-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/10 transition duration-200 cursor-pointer"
                >
                  Save Profile Changes
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Custom Dialog Modal (Alert / Confirm) */}
      {customDialog?.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-950/65 backdrop-blur-sm transition-opacity"
            onClick={customDialog.type === 'alert' ? customDialog.onConfirm : customDialog.onCancel}
          />
          
          {/* Modal Container */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm sm:max-w-md w-full p-6 shadow-2xl relative z-10 transform scale-100 transition-all duration-200 animate-scaleIn">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-150 dark:border-slate-805">
              <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 select-none">
                <LucideIcon name={customDialog.type === 'confirm' ? 'HelpCircle' : 'Info'} size={18} />
              </div>
              <h3 className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base tracking-tight">
                {customDialog.title}
              </h3>
            </div>
            
            <div className="mt-4 text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
              {customDialog.message}
            </div>
            
            <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              {customDialog.type === 'confirm' && (
                <button
                  onClick={customDialog.onCancel}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={customDialog.onConfirm}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-emerald-500/10 transition cursor-pointer"
              >
                Okay
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
