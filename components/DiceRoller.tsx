'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Dices, X, RefreshCw } from 'lucide-react';
import { rollDice, RollResult } from '@/lib/dnd-engine';

export default function DiceRoller() {
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<RollResult[]>([]);
  const [diceCount, setDiceCount] = useState(1);
  const [diceSides, setDiceSides] = useState(20);
  const [modifier, setModifier] = useState(0);

  const handleRoll = () => {
    const result = rollDice(diceCount, diceSides, modifier);
    setHistory([result, ...history].slice(0, 10));
  };

  const clearHistory = () => setHistory([]);

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 p-4 bg-[var(--gold-accent)] text-[var(--deep-slate)] rounded-full shadow-lg hover:scale-110 transition-transform active:scale-95"
      >
        <Dices size={24} />
      </button>

      {/* Roller Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 z-50 w-80 eldritch-panel rounded-xl p-4 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-serif italic text-[var(--gold-accent)] uppercase tracking-widest">Dice Tray</h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="flex flex-col">
                <label className="text-[10px] uppercase tracking-wider font-semibold opacity-60">Dice</label>
                <input
                  type="number"
                  min="1"
                  value={diceCount}
                  onChange={(e) => setDiceCount(Number(e.target.value))}
                  className="bg-transparent border-b border-[var(--gold-accent)] py-1 text-center font-mono text-[var(--gold-accent)]"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] uppercase tracking-wider font-semibold opacity-60">Sides</label>
                <select
                  value={diceSides}
                  onChange={(e) => setDiceSides(Number(e.target.value))}
                  className="bg-transparent border-b border-[var(--gold-accent)] py-1 text-center font-mono appearance-none text-[var(--gold-accent)]"
                >
                  {[4, 6, 8, 10, 12, 20, 100].map(s => <option key={s} value={s} className="bg-[var(--deep-slate)]">d{s}</option>)}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] uppercase tracking-wider font-semibold opacity-60">Mod</label>
                <input
                  type="number"
                  value={modifier}
                  onChange={(e) => setModifier(Number(e.target.value))}
                  className="bg-transparent border-b border-[var(--gold-accent)] py-1 text-center font-mono text-[var(--gold-accent)]"
                />
              </div>
            </div>

            <button
              onClick={handleRoll}
              className="w-full py-2 bg-[var(--gold-accent)] text-[var(--deep-slate)] rounded font-serif italic mb-4 hover:shadow-[0_0_15px_rgba(197,160,89,0.5)] transition-all font-bold"
            >
              Cast Dice
            </button>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {history.length === 0 ? (
                <p className="text-center text-xs text-gray-500 italic py-4 font-mono opacity-40">Await your fate...</p>
              ) : (
                history.map((roll, i) => (
                  <div key={i} className="flex justify-between items-center text-sm border-b border-white/5 pb-1">
                    <span className="font-mono opacity-50 text-[10px]">{roll.notation}</span>
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] opacity-30 font-mono">({roll.rolls.join('+')}{roll.modifier !== 0 ? (roll.modifier > 0 ? `+${roll.modifier}` : roll.modifier) : ''})</span>
                       <span className="font-bold text-lg text-[var(--magic-blue)]">{roll.total}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="w-full mt-4 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest font-semibold opacity-40 hover:opacity-100 transition-opacity"
              >
                <RefreshCw size={12} /> Clear History
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
