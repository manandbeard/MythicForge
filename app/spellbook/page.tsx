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

const SCHOOL_MAP: Record<string, string> = {
  A: "Abjuration",
  C: "Conjuration",
  D: "Divination",
  E: "Enchantment",
  I: "Illusion",
  N: "Necromancy",
  V: "Evocation",
  T: "Transmutation",
};

export default function SpellbookFeature() {
  const [loading, setLoading] = useState(true);
  const [characterClass, setCharacterClass] = useState("Wizard");
  const [characterLevel, setCharacterLevel] = useState<number>(1);
  const [allSpells, setAllSpells] = useState<Spell[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Advanced filters
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [filterSchool, setFilterSchool] = useState<string>("all");
  const [filterTime, setFilterTime] = useState<string>("all");
  const [filterComponents, setFilterComponents] = useState<string>("all");
  
  // Spellbook state
  const [mySpells, setMySpells] = useState<(Spell & { prepared?: boolean })[]>([]);
  const [spellSlots, setSpellSlots] = useState<SpellSlotState>({});
  const [expandedArchiveSpells, setExpandedArchiveSpells] = useState<Set<string>>(new Set());
  const [expandedPersonalSpells, setExpandedPersonalSpells] = useState<Set<string>>(new Set());
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

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
        const maxSlots = slotsArray[i] || 0;
        newSlots[i] = { max: maxSlots, current: maxSlots };
    }
    setSpellSlots(newSlots);
  }, [characterClass, characterLevel]);

  const availableSpells = useMemo(() => {
    return allSpells.filter((s) => {
        const matchesQuery = s.name.toLowerCase().includes(searchQuery.toLowerCase());
        
        let matchesClass = false;
        const classesObj = (s as any).classes?.fromClassList || [];
        matchesClass = classesObj.some((c: any) => c.name.toLowerCase() === characterClass.toLowerCase());
        
        const type = getCasterType(characterClass);
        const slotsArray = getSpellSlots(characterLevel, type);
        let maxSpellLevelAvailable = 0;
        for (let i = 1; i <= 9; i++) {
             if (slotsArray[i] > 0) maxSpellLevelAvailable = i;
        }
        if (type === 'warlock') {
             if (slotsArray[1] > 0) maxSpellLevelAvailable = Math.max(maxSpellLevelAvailable, 1);
        }
        const isLevelAllowed = s.level <= Math.max(maxSpellLevelAvailable, characterLevel > 0 ? Math.ceil(characterLevel / 2) : 1);
        const isAllowedByPower = s.level === 0 || isLevelAllowed;

        // Advanced Filters
        let matchesLevel = true;
        if (filterLevel !== "all") {
            matchesLevel = s.level.toString() === filterLevel;
        }

        let matchesSchool = true;
        if (filterSchool !== "all") {
            matchesSchool = s.school === filterSchool;
        }

        let matchesTime = true;
        if (filterTime !== "all" && s.time && s.time.length > 0) {
            matchesTime = s.time[0].unit === filterTime;
        }

        let matchesComponents = true;
        if (filterComponents !== "all" && s.components) {
            if (filterComponents === "verbal") matchesComponents = !!s.components.v;
            if (filterComponents === "somatic") matchesComponents = !!s.components.s;
            if (filterComponents === "material") matchesComponents = !!s.components.m;
            if (filterComponents === "no-material") matchesComponents = !s.components.m;
        }

        return matchesQuery && matchesClass && isAllowedByPower && matchesLevel && matchesSchool && matchesTime && matchesComponents;
    }).sort((a, b) => {
        if (a.level !== b.level) return a.level - b.level;
        return a.name.localeCompare(b.name);
    });
  }, [allSpells, searchQuery, characterClass, characterLevel, filterLevel, filterSchool, filterTime, filterComponents]);

  const togglePrepare = (spellName: string) => {
      setMySpells(prev => prev.map(s => s.name === spellName ? { ...s, prepared: !s.prepared } : s));
  };

  const removeSpell = (spellName: string) => {
      setMySpells(prev => prev.filter(s => s.name !== spellName));
  };

  const addSpell = (spell: Spell) => {
      if (!mySpells.find(s => s.name === spell.name)) {
          setMySpells(prev => [...prev, { ...spell, prepared: spell.level === 0 }]);
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
             <h1 className="text-4xl md:text-5xl font-serif font-black tracking-tighter text-[var(--gold-accent)] uppercase">
               Advanced Spellbook
             </h1>
             <p className="text-sm md:text-base opacity-70 mt-2 font-serif italic text-white/80">
               Master the arcane, shape the elements, and warp reality itself.
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
                            className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--gold-accent)] font-mono text-center"
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
                             <div key={lvl} className="flex flex-col items-center p-2 bg-[var(--gold-accent)]/5 border border-[var(--gold-accent)]/30 rounded-lg text-center relative overflow-hidden group">
                                 <span className="text-[10px] uppercase font-bold text-[var(--gold-accent)]/80">Level {lvl}</span>
                                 <div className="flex items-center gap-1 my-1">
                                    <span className="font-mono text-lg font-bold text-white">{data.current}</span>
                                    <span className="text-xs text-white/50">/</span>
                                    <span className="font-mono text-sm text-white/70">{data.max}</span>
                                 </div>
                                 <button 
                                     onClick={() => handleUseSlot(lvl)}
                                     disabled={data.current === 0}
                                     className="text-[10px] w-full py-1 mt-1 font-bold uppercase tracking-widest bg-[var(--gold-accent)]/10 text-[var(--gold-accent)] hover:bg-[var(--gold-accent)]/30 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
                                       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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
                                               <p className="text-[10px] uppercase font-bold tracking-widest text-[#a8a29e] ml-6 opacity-70">
                                                   {spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`} • {SCHOOL_MAP[spell.school] || spell.school} 
                                                   {spell.time && spell.time.length > 0 && ` • ${spell.time[0].number} ${spell.time[0].unit}`}
                                               </p>
                                           </div>
                                           <div className="flex items-center gap-2 shrink-0 self-end sm:self-center ml-6 sm:ml-0">
                                               {spell.level > 0 && (
                                                   <button 
                                                       onClick={() => togglePrepare(spell.name)}
                                                       className={`px-3 py-1.5 border rounded text-[10px] font-bold uppercase tracking-widest transition-colors ${spell.prepared ? 'bg-[var(--gold-accent)]/20 border-[var(--gold-accent)] text-[var(--gold-accent)]' : 'text-white/40 border-white/20 hover:border-white/50'}`}
                                                   >
                                                       {spell.prepared ? 'Prepared' : 'Unprepared'}
                                                   </button>
                                               )}
                                               <button onClick={() => removeSpell(spell.name)} className="text-[var(--blood-red)] border border-[var(--blood-red)]/20 rounded p-1.5 opacity-60 hover:opacity-100 hover:bg-[var(--blood-red)]/20 transition-all">
                                                   <Trash2 size={14} />
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
                           <Search size={20} className="text-[var(--gold-accent)]" /> Global Spell Archive
                       </h2>
                       <div className="flex items-center gap-2 w-full sm:w-auto">
                         <div className="relative flex-1 sm:w-64">
                             <input 
                                 type="text" 
                                 placeholder="Search..." 
                                 value={searchQuery}
                                 onChange={(e) => setSearchQuery(e.target.value)}
                                 className="w-full bg-black/60 border border-white/20 rounded-full pl-10 pr-4 py-2 text-sm italic outline-none focus:border-[var(--gold-accent)]"
                             />
                             <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                         </div>
                         <button 
                            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                            className={`p-2 rounded-full border transition-all ${showAdvancedFilters ? 'bg-[var(--gold-accent)] border-[var(--gold-accent)] text-black' : 'bg-white/5 border-white/20 text-white/60 hover:text-white'}`}
                         >
                            <Filter size={16} />
                         </button>
                       </div>
                   </div>

                   <AnimatePresence>
                     {showAdvancedFilters && (
                       <motion.div 
                         initial={{ height: 0, opacity: 0 }}
                         animate={{ height: 'auto', opacity: 1 }}
                         exit={{ height: 0, opacity: 0 }}
                         className="overflow-hidden mb-6"
                       >
                         <div className="bg-white/5 border border-white/10 rounded-lg p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                               <label className="text-[10px] uppercase font-bold tracking-widest text-[#a8a29e] mb-1 block">Spell Level</label>
                               <select 
                                 value={filterLevel} 
                                 onChange={(e) => setFilterLevel(e.target.value)}
                                 className="w-full bg-black/60 border border-white/10 rounded px-2 py-1 text-xs outline-none focus:border-[var(--gold-accent)]"
                               >
                                 <option value="all">Any Level</option>
                                 <option value="0">Cantrip</option>
                                 {[1,2,3,4,5,6,7,8,9].map(lvl => <option key={lvl} value={lvl.toString()}>Level {lvl}</option>)}
                               </select>
                            </div>
                            <div>
                               <label className="text-[10px] uppercase font-bold tracking-widest text-[#a8a29e] mb-1 block">School</label>
                               <select 
                                 value={filterSchool} 
                                 onChange={(e) => setFilterSchool(e.target.value)}
                                 className="w-full bg-black/60 border border-white/10 rounded px-2 py-1 text-xs outline-none focus:border-[var(--gold-accent)]"
                               >
                                 <option value="all">Every School</option>
                                 {Object.entries(SCHOOL_MAP).map(([key, value]) => (
                                   <option key={key} value={key}>{value}</option>
                                 ))}
                               </select>
                            </div>
                            <div>
                               <label className="text-[10px] uppercase font-bold tracking-widest text-[#a8a29e] mb-1 block">Cast Time</label>
                               <select 
                                 value={filterTime} 
                                 onChange={(e) => setFilterTime(e.target.value)}
                                 className="w-full bg-black/60 border border-white/10 rounded px-2 py-1 text-xs outline-none focus:border-[var(--gold-accent)]"
                               >
                                 <option value="all">Any Time</option>
                                 <option value="action">Action</option>
                                 <option value="bonus">Bonus Action</option>
                                 <option value="reaction">Reaction</option>
                                 <option value="minute">Minute+</option>
                               </select>
                            </div>
                            <div>
                               <label className="text-[10px] uppercase font-bold tracking-widest text-[#a8a29e] mb-1 block">Components</label>
                               <select 
                                 value={filterComponents} 
                                 onChange={(e) => setFilterComponents(e.target.value)}
                                 className="w-full bg-black/60 border border-white/10 rounded px-2 py-1 text-xs outline-none focus:border-[var(--gold-accent)]"
                               >
                                 <option value="all">Any Components</option>
                                 <option value="verbal">Verbal (V)</option>
                                 <option value="somatic">Somatic (S)</option>
                                 <option value="material">Material (M)</option>
                                 <option value="no-material">No Material</option>
                               </select>
                            </div>
                         </div>
                       </motion.div>
                     )}
                   </AnimatePresence>

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
                                       <div className="flex items-center gap-3 flex-1">
                                           {isExpanded ? <ChevronDown size={16} className="text-[var(--gold-accent)]" /> : <ChevronRight size={16} className="opacity-50" />}
                                           <div>
                                               <h4 className="font-serif font-bold text-sm text-[var(--parchment)]">{spell.name}</h4>
                                               <p className="text-[10px] uppercase font-bold tracking-widest opacity-50 flex items-center gap-2">
                                                   <span>{spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`}</span>
                                                   <span className="w-1 h-1 bg-white/30 rounded-full" />
                                                   <span>{SCHOOL_MAP[spell.school] || spell.school}</span>
                                               </p>
                                           </div>
                                       </div>
                                       <button 
                                           onClick={(e) => {
                                               e.stopPropagation();
                                               if (!isAdded) addSpell(spell);
                                           }}
                                           disabled={isAdded}
                                           className={`p-2 rounded border transition-all flex items-center justify-center shrink-0 ${isAdded ? 'bg-green-500/20 border-green-500/50 text-green-400 cursor-default tracking-widest text-[8px] font-bold px-3 py-1 uppercase' : 'bg-white/5 border-white/20 text-white hover:bg-[var(--gold-accent)]/20 hover:border-[var(--gold-accent)]/50 hover:text-[var(--gold-accent)]'}`}
                                       >
                                           {isAdded ? 'Scribed' : <Plus size={16} />}
                                       </button>
                                   </div>
                                   {isExpanded && (
                                       <div className="mt-4 ml-7 space-y-3">
                                            <div className="flex flex-wrap gap-2 mb-2">
                                                {spell.time && spell.time.length > 0 && (
                                                    <span className="px-2 py-1 bg-black/40 border border-white/10 rounded text-[9px] uppercase tracking-widest font-bold text-white/70">
                                                        Time: {spell.time[0].number} {spell.time[0].unit}
                                                    </span>
                                                )}
                                                {spell.components && (
                                                    <span className="px-2 py-1 bg-black/40 border border-white/10 rounded text-[9px] uppercase tracking-widest font-bold text-white/70">
                                                        Comp: {[spell.components.v && 'V', spell.components.s && 'S', spell.components.m && 'M'].filter(Boolean).join(', ')}
                                                    </span>
                                                )}
                                                {spell.range && spell.range.distance && (
                                                    <span className="px-2 py-1 bg-black/40 border border-white/10 rounded text-[9px] uppercase tracking-widest font-bold text-white/70">
                                                        Range: {spell.range.distance.amount} {spell.range.distance.type}
                                                    </span>
                                                )}
                                            </div>
                                           <div className="p-3 bg-black/60 border border-white/5 rounded text-xs italic text-[var(--parchment)]/70">
                                               {extractText(spell.entries)}
                                           </div>
                                       </div>
                                   )}
                               </div>
                           );
                       })}
                       {availableSpells.length === 0 && (
                           <div className="p-8 text-center border border-dashed border-white/10 rounded-lg">
                               <p className="font-serif italic text-white/50">No spells match your complex arcane filters.</p>
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

