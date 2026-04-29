'use client';

import React from 'react';
import { MythosPanel, MythosLabel, MythosButton } from './UI';
import { Shield, FastForward, Zap, Target, Skull, Swords, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { getModifier, formatModifier } from '@/lib/dnd-engine';
import { useGame } from '../GameContext';

interface CombatPanelProps {
  character: any;
  updateCharacter: (updates: any) => void;
}

export const CombatPanel = ({ character, updateCharacter }: CombatPanelProps) => {
  const { rollDice } = useGame();
  const hpPercent = (character.hp.current / character.hp.max) * 100;
  
  const initMod = getModifier(character.stats.dex);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Vitals & Core Combat Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Vital HP Bar */}
        <MythosPanel variant="default" glow className="flex flex-col">
          <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-3">
                <div className="p-2 bg-[var(--blood-red)]/10 rounded-full">
                  <Heart size={20} className="text-[var(--blood-red)]" />
                </div>
                <div>
                   <MythosLabel>Current Vitals</MythosLabel>
                   <div className="font-serif italic text-2xl text-[var(--parchment)]">
                      {character.hp.current} / {character.hp.max}
                   </div>
                </div>
             </div>
             <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={character.hp.temp || 0}
                  onChange={(e) => updateCharacter({ hp: { ...character.hp, temp: Number(e.target.value) } })}
                  className="w-12 bg-black/40 border border-[var(--gold-accent)]/20 rounded py-1 text-center font-mono text-[var(--magic-blue)] text-sm shadow-inner"
                  title="Temporary Hit Points"
                />
                <span className="text-[8px] uppercase tracking-widest opacity-40">TEMP</span>
             </div>
          </div>

          <div className="h-3 bg-black/60 rounded-full overflow-hidden border border-white/5 relative mb-6">
             <motion.div 
               initial={{ width: 0 }}
               animate={{ width: `${hpPercent}%` }}
               className={`h-full transition-all duration-1000 ${
                 hpPercent < 25 ? 'bg-[var(--blood-red)]' : 
                 hpPercent < 50 ? 'bg-orange-500' : 
                 'bg-green-600'
               }`}
             />
             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <MythosButton variant="secondary" size="sm" onClick={() => {
               const val = window.prompt("Adjust HP (positive to heal, negative to damage):");
               if (val) {
                 const amount = Number(val);
                 updateCharacter({ hp: { ...character.hp, current: Math.min(character.hp.max, character.hp.current + amount) }, persist: true });
               }
            }}>
              Modify Health
            </MythosButton>
            <MythosButton variant="blood" size="sm" onClick={() => updateCharacter({ hp: { ...character.hp, current: 0 }, persist: true })}>
              Fell Hero
            </MythosButton>
          </div>
        </MythosPanel>

        {/* Combat Primitives */}
        <div className="grid grid-cols-2 gap-4">
           {[
             { label: 'Initiative', val: formatModifier(initMod), icon: Zap, action: () => rollDice(1, 20, initMod, 'Initiative') },
             { label: 'Armor Class', val: character.ac, icon: Shield },
             { label: 'Speed', val: `${character.speed || 30}ft`, icon: FastForward },
             { label: 'Proficiency', val: `+${character.proficiencyBonus || 2}`, icon: Target }
           ].map((stat, i) => (
             <MythosPanel 
               key={i} 
               variant="deep" 
               className={cn(
                 "flex flex-col items-center justify-center p-6 group transition-all",
                 stat.action && "cursor-pointer hover:bg-white/5"
               )}
               onClick={stat.action}
             >
                <div className="p-2 mb-2 bg-[var(--gold-accent)]/5 rounded-full text-[var(--gold-accent)] opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all">
                  <stat.icon size={18} />
                </div>
                <MythosLabel>{stat.label}</MythosLabel>
                <div className="text-3xl font-serif font-black text-[var(--gold-accent)]">
                   {stat.val}
                </div>
             </MythosPanel>
           ))}
        </div>
      </div>

      {/* Attacks / Weapons */}
      <MythosPanel variant="default" className="p-0 overflow-hidden">
        <div className="bg-white/5 px-6 py-4 flex items-center justify-between border-b border-white/10">
           <div className="flex items-center gap-3">
              <Swords size={20} className="text-[var(--gold-accent)]" />
              <h3 className="font-serif italic font-bold text-lg">Martial Prowess</h3>
           </div>
           <MythosButton variant="ghost" size="sm">
              Add Weapon
           </MythosButton>
        </div>
        <div className="p-6 space-y-4">
           {character.attacks?.length > 0 ? (
             character.attacks.map((attack: any, idx: number) => (
               <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-black/20 border border-[var(--gold-accent)]/10 rounded-xl hover:border-[var(--gold-accent)]/30 transition-all group">
                  <div className="mb-4 sm:mb-0">
                     <h4 className="font-serif italic font-bold text-[var(--gold-accent)] text-lg">{attack.name}</h4>
                     <p className="text-[10px] uppercase font-bold opacity-30 tracking-widest">{attack.range || 'Melee'} | {attack.type || 'Physical'}</p>
                  </div>
                  <div className="flex gap-4">
                     <button 
                       onClick={() => rollDice(1, 20, attack.bonus, `Attack: ${attack.name}`)}
                       className="flex flex-col items-center px-4 py-2 bg-white/5 rounded-lg border border-white/5 hover:border-[var(--gold-accent)]/40 hover:bg-white/10 transition-all"
                     >
                        <span className="text-[8px] uppercase tracking-tighter opacity-40 font-bold">To Hit</span>
                        <span className="font-mono font-bold text-[var(--gold-accent)]">{formatModifier(attack.bonus)}</span>
                     </button>
                     <button 
                       onClick={() => rollDice(attack.damageDice, attack.damageSides, attack.damageBonus, `Damage: ${attack.name}`)}
                       className="flex flex-col items-center px-4 py-2 bg-[var(--gold-accent)]/5 rounded-lg border border-[var(--gold-accent)]/20 hover:border-[var(--gold-accent)]/60 hover:bg-[var(--gold-accent)]/10 transition-all"
                     >
                        <span className="text-[8px] uppercase tracking-tighter opacity-40 font-bold">Damage</span>
                        <span className="font-mono font-bold">{attack.damage}</span>
                     </button>
                  </div>
               </div>
             ))
           ) : (
             <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-2xl opacity-20">
                <p className="font-serif italic text-lg">No weapons drawn. The Archive is silent.</p>
             </div>
           )}
        </div>
      </MythosPanel>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
