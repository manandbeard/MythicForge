'use client';

import React, { useState } from 'react';
import { MythosPanel, MythosLabel, MythosButton } from '../UI';
import { Dices, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AttributesStepProps {
  stats: any;
  setStats: (v: any) => void;
}

export const AttributesStep = ({ stats, setStats }: AttributesStepProps) => {
  const [rolls, setRolls] = useState<{ id: string, value: number }[]>([]);
  const [isRolling, setIsRolling] = useState(false);
  const [selectedRollId, setSelectedRollId] = useState<string | null>(null);
  const [assignedRolls, setAssignedRolls] = useState<Partial<Record<string, string>>>({});

  const roll4d6DropLowest = () => {
    const dice = Array.from({ length: 4 }, () => Math.floor(Math.random() * 6) + 1);
    dice.sort((a, b) => a - b);
    return dice[1] + dice[2] + dice[3];
  };

  const generateStats = () => {
    if (isRolling) return;
    setIsRolling(true);
    setSelectedRollId(null);
    setAssignedRolls({});
    setRolls([]);
    
    let iterations = 0;
    const maxIterations = 15;
    
    const interval = setInterval(() => {
      setRolls(Array.from({ length: 6 }, (_, i) => ({
        id: `temp-${i}`,
        value: roll4d6DropLowest(),
      })));
      iterations++;
      
      if (iterations >= maxIterations) {
        clearInterval(interval);
        setRolls(Array.from({ length: 6 }, (_, i) => ({
          id: `roll-${i}-${Date.now()}`,
          value: roll4d6DropLowest(),
        })));
        setIsRolling(false);
      }
    }, 50);
  };

  const handleStatBoxClick = (stat: string) => {
    if (!selectedRollId) return;

    const selectedRoll = rolls.find(r => r.id === selectedRollId);
    if (!selectedRoll) return;

    let newAssigned = { ...assignedRolls };
    // Clear previous assignment for this roll if it was assigned elsewhere
    for (const [key, val] of Object.entries(newAssigned)) {
      if (val === selectedRollId) {
        delete newAssigned[key];
      }
    }
    
    newAssigned[stat] = selectedRollId;
    setAssignedRolls(newAssigned);
    setStats({ ...stats, [stat]: selectedRoll.value });
    setSelectedRollId(null);
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex flex-col items-center">
         <MythosButton variant="outline" size="lg" onClick={generateStats} disabled={isRolling}>
            {isRolling ? <Loader2 size={24} className="animate-spin" /> : <Dices size={24} />}
            {isRolling ? 'Casting Bones...' : 'Cast Attributes (4d6 Drop Lowest)'}
         </MythosButton>

         <div className="h-24 flex items-center justify-center mt-6">
            <AnimatePresence mode="popLayout">
               {rolls.length > 0 && (
                 <motion.div 
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="flex gap-4"
                 >
                    {rolls.map((roll) => {
                      const isAssigned = Object.values(assignedRolls).includes(roll.id);
                      const isSelected = selectedRollId === roll.id;

                      return (
                        <button
                          key={roll.id}
                          disabled={isAssigned || isRolling}
                          onClick={() => setSelectedRollId(isSelected ? null : roll.id)}
                          className={cn(
                            "w-12 h-12 rounded-lg border font-serif font-black text-2xl flex items-center justify-center transition-all",
                            isAssigned ? "opacity-10 grayscale" : 
                            isSelected ? "bg-[var(--gold-accent)] text-[var(--deep-slate)] scale-110 shadow-[0_0_20px_var(--gold-accent)]" : 
                            "bg-black/40 border-[var(--gold-accent)]/20 text-[var(--gold-accent)] hover:border-[var(--gold-accent)]"
                          )}
                        >
                           {roll.value}
                        </button>
                      );
                    })}
                 </motion.div>
               )}
            </AnimatePresence>
         </div>
         {selectedRollId && (
            <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-[var(--gold-accent)] animate-pulse">
               Select an attribute below to assign {rolls.find(r => r.id === selectedRollId)?.value}
            </p>
         )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-6">
         {['str', 'dex', 'con', 'int', 'wis', 'cha'].map(stat => (
           <div 
             key={stat}
             onClick={() => handleStatBoxClick(stat)}
             className={cn(
               "flex flex-col items-center p-6 rounded-xl border transition-all cursor-pointer",
               selectedRollId ? "border-dashed border-[var(--gold-accent)]/40 hover:bg-[var(--gold-accent)]/5" : 
               assignedRolls[stat] ? "border-[var(--gold-accent)] bg-[var(--gold-accent)]/10" : "border-white/5 bg-black/40"
             )}
           >
              <MythosLabel>{stat}</MythosLabel>
              <div className="text-4xl font-serif font-black text-[var(--gold-accent)]">
                 {stats[stat]}
              </div>
              {assignedRolls[stat] && <Sparkles size={12} className="text-[var(--gold-accent)] mt-2" />}
           </div>
         ))}
      </div>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
