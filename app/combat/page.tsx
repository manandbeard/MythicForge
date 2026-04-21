"use client";

import React, { useState } from "react";
import { Link as LinkIcon, ArrowLeft, Shield, Heart, Skull, Swords, RefreshCw, Plus, Minus, UserRound, Zap, Settings, Trash2 } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";

interface Combatant {
  id: string;
  name: string;
  type: 'player' | 'enemy';
  hp: number;
  maxHp: number;
  ac: number;
  init: number;
  statuses: string[];
}

const COMMON_STATUSES = ["Blinded", "Charmed", "Deafened", "Frightened", "Grappled", "Incapacitated", "Invisible", "Paralyzed", "Petrified", "Poisoned", "Prone", "Restrained", "Stunned", "Unconscious"];

export default function CombatTracker() {
  const [combatants, setCombatants] = useState<Combatant[]>([]);
  const [activeTurnId, setActiveTurnId] = useState<string | null>(null);
  
  // Add form state
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<'player'|'enemy'>("enemy");
  const [newHp, setNewHp] = useState<number>(10);
  const [newAc, setNewAc] = useState<number>(10);
  const [newInit, setNewInit] = useState<number>(0);

  // Status popover state
  const [statusMenuOpen, setStatusMenuOpen] = useState<string | null>(null);

  const addCombatant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const newChar: Combatant = {
      id: Math.random().toString(),
      name: newName,
      type: newType,
      hp: newHp,
      maxHp: newHp,
      ac: newAc,
      init: newInit,
      statuses: []
    };
    const updated = [...combatants, newChar];
    // Keep it sorted by initiative if already sorted, else just sort them
    updated.sort((a, b) => b.init - a.init);
    setCombatants(updated);
    
    setNewName("");
    setNewInit(0);
    // Don't clear HP/AC/Type to make adding many enemies faster
  };

  const updateHp = (id: string, delta: number) => {
    setCombatants(prev => prev.map(c => {
      if (c.id === id) {
        return { ...c, hp: Math.max(0, Math.min(c.maxHp, c.hp + delta)) };
      }
      return c;
    }));
  };

  const toggleStatus = (id: string, status: string) => {
    setCombatants(prev => prev.map(c => {
      if (c.id === id) {
        if (c.statuses.includes(status)) {
           return { ...c, statuses: c.statuses.filter(s => s !== status) };
        } else {
           return { ...c, statuses: [...c.statuses, status] };
        }
      }
      return c;
    }));
  };

  const removeCombatant = (id: string) => {
    setCombatants(prev => prev.filter(c => c.id !== id));
    if (activeTurnId === id) setActiveTurnId(null);
  };

  const nextTurn = () => {
    if (combatants.length === 0) return;
    if (!activeTurnId) {
       setActiveTurnId(combatants[0].id);
       return;
    }
    const currentIndex = combatants.findIndex(c => c.id === activeTurnId);
    const nextIndex = (currentIndex + 1) % combatants.length;
    setActiveTurnId(combatants[nextIndex].id);
  };

  const sortInitiative = () => {
    const sorted = [...combatants].sort((a, b) => b.init - a.init);
    setCombatants(sorted);
  };

  const clearCombat = () => {
    if (confirm("Clear all combatants?")) {
      setCombatants([]);
      setActiveTurnId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--deep-slate)] text-[var(--parchment)] p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
         <header className="flex justify-between items-center mb-8 border-b-2 border-[var(--blood-red)] pb-4">
          <div>
            <Link href="/" className="inline-flex items-center text-[var(--blood-red)] hover:opacity-80 transition-opacity mb-4">
              <ArrowLeft size={16} className="mr-2" /> Return to Archive
            </Link>
            <h1 className="text-4xl md:text-5xl font-serif font-black tracking-tighter text-[var(--blood-red)] uppercase flex items-center gap-4">
              <Swords size={36} /> Combat Tracker
            </h1>
            <p className="text-sm md:text-base opacity-70 mt-2 font-serif italic text-[#a8a29e]">
              Roll for initiative. The battle has begun.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
           {/* Sidebar: Add Combatant */}
           <div className="lg:col-span-4 space-y-6">
              <form onSubmit={addCombatant} className="p-6 bg-black/40 border border-[var(--blood-red)]/30 rounded-xl shadow-[0_0_15px_rgba(220,38,38,0.1)]">
                 <h2 className="font-serif italic text-xl text-[var(--blood-red)] mb-4 flex items-center gap-2">
                    <UserRound size={20} /> Add Combatant
                 </h2>
                 
                 <div className="space-y-4">
                    <div>
                        <label className="text-[10px] uppercase font-bold tracking-widest text-[#a8a29e] mb-1 block">Name</label>
                        <input 
                            type="text" required
                            value={newName} onChange={(e) => setNewName(e.target.value)}
                            className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--blood-red)] text-white font-mono"
                            placeholder="e.g. Goblin 1"
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="text-[10px] uppercase font-bold tracking-widest text-[#a8a29e] mb-1 block">Type</label>
                          <select 
                             value={newType} onChange={(e) => setNewType(e.target.value as 'player'|'enemy')}
                             className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm italic outline-none focus:border-[var(--blood-red)]"
                          >
                              <option value="enemy">Enemy / NPC</option>
                              <option value="player">Player Character</option>
                          </select>
                       </div>
                       <div>
                          <label className="text-[10px] uppercase font-bold tracking-widest text-[#a8a29e] mb-1 block">Initiative</label>
                          <input 
                             type="number" required
                             value={newInit} onChange={(e) => setNewInit(parseInt(e.target.value) || 0)}
                             className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-center outline-none focus:border-[var(--blood-red)]"
                          />
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="text-[10px] uppercase font-bold tracking-widest text-[#a8a29e] mb-1 flex items-center gap-1"><Heart size={10}/> Max HP</label>
                          <input 
                             type="number" min={1} required
                             value={newHp} onChange={(e) => setNewHp(parseInt(e.target.value) || 1)}
                             className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-center outline-none focus:border-[var(--blood-red)]"
                          />
                       </div>
                       <div>
                          <label className="text-[10px] uppercase font-bold tracking-widest text-[#a8a29e] mb-1 flex items-center gap-1"><Shield size={10}/> Arm. Class</label>
                          <input 
                             type="number" min={1} required
                             value={newAc} onChange={(e) => setNewAc(parseInt(e.target.value) || 10)}
                             className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-center outline-none focus:border-[var(--blood-red)]"
                          />
                       </div>
                    </div>

                    <button 
                       type="submit"
                       className="w-full flex justify-center items-center gap-2 bg-[var(--blood-red)]/20 text-[var(--blood-red)] border border-[var(--blood-red)]/50 p-3 rounded hover:bg-[var(--blood-red)] hover:text-black transition-all uppercase tracking-widest font-bold text-sm mt-2"
                    >
                       <Plus size={16} /> Enter Fray
                    </button>
                 </div>
              </form>
              
              <div className="p-4 bg-black/40 border border-white/10 rounded-xl space-y-3">
                 <button onClick={nextTurn} disabled={combatants.length === 0} className="w-full bg-[var(--gold-accent)] text-black border border-[var(--gold-accent)] p-3 rounded hover:bg-[var(--gold-accent)]/80 transition-all uppercase tracking-widest font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                    <Zap size={16} /> Next Turn
                 </button>
                 <div className="flex gap-2">
                    <button onClick={sortInitiative} disabled={combatants.length === 0} className="flex-1 bg-white/5 text-white border border-white/20 p-2 rounded hover:bg-white/10 transition-all uppercase tracking-widest font-bold text-[10px] disabled:opacity-50">
                       Sort Init
                    </button>
                    <button onClick={clearCombat} disabled={combatants.length === 0} className="flex-1 bg-[var(--blood-red)]/10 text-[var(--blood-red)] border border-[var(--blood-red)]/30 p-2 rounded hover:bg-[var(--blood-red)]/30 transition-all uppercase tracking-widest font-bold text-[10px] disabled:opacity-50">
                       Clear All
                    </button>
                 </div>
              </div>
           </div>

           {/* Main: Initiative Board */}
           <div className="lg:col-span-8 flex flex-col gap-3 relative pb-32">
              <AnimatePresence>
                 {combatants.map((combatant, index) => {
                    const isActive = combatant.id === activeTurnId;
                    const isDead = combatant.hp <= 0;
                    
                    return (
                       <motion.div 
                          layout
                          key={combatant.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className={`relative p-4 md:p-5 rounded-xl border transition-colors duration-300 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                             isActive 
                               ? 'bg-black border-[var(--gold-accent)] shadow-[0_0_20px_rgba(197,160,89,0.3)]' 
                               : isDead 
                                  ? 'bg-black/60 border-[var(--blood-red)]/20 opacity-60 grayscale'
                                  : 'bg-black/40 border-white/10 hover:border-white/20'
                          }`}
                       >
                          {/* Active Indicator */}
                          {isActive && (
                            <div className="absolute left-0 top-0 bottom-0 w-2 bg-[var(--gold-accent)] rounded-l-xl animate-pulse" />
                          )}

                          {/* Info area */}
                          <div className="flex items-center gap-4 flex-1 w-full pl-2">
                             <div className="w-12 h-12 shrink-0 bg-white/5 border border-white/10 rounded flex flex-col items-center justify-center relative group">
                                <span className="text-[10px] uppercase font-bold text-white/50 tracking-widest absolute -top-2 bg-[var(--deep-slate)] px-1">INIT</span>
                                <span className="text-xl font-bold font-mono">{combatant.init}</span>
                             </div>
                             
                             <div className="flex-1">
                                <h3 className={`text-xl font-serif font-bold flex items-center gap-2 ${combatant.type === 'player' ? 'text-blue-400' : 'text-[var(--blood-red)]'}`}>
                                   {isDead && <Skull size={18} />}
                                   {combatant.name}
                                </h3>
                                <div className="flex flex-wrap gap-1 mt-1 min-h-[24px]">
                                   {combatant.statuses.map(s => (
                                      <span key={s} className="px-2 py-[2px] bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded text-[10px] uppercase tracking-widest font-bold flex items-center gap-1">
                                         {s}
                                         <button onClick={() => toggleStatus(combatant.id, s)} className="hover:text-white"><Trash2 size={10} /></button>
                                      </span>
                                   ))}
                                   {combatant.statuses.length === 0 && <span className="text-xs italic opacity-30">No active statuses</span>}
                                </div>
                             </div>
                          </div>

                          {/* Controls area */}
                          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto p-4 md:p-0 bg-white/5 md:bg-transparent rounded-lg border border-white/5 md:border-none">
                              {/* HP & AC block */}
                              <div className="flex items-center gap-4 w-full sm:w-auto justify-center">
                                 <div className="flex items-center bg-black/60 rounded border border-white/10 h-12 w-28 relative">
                                    <span className="text-[8px] absolute top-1 left-2 font-bold tracking-widest opacity-50 uppercase text-green-400"><Heart size={8} className="inline mr-1"/>HP</span>
                                    <button onClick={() => updateHp(combatant.id, -1)} className="h-full px-2 hover:bg-white/10 text-[var(--blood-red)] rounded-l border-r border-white/10"><Minus size={14}/></button>
                                    <div className="flex-1 text-center font-mono font-bold text-sm w-12 flex items-center justify-center">
                                       <span className={isDead ? 'text-[var(--blood-red)]' : 'text-white'}>{combatant.hp}</span>
                                       <span className="text-white/30 truncate text-xs mx-1">/</span>
                                       <span className="text-white/50 text-xs">{combatant.maxHp}</span>
                                    </div>
                                    <button onClick={() => updateHp(combatant.id, 1)} className="h-full px-2 hover:bg-white/10 text-green-400 rounded-r border-l border-white/10"><Plus size={14}/></button>
                                 </div>
                                 <div className="flex flex-col items-center justify-center w-12 h-12 bg-black/60 rounded border border-blue-400/30">
                                    <span className="text-[10px] uppercase font-bold text-blue-400 -mt-1"><Shield size={10} className="mb-0.5 inline mr-1"/>AC</span>
                                    <span className="font-mono font-bold text-white text-sm">{combatant.ac}</span>
                                 </div>
                              </div>

                              <div className="h-px w-full sm:w-px sm:h-8 bg-white/10" />

                              <div className="flex items-center gap-2">
                                 {/* Status Dropdown */}
                                 <div className="relative">
                                    <button 
                                       onClick={() => setStatusMenuOpen(statusMenuOpen === combatant.id ? null : combatant.id)}
                                       className="w-8 h-8 rounded border border-white/20 flex items-center justify-center hover:bg-white/10 hover:border-white/50 text-white transition-all overflow-hidden relative group"
                                       title="Add Status Condition"
                                    >
                                       <Settings size={14} className={`transition-transform duration-300 ${statusMenuOpen === combatant.id ? 'rotate-90' : ''}`} />
                                    </button>
                                    
                                    {statusMenuOpen === combatant.id && (
                                       <div className="absolute right-0 top-10 w-48 bg-[#0a0a0c] border border-white/20 rounded-lg shadow-xl z-50 p-2 grid grid-cols-1 gap-1 max-h-60 overflow-y-auto">
                                          <div className="text-[10px] font-bold uppercase tracking-widest text-[#a8a29e] mb-1 px-2">Toggle Status Map</div>
                                          {COMMON_STATUSES.map(s => {
                                             const hasStatus = combatant.statuses.includes(s);
                                             return (
                                                <button 
                                                   key={s}
                                                   onClick={() => { toggleStatus(combatant.id, s); setStatusMenuOpen(null); }}
                                                   className={`text-left px-2 py-1.5 rounded text-xs transition-colors flex items-center gap-2 ${hasStatus ? 'bg-[var(--blood-red)]/20 text-white' : 'hover:bg-white/10 text-white/70 hover:text-white'}`}
                                                >
                                                   <div className={`w-2 h-2 rounded-full border ${hasStatus ? 'bg-[var(--blood-red)] border-[var(--blood-red)]' : 'border-white/30'}`} />
                                                   {s}
                                                </button>
                                             );
                                          })}
                                       </div>
                                    )}
                                 </div>
                                 
                                 <button 
                                    onClick={() => removeCombatant(combatant.id)}
                                    className="w-8 h-8 rounded border border-[var(--blood-red)]/20 text-[var(--blood-red)] opacity-50 flex items-center justify-center hover:opacity-100 hover:bg-[var(--blood-red)]/10 hover:border-[var(--blood-red)] transition-all"
                                 >
                                    <Trash2 size={14} />
                                 </button>
                              </div>
                          </div>
                          
                       </motion.div>
                    );
                 })}
                 {combatants.length === 0 && (
                     <div className="w-full p-12 border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center opacity-50">
                        <Swords size={48} className="mb-4" />
                        <h2 className="font-serif italic text-2xl">The field is clear</h2>
                        <p className="text-sm mt-2">Add combatants using the panel to the left.</p>
                     </div>
                 )}
              </AnimatePresence>
           </div>
        </div>
      </div>
    </div>
  );
}
