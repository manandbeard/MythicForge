"use client";

import React, { useState, useEffect, useMemo } from "react";
import { fetchSpells, Spell, extractText } from "@/lib/data-import";
import { getSpellSlots, getCasterType } from "@/lib/dnd-engine";
import {
  Wand2,
  Book,
  Search,
  Filter,
  Plus,
  Trash2,
  Zap,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  BookOpen
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";

interface SpellSlotState {
  [level: number]: { max: number; current: number };
}

export default function SpellbookFeature() {
  const [loading, setLoading] = useState(true);
  const [characterClass, setCharacterClass] = useState("Wizard");
  const [characterLevel, setCharacterLevel] = useState<number>(1);
  const [allSpells, setAllSpells] = useState<Spell[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Spellbook state
  const [mySpells, setMySpells] = useState<(Spell & { prepared?: boolean })[]>([]);
  const [spellSlots, setSpellSlots] = useState<SpellSlotState>({});
  const [expandedArchiveSpells, setExpandedArchiveSpells] = useState<Set<string>>(new Set());
  const [expandedPersonalSpells, setExpandedPersonalSpells] = useState<Set<string>>(new Set());

  // Load baseline spells
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const spells = await fetchSpells();
      setAllSpells(spells);
      setLoading(false);
    };
    loadData();
  }, []);

  // Update spell slots whenever class/level changes
  useEffect(() => {
    const type = getCasterType(characterClass);
    const slotsArray = getSpellSlots(characterLevel, type);
    const newSlots: SpellSlotState = {};
    for (let i = 1; i <= 9; i++) {
        const max = slotsArray[i] || 0; 
        // Note: slot array from lib has index mapping: fullCasterTable[...][1] is Level 1.
        // Wait, index 0 is cantrip or Level 1?
        // Let's check getSpellSlots implementation: 
        // [0, 2, 0, ...] index 1 is Level 1.
        const maxSlots = slotsArray[i] || 0;
        newSlots[i] = { max: maxSlots, current: maxSlots };
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSpellSlots(newSlots);
  }, [characterClass, characterLevel]);

  const availableSpells = useMemo(() => {
    return allSpells.filter((s) => {
        const matchesQuery = s.name.toLowerCase().includes(searchQuery.toLowerCase());
        
        let matchesClass = false;
        const classesObj = (s as any).classes?.fromClassList || [];
        matchesClass = classesObj.some((c: any) => c.name.toLowerCase() === characterClass.toLowerCase());
        
        // Also check if they can cast it based on max slot level available
        const type = getCasterType(characterClass);
        const slotsArray = getSpellSlots(characterLevel, type);
        let maxSpellLevelAvailable = 0;
        // Warlock is special but generic check:
        for (let i = 1; i <= 9; i++) {
             if (slotsArray[i] > 0) maxSpellLevelAvailable = i;
        }
        if (type === 'warlock') {
             // simplified warlock logic: they get slots by row index, we'll just allow up to char level roughly or slot bound.
             // Actually full caster table is used.
             if (slotsArray[1] > 0) maxSpellLevelAvailable = Math.max(maxSpellLevelAvailable, 1);
        }
        
        const isLevelAllowed = s.level <= Math.max(maxSpellLevelAvailable, characterLevel > 0 ? Math.ceil(characterLevel / 2) : 1);
        
        // Cantrips are always allowed
        const isAllowedByPower = s.level === 0 || isLevelAllowed;

        return matchesQuery && matchesClass && isAllowedByPower;
    }).sort((a, b) => {
        if (a.level !== b.level) return a.level - b.level;
        return a.name.localeCompare(b.name);
    });
  }, [allSpells, searchQuery, characterClass, characterLevel]);

  const togglePrepare = (spellName: string) => {
      setMySpells(prev => prev.map(s => s.name === spellName ? { ...s, prepared: !s.prepared } : s));
  };

  const removeSpell = (spellName: string) => {
      setMySpells(prev => prev.filter(s => s.name !== spellName));
  };

  const addSpell = (spell: Spell) => {
      if (!mySpells.find(s => s.name === spell.name)) {
          setMySpells(prev => [...prev, { ...spell, prepared: spell.level === 0 }]); // cantrips implicitly prepared
      }
  };

  const handleUseSlot = (level: number) => {
      if (spellSlots[level]?.current > 0) {
          setSpellSlots(prev => ({
              ...prev,
              [level]: { ...prev[level], current: prev[level].current - 1 }
          }));
      }
  };

  const restoreSlots = () => {
      setSpellSlots(prev => {
          const newSlots = { ...prev };
          Object.keys(newSlots).forEach(lvl => {
              const l = Number(lvl);
              newSlots[l].current = newSlots[l].max;
          });
          return newSlots;
      });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--deep-slate)] flex items-center justify-center text-[var(--gold-accent)]">
        <div className="animate-spin mr-3"><BookOpen size={32} /></div>
        <p className="font-serif italic text-xl">Consulting Arcane Texts...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--deep-slate)] text-[var(--parchment)] p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8 border-b-2 border-[var(--gold-accent)] pb-4">
           <div>
             <Link href="/" className="inline-flex items-center text-[var(--gold-accent)] hover:opacity-80 transition-opacity mb-4">
                <ArrowLeft size={16} className="mr-2" /> Return to Archive
             </Link>
             <h1 className="text-4xl md:text-5xl font-serif font-black tracking-tighter text-[var(--gold-accent)]">
               DYNAMIC SPELLBOOK
             </h1>
             <p className="text-sm md:text-base opacity-70 mt-2 font-serif italic">
               Prepare your mind for the arcane arts. Track slots, memorize incantations.
             </p>
           </div>
           <BookOpen size={48} className="text-[var(--gold-accent)] opacity-50 hidden md:block" />
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           {/* Sidebar: Configuration & Spell Slots */}
           <div className="lg:col-span-4 space-y-6">
              <div className="p-6 bg-black/40 border border-[var(--gold-accent)]/30 rounded-xl shadow-[0_0_15px_rgba(197,160,89,0.1)]">
                 <h2 className="font-serif italic text-xl text-[var(--gold-accent)] mb-4 flex items-center gap-2">
                    <Wand2 size={20} /> Spellcaster Focus
                 </h2>
                 <div className="space-y-4">
                    <div>
                        <label className="text-[10px] uppercase font-bold tracking-widest text-[#a8a29e] mb-1 block">Class Tradition</label>
                        <select 
                           value={characterClass} 
                           onChange={(e) => setCharacterClass(e.target.value)}
                           className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm italic outline-none focus:border-[var(--gold-accent)]"
                        >
                            {['Artificer', 'Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger', 'Sorcerer', 'Warlock', 'Wizard'].map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] uppercase font-bold tracking-widest text-[#a8a29e] mb-1 block">Caster Level</label>
                        <input 
                            type="number"
                            min={1} max={20}
                            value={characterLevel}
                            onChange={(e) => setCharacterLevel(parseInt(e.target.value) || 1)}
                            className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--gold-accent)]"
                        />
                    </div>
                 </div>
              </div>

              <div className="p-6 bg-black/40 border border-[var(--gold-accent)]/30 rounded-xl">
                 <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
                    <h2 className="font-serif italic text-xl text-[var(--gold-accent)] flex items-center gap-2">
                        <Zap size={20} /> Arcanum Slots
                    </h2>
                    <button onClick={restoreSlots} className="text-[10px] uppercase font-bold text-blue-400 hover:text-blue-300">Long Rest</button>
                 </div>
                 
                 <div className="grid grid-cols-3 gap-3">
                     {[1,2,3,4,5,6,7,8,9].map(lvl => {
                         const data = spellSlots[lvl] || { max: 0, current: 0 };
                         if (data.max === 0) return null;
                         return (
                             <div key={lvl} className="flex flex-col items-center p-2 bg-blue-900/20 border border-blue-500/30 rounded-lg text-center relative overflow-hidden group">
                                 <span className="text-[10px] uppercase font-bold text-blue-300">Level {lvl}</span>
                                 <div className="flex items-center gap-1 my-1">
                                    <span className="font-mono text-lg font-bold text-white">{data.current}</span>
                                    <span className="text-xs text-white/50">/</span>
                                    <span className="font-mono text-sm text-white/70">{data.max}</span>
                                 </div>
                                 <button 
                                     onClick={() => handleUseSlot(lvl)}
                                     disabled={data.current === 0}
                                     className="text-[10px] w-full py-1 mt-1 font-bold uppercase tracking-widest bg-blue-500/20 text-blue-200 hover:bg-blue-500/40 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                 >
                                     Cast
                                 </button>
                             </div>
                         );
                     })}
                 </div>
              </div>
           </div>

           {/* Main Content: Spell Lists */}
           <div className="lg:col-span-8 flex flex-col gap-6">
               
               {/* My Spellbook */}
               <div className="p-6 bg-black/40 border border-[var(--gold-accent)]/30 rounded-xl shadow-[0_0_15px_rgba(197,160,89,0.1)]">
                   <h2 className="font-serif italic text-2xl text-[var(--gold-accent)] mb-4 flex items-center gap-2 border-b border-white/10 pb-4">
                       <Book size={24} /> Prepared Grimoire
                   </h2>
                   
                   {mySpells.length === 0 ? (
                       <p className="text-center py-8 text-sm opacity-50 font-serif italic border border-dashed border-white/20 rounded-lg">
                           Your mind is blank. Scribe spells from the archive below.
                       </p>
                   ) : (
                       <div className="space-y-3">
                           {mySpells.map(spell => {
                               const isExpanded = expandedPersonalSpells.has(spell.name);
                               return (
                                   <div key={spell.name} className={`p-4 border rounded-lg transition-all ${spell.prepared ? 'border-[var(--gold-accent)]/60 bg-black/60 shadow-[0_0_10px_rgba(197,160,89,0.15)]' : 'border-white/10 bg-black/20 opacity-70'}`}>
                                       <div className="flex justify-between items-start">
                                           <div className="cursor-pointer flex-1" onClick={() => {
                                                const newSet = new Set(expandedPersonalSpells);
                                                if (newSet.has(spell.name)) newSet.delete(spell.name);
                                                else newSet.add(spell.name);
                                                setExpandedPersonalSpells(newSet);
                                           }}>
                                               <h4 className="font-serif font-bold text-lg text-white flex items-center gap-2">
                                                   {isExpanded ? <ChevronDown size={16} className="text-[var(--gold-accent)]" /> : <ChevronRight size={16} className="opacity-50" />}
                                                   {spell.name}
                                               </h4>
                                               <p className="text-[10px] uppercase font-bold tracking-widest text-[#a8a29e] ml-6">
                                                   {spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`} • {spell.school}
                                               </p>
                                           </div>
                                           <div className="flex items-center gap-3 shrink-0">
                                               {spell.level > 0 && (
                                                   <button 
                                                       onClick={() => togglePrepare(spell.name)}
                                                       className={`px-3 py-1 border rounded-full text-[10px] font-bold uppercase tracking-widest transition-colors ${spell.prepared ? 'bg-[var(--gold-accent)]/20 border-[var(--gold-accent)] text-[var(--gold-accent)]' : 'text-white/40 border-white/20 hover:border-white/50'}`}
                                                   >
                                                       {spell.prepared ? 'Prepared' : 'Unprepared'}
                                                   </button>
                                               )}
                                               <button onClick={() => removeSpell(spell.name)} className="text-[var(--blood-red)] opacity-50 hover:opacity-100 hover:scale-110 transition-all p-1">
                                                   <Trash2 size={16} />
                                               </button>
                                           </div>
                                       </div>
                                       {isExpanded && (
                                           <div className="mt-3 ml-6 p-4 bg-black/40 border border-white/10 rounded-lg text-xs italic text-[var(--parchment)]/80 leading-relaxed shadow-inner">
                                               {extractText(spell.entries)}
                                           </div>
                                       )}
                                   </div>
                               );
                           })}
                       </div>
                   )}
               </div>

               {/* Discovery / Archive */}
               <div className="p-6 bg-black/40 border border-white/10 rounded-xl">
                   <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-white/10 pb-4">
                       <h2 className="font-serif italic text-xl text-white flex items-center gap-2">
                           <Search size={20} className="text-[var(--gold-accent)]" /> Library of {characterClass} Spells
                       </h2>
                       <div className="relative w-full sm:w-64">
                           <input 
                               type="text" 
                               placeholder="Search available spells..." 
                               value={searchQuery}
                               onChange={(e) => setSearchQuery(e.target.value)}
                               className="w-full bg-black/60 border border-white/20 rounded-full pl-10 pr-4 py-2 text-sm italic outline-none focus:border-[var(--gold-accent)]"
                           />
                           <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                       </div>
                   </div>

                   <div className="grid grid-cols-1 gap-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                       {availableSpells.map(spell => {
                           const isAdded = mySpells.some(s => s.name === spell.name);
                           const isExpanded = expandedArchiveSpells.has(spell.name);
                           
                           return (
                               <div key={spell.name} className="p-3 bg-white/5 border border-white/5 rounded-lg flex flex-col group hover:border-[var(--gold-accent)]/50 transition-colors">
                                   <div className="flex justify-between items-center cursor-pointer" onClick={() => {
                                        const newSet = new Set(expandedArchiveSpells);
                                        if (newSet.has(spell.name)) newSet.delete(spell.name);
                                        else newSet.add(spell.name);
                                        setExpandedArchiveSpells(newSet);
                                   }}>
                                       <div className="flex items-center gap-2 flex-1">
                                           {isExpanded ? <ChevronDown size={16} className="text-[var(--gold-accent)]" /> : <ChevronRight size={16} className="opacity-50" />}
                                           <div>
                                               <h4 className="font-serif font-bold text-sm text-[var(--parchment)]">{spell.name}</h4>
                                               <p className="text-[10px] uppercase font-bold tracking-widest opacity-50">
                                                   {spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`} • {spell.school}
                                               </p>
                                           </div>
                                       </div>
                                       <button 
                                           onClick={(e) => {
                                               e.stopPropagation();
                                               if (!isAdded) addSpell(spell);
                                           }}
                                           disabled={isAdded}
                                           className={`p-2 rounded-full border transition-all flex items-center justify-center shrink-0 ${isAdded ? 'bg-green-500/20 border-green-500/50 text-green-400 cursor-default tracking-widest text-[8px] font-bold px-3 py-1 uppercase' : 'bg-white/5 border-white/20 text-white hover:bg-[var(--gold-accent)]/20 hover:border-[var(--gold-accent)]/50 hover:text-[var(--gold-accent)]'}`}
                                       >
                                           {isAdded ? 'Scribed' : <Plus size={16} />}
                                       </button>
                                   </div>
                                   {isExpanded && (
                                       <div className="mt-3 ml-7 p-3 bg-black/60 border border-white/5 rounded text-xs italic text-[var(--parchment)]/70">
                                           {extractText(spell.entries)}
                                       </div>
                                   )}
                               </div>
                           );
                       })}
                       {availableSpells.length === 0 && (
                           <div className="p-8 text-center border border-dashed border-white/10 rounded-lg">
                               <p className="font-serif italic text-white/50">No spells found for this level and class.</p>
                           </div>
                       )}
                   </div>
               </div>
           </div>
        </div>
      </div>
    </div>
  );
}
