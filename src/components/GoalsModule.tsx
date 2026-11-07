/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Goal, Account } from '../types';
import { formatPKR } from '../utils/financeHelpers';
import LucideIcon from './LucideIcon';
import CustomSelect from './CustomSelect';

interface GoalsModuleProps {
  goals: Goal[];
  accounts: Account[];
  onAddGoal: (name: string, targetAmount: number, initialSaved?: number) => void;
  onUpdateGoalProgress: (goalId: string, savedAmount: number) => void;
  onContributeToGoal: (goalId: string, accountId: string, amount: number) => void;
  onDeleteGoal: (goalId: string) => void;
  currency: string;
}

export default function GoalsModule({
  goals,
  accounts,
  onAddGoal,
  onUpdateGoalProgress,
  onContributeToGoal,
  onDeleteGoal,
  currency
}: GoalsModuleProps) {
  const [goalName, setGoalName] = useState('');
  const [targetStr, setTargetStr] = useState('');
  const [initialSavedStr, setInitialSavedStr] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Save distribution quick state
  const [selectedGoalId, setSelectedGoalId] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [contribAmountStr, setContribAmountStr] = useState('');
  const [contribError, setContribError] = useState('');

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!goalName.trim()) {
      setErrorMsg('Please specify a Goal Name');
      return;
    }

    const target = parseFloat(targetStr);
    if (isNaN(target) || target <= 0) {
      setErrorMsg('Please enter a valid target amount greater than 0');
      return;
    }

    const initial = parseFloat(initialSavedStr) || 0;
    if (initial < 0) {
      setErrorMsg('Initial saved amount cannot be negative');
      return;
    }

    if (initial > target) {
      setErrorMsg('Initial saved amount cannot exceed target budget');
      return;
    }

    onAddGoal(goalName, target, initial);
    setGoalName('');
    setTargetStr('');
    setInitialSavedStr('');
  };

  const handleContribute = (e: React.FormEvent) => {
    e.preventDefault();
    setContribError('');

    if (!selectedGoalId) {
      setContribError('Select a goal first');
      return;
    }
    if (!selectedAccountId) {
      setContribError('Select a source account');
      return;
    }

    const amount = parseFloat(contribAmountStr);
    if (isNaN(amount) || amount <= 0) {
      setContribError('Enter a valid contribution amount');
      return;
    }

    const acc = accounts.find(a => a.id === selectedAccountId);
    if (!acc) {
      setContribError('Invalid source account selected');
      return;
    }

    if (acc.balance < amount) {
      setContribError(`Insufficient balance inside ${acc.name} (${formatPKR(acc.balance, currency)})`);
      return;
    }

    const goal = goals.find(g => g.id === selectedGoalId);
    if (!goal) {
      setContribError('Goal not found');
      return;
    }

    const remainingToSave = goal.targetAmount - goal.savedAmount;
    if (amount > remainingToSave) {
      setContribError(`Contribution exceeds remaining target. Max contribution: ${formatPKR(remainingToSave, currency)}`);
      return;
    }

    onContributeToGoal(selectedGoalId, selectedAccountId, amount);
    
    // Clear contribution form inputs
    setSelectedGoalId('');
    setSelectedAccountId('');
    setContribAmountStr('');
    window.showAlert?.('Fund contributed successfully: deducted from account and credited to goal!');
  };

  return (
    <div className="space-y-6">
      
      {/* Overview and Contribute banner */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Goals Progress Bars list */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-950 dark:text-white flex items-center gap-2">
              <LucideIcon name="Target" className="text-emerald-500 animate-bounce" />
              Savings & Purchase Goals
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Visualize your progress towards luxury items, property upgrades, emergency funds, or vehicles.
            </p>

            {goals.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <LucideIcon name="Compass" className="text-slate-400" size={28} />
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white text-base">No active goals found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Create a new financial milestone in the sidebar and contribute funds towards it directly from your cash or digital accounts!
                </p>
              </div>
            ) : (
              <div className="space-y-6 mt-6">
                {goals.map(goal => {
                  const percentage = Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100));
                  const isCompleted = goal.savedAmount >= goal.targetAmount;
                  const remaining = Math.max(0, goal.targetAmount - goal.savedAmount);

                  return (
                    <div 
                      key={goal.id} 
                      className={`p-5 rounded-2xl border transition-all ${
                        isCompleted 
                          ? 'bg-emerald-500/10 border-emerald-500/30' 
                          : 'bg-slate-50/50 dark:bg-slate-850/50 border-slate-100 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            isCompleted ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-750'
                          }`}>
                            <LucideIcon name={isCompleted ? 'CheckCircle' : 'Award'} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                                {goal.name}
                              </h4>
                              {isCompleted && (
                                <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                                  Goal Achieved!
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-400 block mt-0.5">
                              Created: {new Date(goal.dateCreated).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'})}
                            </span>
                          </div>
                        </div>

                        {/* Quick detail panel */}
                        <div className="text-right sm:text-right flex sm:flex-col justify-between items-center sm:items-end border-t sm:border-t-0 border-slate-100 dark:border-slate-800 pt-3 sm:pt-0">
                          <div className="text-xs text-slate-500">
                            Target: <span className="font-semibold text-slate-850 dark:text-slate-205">{formatPKR(goal.targetAmount, currency)}</span>
                          </div>
                          <div className="text-xs text-emerald-500 font-semibold mt-0.5">
                            Saved: {formatPKR(goal.savedAmount, currency)}
                          </div>
                        </div>
                      </div>

                      {/* Progress line */}
                      <div className="mt-4">
                        <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
                          <span>Progress: {percentage}%</span>
                          {!isCompleted && (
                            <span>{formatPKR(remaining, currency)} left</span>
                          )}
                        </div>
                        <div className="h-3 bg-slate-150 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-700 ${
                              isCompleted ? 'bg-emerald-500' : 'bg-emerald-400'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>

                      {/* Action tools */}
                      <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                        {/* Adjust saved amount input optionally */}
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400">Direct Edit (PKR):</span>
                          <input
                            type="number"
                            className="bg-white dark:bg-slate-900 border-0 rounded px-2 py-0.5 text-xs text-slate-800 dark:text-white w-24 focus:ring-1 focus:ring-emerald-500"
                            placeholder="Saved val..."
                            defaultValue={goal.savedAmount}
                            onBlur={(e) => {
                              const v = parseFloat(e.target.value);
                              if (!isNaN(v) && v >= 0 && v <= goal.targetAmount) {
                                onUpdateGoalProgress(goal.id, v);
                              } else {
                                e.target.value = goal.savedAmount.toString();
                              }
                            }}
                          />
                        </div>

                        <button
                          onClick={() => {
                            window.showConfirm?.(
                              `Are you sure you want to delete the goal "${goal.name}"?`,
                              () => {
                                onDeleteGoal(goal.id);
                              }
                            );
                          }}
                          className="text-xs text-slate-400 hover:text-rose-500 dark:text-slate-500 hover:dark:text-rose-400 flex items-center gap-1 cursor-pointer"
                        >
                          <LucideIcon name="Trash2" size={12} />
                          Delete Goal
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Goal Set and Quick Fund panels */}
        <div className="space-y-6">
          
          {/* Create Goal Form */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
            <h3 className="font-semibold text-slate-900 dark:text-white text-base flex items-center gap-1.5">
              <LucideIcon name="Rocket" className="text-emerald-500" />
              Formulate New Goal
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Define are target item and set a timeline threshold.</p>

            <form onSubmit={handleCreateGoal} className="mt-4 space-y-3">
              {errorMsg && (
                <div className="bg-rose-50 border border-rose-100 dark:bg-rose-950/25 dark:border-rose-900 text-rose-600 p-2.5 rounded-lg text-xs flex items-center gap-1">
                  <LucideIcon name="AlertCircle" size={14} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Goal Name</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 dark:bg-slate-850 border-0 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g. New iPhone 16"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Target Cost Amount ({currency})</label>
                <input
                  type="number"
                  className="w-full bg-slate-50 dark:bg-slate-850 border-0 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g. 150000"
                  value={targetStr}
                  onChange={(e) => setTargetStr(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Pre-saved Balance (Optional)</label>
                <input
                  type="number"
                  className="w-full bg-slate-50 dark:bg-slate-850 border-0 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g. 20000"
                  value={initialSavedStr}
                  onChange={(e) => setInitialSavedStr(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <LucideIcon name="Plus" size={14} />
                Create Goal
              </button>
            </form>
          </div>

          {/* Quick Fund Contribution form */}
          {goals.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
              <h3 className="font-semibold text-slate-900 dark:text-white text-base flex items-center gap-1.5">
                <LucideIcon name="TrendingUp" className="text-emerald-500" />
                Contribute Savings Fund
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Shift available account balance directly towards any savings milestone.</p>

              <form onSubmit={handleContribute} className="mt-4 space-y-3">
                {contribError && (
                  <div className="bg-rose-50 border border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/30 text-rose-600 dark:text-rose-450 p-2.5 rounded-lg text-xs flex items-center gap-1">
                    <LucideIcon name="AlertCircle" size={14} />
                    <span>{contribError}</span>
                  </div>
                )}

                 {/* Target goal dropdown */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Target Saving Goal</label>
                  <CustomSelect
                    options={goals.filter(g => g.savedAmount < g.targetAmount).map(goal => ({
                      value: goal.id,
                      label: `${goal.name} (Need ${formatPKR(goal.targetAmount - goal.savedAmount, currency)})`,
                      icon: 'Target'
                    }))}
                    value={selectedGoalId}
                    onChange={(val) => setSelectedGoalId(val)}
                    placeholder="-- Choose Milestone Goal --"
                  />
                </div>

                {/* Source Account dropdown */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Source Balance Account</label>
                  <CustomSelect
                    options={accounts.map(acc => ({
                      value: acc.id,
                      label: `${acc.name} (${formatPKR(acc.balance, currency)})`,
                      icon: acc.icon || (acc.type === 'cash' ? 'Wallet' : 'CreditCard')
                    }))}
                    value={selectedAccountId}
                    onChange={(val) => setSelectedAccountId(val)}
                    placeholder="-- Choose Loaded Account --"
                  />
                </div>

                {/* Amount to distribute */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Transfer Amount ({currency})</label>
                  <input
                    type="number"
                    className="w-full bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white border-0 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. 5000"
                    value={contribAmountStr}
                    onChange={(e) => setContribAmountStr(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <LucideIcon name="Send" size={14} />
                  Authorize Contribution
                </button>
              </form>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
