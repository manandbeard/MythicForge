"use client";

import React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Trash2, Dice5 } from 'lucide-react';
import { useGame, RollLogEntry } from '@/components/GameContext';

export default function RollHistoryPage() {
  const { rollHistory, clearHistory } = useGame();

  const formatDate = (timestamp: number) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric'
    }).format(new Date(timestamp));
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-300 font-mono p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <header className="flex justify-between items-center mb-8 border-b border-[var(--gold-accent)]/20 pb-4">
          <div className="flex items-center gap-4">
            <Link 
              href="/" 
              className="p-2 hover:bg-white/10 rounded-full transition-colors text-[var(--gold-accent)]"
            >
              <ArrowLeft size={24} />
            </Link>
            <h1 className="text-2xl tracking-widest text-[var(--gold-accent)] flex items-center gap-2 uppercase font-black">
              <Dice5 className="animate-spin-slow" /> Roll Log
            </h1>
          </div>
          {rollHistory.length > 0 && (
            <button
              onClick={clearHistory}
              className="flex items-center gap-2 text-xs uppercase tracking-widest text-[var(--blood-red)] hover:text-red-400 hover:bg-red-950/30 px-3 py-1.5 rounded transition-all border border-transparent hover:border-red-900/50"
            >
              <Trash2 size={14} /> Clear Log
            </button>
          )}
        </header>

        <div className="space-y-4">
          <AnimatePresence>
            {rollHistory.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20 text-white/30 italic"
              >
                The void is silent. No dice have been cast.
              </motion.div>
            ) : (
              rollHistory.map((log: RollLogEntry) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-[#111115] border border-white/5 rounded-lg p-4 shadow-xl flex items-center justify-between"
                >
                  <div className="flex-1 pr-4 border-r border-white/10">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] text-white/40 tracking-wider">
                        {formatDate(log.timestamp)}
                      </span>
                      {log.playerName && (
                         <span className="text-[10px] text-[var(--gold-accent)] uppercase tracking-widest font-bold">
                           [{log.playerName}]
                         </span>
                      )}
                      {log.mode !== 'normal' && (
                        <span className={`text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-sm ${
                          log.mode === 'advantage' ? 'bg-[#10b981]/20 text-[#10b981]' : 'bg-[#6b21a8]/40 text-[#d8b4fe]'
                        }`}>
                          {log.mode}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-[var(--parchment)] font-bold tracking-wide">
                      {log.request.reason || 'Unspecified Roll'}
                    </div>
                    <div className="text-xs text-white/50 mt-2">
                      Rolling {log.request.count}d{log.request.type} 
                      {log.request.modifier !== 0 && (
                        <span className="text-[var(--gold-accent)] ml-1">
                          {log.request.modifier > 0 ? '+' : ''}{log.request.modifier}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="pl-4 min-w-[80px] flex flex-col items-center justify-center">
                    <div className="text-3xl font-black text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">
                      {log.result.total}
                    </div>
                    <div className="text-[10px] text-white/30 mt-1">
                      [{log.result.individual.join(', ')}]
                      {log.result.dropped !== undefined && (
                        <span className="opacity-50 ml-1 line-through">
                           {log.result.dropped}
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}