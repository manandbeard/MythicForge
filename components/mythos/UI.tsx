'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { motion, HTMLMotionProps } from 'framer-motion';

interface MythosPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'glass' | 'deep';
  glow?: boolean;
}

export const MythosPanel = ({ 
  children, 
  className, 
  variant = 'default',
  glow = false,
  ...props 
}: MythosPanelProps) => {
  const variants = {
    default: 'bg-black/40 border border-[var(--gold-accent)]/20 shadow-2xl',
    glass: 'bg-white/5 backdrop-blur-md border border-white/10 shadow-xl',
    deep: 'bg-[#0a0a0c] border border-black shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)]'
  };

  return (
    <div 
      className={cn(
        'rounded-xl p-6 transition-all duration-500',
        variants[variant],
        glow && 'shadow-[0_0_20px_rgba(197,160,89,0.1)] hover:shadow-[0_0_30px_rgba(197,160,89,0.2)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

interface MythosButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'blood';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const MythosButton = ({ 
  className, 
  variant = 'primary', 
  size = 'md',
  ...props 
}: MythosButtonProps) => {
  const variants = {
    primary: 'bg-[var(--gold-accent)] text-[var(--deep-slate)] hover:shadow-[0_0_20px_rgba(197,160,89,0.4)]',
    secondary: 'bg-white/10 text-[var(--parchment)] hover:bg-white/20',
    outline: 'border-2 border-[var(--gold-accent)]/50 text-[var(--gold-accent)] hover:bg-[var(--gold-accent)] hover:text-[var(--deep-slate)]',
    ghost: 'hover:bg-white/5 text-[var(--parchment)]/60 hover:text-[var(--parchment)]',
    blood: 'bg-[var(--blood-red)]/20 border border-[var(--blood-red)] text-white hover:bg-[var(--blood-red)]/40 shadow-[0_0_15px_rgba(139,0,0,0.2)]'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-[10px]',
    md: 'px-6 py-2.5 text-sm',
    lg: 'px-8 py-3.5 text-lg',
    icon: 'p-2.5'
  };

  return (
    <button 
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-serif italic font-bold tracking-tight transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
};

export const MythosInput = ({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    className={cn(
      'bg-transparent border-b border-[var(--gold-accent)]/20 py-2 font-serif focus:outline-none focus:border-[var(--gold-accent)] transition-all placeholder:opacity-30',
      className
    )}
    {...props}
  />
);

export const MythosLabel = ({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label
    className={cn(
      'text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--gold-accent)] opacity-60 mb-1',
      className
    )}
    {...props}
  />
);
