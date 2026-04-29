'use client';

import React, { useState } from 'react';
import { MythosPanel, MythosLabel, MythosButton, MythosInput } from './UI';
import { Wand2, Search, Zap, ChevronDown, ChevronRight, Plus, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../GameContext';
import { SpellBrowserModal } from '../SpellBrowserModal';

interface SpellbookPanelProps {
  character: any;
  updateCharacter: (updates: any) => void;
}


export const SpellbookPanel = ({ character, updateCharacter }: SpellbookPanelProps) => {
  const { rollDice } = useGame();
  const [expandedSpells, setExpandedSpells] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterSchool, setFilterSchool] = useState('all');
  const [isAddingSpell, setIsAddingSpell] = useState(false);

  const toggleExpand = (idx: number) => {
    const next = new Set(expandedSpells);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setExpandedSpells(next);
  };

  const filteredSpells = (character.spells || []).filter((s: any) => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = filterLevel === 'all' || s.level?.toString() === filterLevel;
    const matchesSchool = filterSchool === 'all' || s.school?.toLowerCase() === filterSchool.toLowerCase();
    return matchesSearch && matchesLevel && matchesSchool;
  });

  const uniqueSchools = Array.from(new Set((character.spells || []).map((s: any) => s.school))).filter(Boolean);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Spellcasting Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <MythosPanel variant="deep" className="text-center">
            <MythosLabel>Spell Save DC</MythosLabel>
            <div className="text-4xl font-serif font-black text-[var(--gold-accent)]">{character.spellSaveDC || 13}</div>
         </MythosPanel>
         <MythosPanel variant="deep" className="text-center">
            <MythosLabel>Spell Attack</MythosLabel>
            <div className="text-4xl font-serif font-black text-[var(--gold-accent)]">{character.spellAttackMod > 0 ? `+${character.spellAttackMod}` : (character.spellAttackMod || '+5')}</div>
         </MythosPanel>
         <MythosPanel variant="deep" className="text-center">
            <MythosLabel>Spell Modifier</MythosLabel>
            <div className="text-4xl font-serif font-black text-[var(--gold-accent)]">+{character.stats?.[character.spellAbility || 'int'] ? Math.floor((character.stats[character.spellAbility || 'int'] - 10) / 2) : 3}</div>
         </MythosPanel>
      </div>

      {/* Spell Slots */}
      <MythosPanel variant="default" className="grid grid-cols-3 sm:grid-cols-9 gap-4">
         {[1,2,3,4,5,6,7,8,9].map(lvl => {
            const max = character.maxSpellSlots?.[lvl] || 0;
            if (max === 0) return null;
            const current = character.currentSpellSlots?.[lvl] ?? max;
            
            return (
              <div key={lvl} className="flex flex-col items-center">
                 <MythosLabel className="text-[8px] tracking-normal">Slot {lvl}</MythosLabel>
                 <div className="flex gap-1 mt-1">
                    {Array.from({ length: max }).map((_, i) => (
                      <button 
                        key={i}
                        onClick={() => {
                          const slots = { ...(character.currentSpellSlots || {}) };
                          slots[lvl] = current > i ? i : i + 1;
                          updateCharacter({ currentSpellSlots: slots, persist: true });
                        }}
                        className={cn(
                          "w-3 h-3 border border-[var(--gold-accent)]/40 transition-all",
                          i < current ? "bg-[var(--gold-accent)] shadow-[0_0_8px_var(--gold-accent)]" : "bg-black/40"
                        )}
                      />
                    ))}
                 </div>
              </div>
            );
         })}
      </MythosPanel>

      {/* Spell List */}
      <div className="space-y-4">
         <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-2 flex-1 items-start sm:items-center">
               <div className="relative flex-1 w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--gold-accent)] opacity-40" size={18} />
                  <MythosInput
                    placeholder="Search Spellbook..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 bg-black/20 border-border rounded-xl border-none"
                  />
               </div>
               <select
                 value={filterLevel}
                 onChange={e => setFilterLevel(e.target.value)}
                 className="bg-black/60 border border-white/10 p-2 rounded-xl text-sm text-[var(--parchment)] focus:border-[var(--gold-accent)]/50 focus:outline-none uppercase tracking-widest font-bold h-full min-h-[44px]"
               >
                 <option value="all">Level: All</option>
                 <option value="0">Cantrips</option>
                 {[1,2,3,4,5,6,7,8,9].map(lvl => (
                    <option key={lvl} value={lvl.toString()}>Level {lvl}</option>
                 ))}
               </select>
               <select
                 value={filterSchool}
                 onChange={e => setFilterSchool(e.target.value)}
                 className="bg-black/60 border border-white/10 p-2 rounded-xl text-sm text-[var(--parchment)] focus:border-[var(--gold-accent)]/50 focus:outline-none uppercase tracking-widest font-bold h-full min-h-[44px] max-w-[150px]"
               >
                 <option value="all">School: All</option>
                 {uniqueSchools.map((school: any) => (
                    <option key={school} value={school.toLowerCase()}>{school}</option>
                 ))}
               </select>
            </div>
            <div className="flex gap-2">
               <MythosButton variant="secondary" onClick={() => setIsAddingSpell(!isAddingSpell)} className="shrink-0 h-[44px]">
                 {isAddingSpell ? <X size={16} /> : <Plus size={16} />}
               </MythosButton>
               <MythosButton variant="secondary" className="shrink-0 h-[44px]">
                  <Sparkles size={16} /> AI Spell Inscription
               </MythosButton>
            </div>
         </div>

         {isAddingSpell && (
           <SpellBrowserModal 
             onClose={() => setIsAddingSpell(false)}
             existingSpellIds={(character.spells || []).map((s: any) => s.id).filter(Boolean)}
             onAddSpells={(spells) => {
               const newSpells = spells.map(item => ({
                 id: item.id,
                 name: item.name,
                 level: parseInt(item.level ?? "0"),
                 school: item.school,
                 description: item.description,
                 entries: item.entries,
                 time: (Array.isArray(item.time) && item.time.length > 0) ? `${item.time[0].number} ${item.time[0].unit}` : undefined,
                 range: item.range ? (item.range.distance ? `${item.range.distance.amount || ''} ${item.range.distance.type}` : item.range.type) : undefined,
                 components: item.components ? Object.keys(item.components).join(', ').toUpperCase() : undefined,
                 duration: (Array.isArray(item.duration) && item.duration.length > 0) ? `${item.duration[0].type === 'timed' ? item.duration[0].duration.amount + ' ' + item.duration[0].duration.type : item.duration[0].type}` : undefined,
                 source: item.source,
                 prepared: true
               }));
               updateCharacter({
                 spells: [...(character.spells || []), ...newSpells],
                 persist: true
               });
             }}
           />
         )}

         <div className="space-y-2">
            {filteredSpells.length > 0 ? (
              filteredSpells.map((spell: any, idx: number) => (
                <MythosPanel 
                  key={idx} 
                  variant="deep" 
                  className="p-0 overflow-hidden border-white/5 hover:border-[var(--gold-accent)]/20 transition-all"
                >
                   <div 
                     className="px-6 py-4 flex items-center justify-between cursor-pointer group"
                     onClick={() => toggleExpand(idx)}
                   >
                      <div className="flex items-center gap-4">
                         <div className={cn(
                           "p-1.5 rounded bg-black/40 border border-white/5",
                           spell.prepared && "text-[var(--gold-accent)] border-[var(--gold-accent)]/30 shadow-[0_0_10px_rgba(197,160,89,0.1)]"
                         )}>
                            <Zap size={14} />
                         </div>
                         <div>
                            <div className="font-serif italic font-bold text-[var(--parchment)] group-hover:text-[var(--gold-accent)] transition-colors">
                               {spell.name}
                            </div>
                            <div className="text-[8px] uppercase tracking-widest opacity-40">
                               Level {spell.level === 0 ? 'Cantrip' : spell.level} • {spell.school}
                            </div>
                         </div>
                      </div>
                      <div className="flex items-center gap-6">
                         {spell.level > 0 && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                const level = spell.level;
                                if (character.currentSpellSlots?.[level] > 0) {
                                  const slots = { ...character.currentSpellSlots };
                                  slots[level] -= 1;
                                  updateCharacter({ currentSpellSlots: slots, persist: true });
                                  rollDice(1, 20, character.spellAttackMod, `Casting: ${spell.name}`);
                                } else {
                                  alert("No slots remaining for this level!");
                                }
                              }}
                              className="text-[10px] uppercase font-bold tracking-widest text-[var(--gold-accent)] opacity-40 hover:opacity-100 transition-opacity"
                            >
                               Cast
                            </button>
                         )}
                         {expandedSpells.has(idx) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </div>
                   </div>
                   <AnimatePresence>
                     {expandedSpells.has(idx) && (
                       <motion.div
                         initial={{ height: 0, opacity: 0 }}
                         animate={{ height: 'auto', opacity: 1 }}
                         exit={{ height: 0, opacity: 0 }}
                         className="px-6 pb-6 pt-2 border-t border-white/5 bg-black/10"
                       >
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 text-[10px] uppercase font-bold tracking-tighter opacity-40">
                             <div>Time: {spell.time || '1 Action'}</div>
                             <div>Range: {spell.range || '60ft'}</div>
                             <div>Comp: {spell.components || 'V,S'}</div>
                             <div>Dur: {spell.duration || 'Inst'}</div>
                          </div>
                          <div className="font-serif italic text-sm opacity-80 leading-relaxed whitespace-pre-wrap">
                             {spell.entries ? renderEntries(spell.entries) : spell.description}
                          </div>
                       </motion.div>
                     )}
                   </AnimatePresence>
                </MythosPanel>
              ))
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-2xl opacity-20">
                 <p className="font-serif italic text-lg text-[var(--gold-accent)]">No spells inscribed in this archive.</p>
              </div>
            )}
         </div>
      </div>
    </div>
  );
};

function renderEntries(entries: any): string {
  if (!entries) return "";
  if (typeof entries === 'string') return entries;
  if (Array.isArray(entries)) {
    return entries.map(e => renderEntries(e)).filter(Boolean).join('\n\n');
  }
  if (typeof entries === 'object') {
     if (entries.type === 'entries') return `${entries.name ? entries.name + ': ' : ''}${renderEntries(entries.entries)}`;
     if (entries.type === 'list' && entries.items) return entries.items.map((i: any) => `• ${renderEntries(i)}`).join('\n');
     if (entries.type === 'table') return '[Table Data]';
     if (entries.type === 'entries' && !entries.entries) return entries.name || '';
     if (entries.type === 'options') return renderEntries(entries.entries);
     if (entries.items) return entries.items.map((i:any)=>renderEntries(i)).join('\n');
     if (entries.entries) return renderEntries(entries.entries);
     return '';
  }
  return String(entries);
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
