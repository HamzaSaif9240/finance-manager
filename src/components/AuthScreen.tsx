import React, { useState, useEffect } from 'react';
import LucideIcon from './LucideIcon';
import { getOnlineUser, registerOnlineUser } from '../lib/firebase';

export interface RegisteredUser {
  id: string;
  username: string; // unique, lowercase
  passwordHash: string; // simple clear-text (securely stored)
  name: string;
  createdAt: string;
  isAdmin?: boolean;
  isSuper?: boolean;
}

interface AuthScreenProps {
  onLoginSuccess: (user: RegisteredUser) => void;
  theme: 'light' | 'dark';
}

// Global Super Admin Details as requested by the user
export const SUPER_ADMIN: RegisteredUser = {
  id: 'super_admin_hamza',
  username: 'ihamzasaif',
  passwordHash: 'Hamza@finance123',
  name: 'Hamza Saif',
  createdAt: '2026-06-01T00:00:00Z',
  isAdmin: true,
  isSuper: true,
};

export default function AuthScreen({ onLoginSuccess, theme }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Initialize and ensure default super admin credentials exist in online database
  useEffect(() => {
    async function checkSuperAdmin() {
      try {
        const found = await getOnlineUser(SUPER_ADMIN.username);
        // If super admin does not exist, pre-register online
        if (!found) {
          await registerOnlineUser(SUPER_ADMIN);
        }
      } catch (e) {
        console.error('Failed to pre-register super admin online', e);
      }
    }
    checkSuperAdmin();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setSuccess('');

    const trimmedUsername = username.trim().toLowerCase();
    const cleanPassword = password;

    if (!trimmedUsername || !cleanPassword) {
      setError('Please fill out all credentials.');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        // HANDLE ONLINE SIGN IN
        const foundUser = await getOnlineUser(trimmedUsername);
        
        if (!foundUser) {
          setError('Username record not found in online database. Please register first!');
          setLoading(false);
          return;
        }

        if (foundUser.passwordHash !== cleanPassword) {
          setError('Incorrect security password code. Try again!');
          setLoading(false);
          return;
        }

        // Successful login
        setSuccess(`Welcome back, ${foundUser.name}!`);
        setTimeout(() => {
          onLoginSuccess(foundUser);
        }, 750);

      } else {
        // HANDLE ONLINE SIGN UP / REGISTRATION
        if (!name.trim()) {
          setError('Please enter your full name.');
          setLoading(false);
          return;
        }

        if (trimmedUsername.length < 3) {
          setError('Username must be at least 3 characters.');
          setLoading(false);
          return;
        }

        if (cleanPassword.length < 4) {
          setError('Password must be at least 4 characters for security.');
          setLoading(false);
          return;
        }

        // Validate uniqueness online
        const userExists = await getOnlineUser(trimmedUsername);
        if (userExists) {
          setError('This username is already registered. Try logging in!');
          setLoading(false);
          return;
        }

        // Create new user profile
        const newUser: RegisteredUser = {
          id: `user_${Date.now()}`,
          username: trimmedUsername,
          passwordHash: cleanPassword,
          name: name.trim(),
          createdAt: new Date().toISOString(),
          isAdmin: false,
        };

        await registerOnlineUser(newUser);

        setSuccess('Registration successful! Secure session activated...');
        setTimeout(() => {
          onLoginSuccess(newUser);
        }, 800);
      }
    } catch (err: any) {
      setError('Connection failure: ' + (err.message || err));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-955 flex flex-col justify-center items-center p-4 selection:bg-violet-500 selection:text-white transition-colors duration-300">
      {/* Decorative Blur Spots */}
      <div className="absolute top-[10%] left-[15%] w-72 h-72 bg-violet-400/10 dark:bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[10%] right-[15%] w-80 h-80 bg-emerald-400/10 dark:bg-emerald-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl relative z-10 transition-colors duration-300">
        
        {/* Brand Header */}
        <div className="text-center space-y-2 mb-6 select-none">
          <div className="mx-auto w-12 h-12 bg-gradient-to-tr from-violet-600 to-indigo-500 text-white rounded-2xl flex items-center justify-center font-black shadow-lg shadow-violet-500/20 select-none scale-100">
            <LucideIcon name="Cloud" size={24} className="animate-pulse" />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Finance Manager
          </h2>
          <p className="text-[10px] text-slate-450 dark:text-slate-500 font-mono tracking-widest uppercase leading-none">
            Online Cloud Sync Ledger
          </p>
        </div>

        {/* Error/Success alerts */}
        {error && (
          <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-150 dark:border-rose-900/50 rounded-xl text-rose-600 dark:text-rose-450 text-[11px] font-semibold flex items-start gap-2 animate-pulse">
            <LucideIcon name="AlertCircle" size={14} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-150 dark:border-emerald-900/50 rounded-xl text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold flex items-start gap-2">
            <LucideIcon name="CheckCircle" size={14} className="shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block uppercase pl-1">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
                  <LucideIcon name="User" size={14} />
                </div>
                <input
                  type="text"
                  required
                  disabled={loading}
                  placeholder="e.g. Hamza Saif"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 shadow-inner disabled:opacity-50"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block uppercase pl-1">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
                <LucideIcon name="AtSign" size={14} />
              </div>
              <input
                type="text"
                required
                disabled={loading}
                autoCapitalize="none"
                placeholder="e.g. ihamzasaif"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 shadow-inner disabled:opacity-50"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block uppercase pl-1">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center text-slate-400 pointer-events-none">
                <LucideIcon name="Lock" size={14} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                disabled={loading}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 shadow-inner disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-650 transition cursor-pointer"
              >
                <LucideIcon name={showPassword ? "EyeOff" : "Eye"} size={14} />
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-violet-500/10 cursor-pointer mt-2 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading && <LucideIcon name="Loader" size={14} className="animate-spin" />}
            {isLogin ? 'Sign In Securely' : 'Create Free Account'}
          </button>
        </form>

        {/* Toggle Switch */}
        <div className="mt-5 text-center leading-none">
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setSuccess('');
            }}
            className="text-[11px] font-bold text-slate-450 hover:text-violet-600 dark:text-slate-500 dark:hover:text-violet-400 underline transition cursor-pointer disabled:opacity-50"
          >
            {isLogin ? "Don't have an account? Sign Up free!" : "Already have an account? Sign In!"}
          </button>
        </div>

        {/* Informative Note for Cordova/Capacitor WebView */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-start gap-2 text-[10px] text-slate-400 leading-normal select-none">
          <LucideIcon name="Shield" size={12} className="shrink-0 text-violet-500 mt-0.5" />
          <span>
            <strong>Online Cloud Protection:</strong> Passwords and ledger balances are synced dynamically to your private cloud storage. Access your account from any device immediately.
          </span>
        </div>

      </div>
    </div>
  );
}
