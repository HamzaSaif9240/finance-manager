import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import LucideIcon from './LucideIcon';

export interface SelectOption {
  value: string;
  label: string;
  icon?: string;
}

interface CustomSelectProps {
  id?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function CustomSelect({
  id,
  options,
  value,
  onChange,
  placeholder = 'Select option...',
  className = '',
  disabled = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close dropdown when clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div id={id} className={`relative ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between py-2 px-3 rounded-xl text-xs font-semibold shadow-sm focus:outline-none transition-all duration-250 min-h-[38px] text-left select-none ${
          disabled 
            ? 'bg-slate-100 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/80 text-slate-450 dark:text-slate-500 opacity-70 pointer-events-none cursor-not-allowed'
            : 'bg-slate-50 dark:bg-slate-950/60 border border-slate-200 hover:border-violet-400 dark:border-slate-800 dark:hover:border-violet-400 text-slate-800 dark:text-slate-100 cursor-pointer'
        }`}
      >
        <span className="flex items-center gap-2 truncate">
          {selectedOption?.icon && (
            <div className="w-5 h-5 rounded-lg bg-slate-200/50 dark:bg-slate-800/50 flex items-center justify-center shrink-0">
              <LucideIcon name={selectedOption.icon} size={11} className="text-violet-500 dark:text-violet-400" />
            </div>
          )}
          <span className="truncate">
            {selectedOption ? selectedOption.label : <span className="text-slate-400 dark:text-slate-600">{placeholder}</span>}
          </span>
        </span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="text-violet-500 dark:text-violet-400 shrink-0 select-none ml-2"
        >
          <LucideIcon name="ChevronDown" size={14} />
        </motion.div>
      </button>

      {/* Options Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 7, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute z-[99] mt-1.5 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl max-h-60 overflow-y-auto overflow-x-hidden p-1.5 scrollbar-thin scrollbar-thumb-slate-350 select-none leading-none"
          >
            {options.length === 0 ? (
              <div className="py-3 px-4 text-center text-xs text-slate-400 font-medium">
                No items available
              </div>
            ) : (
              options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-xs font-semibold select-none cursor-pointer group transition-all relative ${
                      isSelected
                        ? 'bg-violet-500 text-white shadow-md shadow-violet-500/10'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {opt.icon && (
                      <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                        isSelected 
                          ? 'bg-white/20 text-white' 
                          : 'bg-slate-100 dark:bg-slate-800 text-violet-500 dark:text-violet-400 group-hover:bg-violet-500/10 group-hover:dark:bg-violet-400/10'
                      }`}>
                        <LucideIcon name={opt.icon} size={11} className={isSelected ? 'text-white' : ''} />
                      </div>
                    )}
                    <span className="truncate flex-1">{opt.label}</span>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="text-white shrink-0 ml-1.5"
                      >
                        <LucideIcon name="Check" size={13} />
                      </motion.div>
                    )}
                  </button>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
