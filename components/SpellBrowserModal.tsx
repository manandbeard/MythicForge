"use client";

import React, { useState, useEffect } from "react";
import { X, Search, Sparkles, Check, ChevronDown, ChevronRight, Plus } from "lucide-react";
import { MythosPanel, MythosLabel, MythosButton, MythosInput } from "./mythos/UI";
import { motion, AnimatePresence } from "framer-motion";

interface SpellBrowserModalProps {
  onClose: () => void;
  onAddSpells: (spells: any[]) => void;
  existingSpellIds: string[];
}

export function SpellBrowserModal({ onClose, onAddSpells, existingSpellIds }: SpellBrowserModalProps) {
  const [spells, setSpells] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filters
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState("all");
  const [school, setSchool] = useState("all");
  const [sort, setSort] = useState("level_asc");
  
  const [selectedSpells, setSelectedSpells] = useState<Set<string>>(new Set());
  const [expandedSpell, setExpandedSpell] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchSpells = async () => {
      setLoading(true);
      try {
        const u = new URL("/api/data/spells", window.location.origin);
        if (query) u.searchParams.set("q", query);
        if (level && level !== "all") u.searchParams.set("level", level);
        if (school && school !== "all") u.searchParams.set("school", school);
        if (sort) u.searchParams.set("sort", sort);
        // fetch all for browsing
        u.searchParams.set("limit", "all");

        const res = await fetch(u.toString());
        if (res.ok && active) {
          const data = await res.json();
          setSpells(data);
        }
      } catch (err) {
        console.error("Failed to fetch spells for browser", err);
      } finally {
        if (active) setLoading(false);
      }
    };
    
    const timer = setTimeout(fetchSpells, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, level, school, sort]);

  const schools = ["A", "C", "D", "E", "EN", "I", "N", "T", "V"]; // basic 5e tools codes
  const schoolNames: Record<string, string> = {
    "A": "Abjuration",
    "C": "Conjuration",
    "D": "Divination",
    "E": "Evocation",
    "EN": "Enchantment",
    "I": "Illusion",
    "N": "Necromancy",
    "T": "Transmutation",
    "V": "Variable"
  };

  const toggleSelect = (spell: any) => {
    const next = new Set(selectedSpells);
    if (next.has(spell.id)) next.delete(spell.id);
    else next.add(spell.id);
    setSelectedSpells(next);
  };

  const handleAdd = () => {
    const toAdd = spells.filter(s => selectedSpells.has(s.id));
    onAddSpells(toAdd);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm shadow-2xl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-4xl h-[85vh] flex flex-col bg-neutral-900 border border-[var(--gold-accent)]/30 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(197,160,89,0.1)] relative"
      >
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-black/40">
          <div>
            <h2 className="text-2xl font-serif italic text-[var(--gold-accent)] font-bold">Arcane Archive</h2>
            <p className="text-xs text-neutral-400 uppercase tracking-widest mt-1">Browse & Inscribe Spells</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-4 bg-black/20 border-b border-white/5 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={16} />
            <MythosInput
              placeholder="Search spells by name..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full pl-9 bg-black/40 border-none"
            />
          </div>
          <select
             value={level}
             onChange={e => setLevel(e.target.value)}
             className="bg-black/60 border border-white/10 px-3 py-2 rounded-xl text-sm text-[var(--parchment)] focus:border-[var(--gold-accent)]/50 focus:outline-none uppercase tracking-widest font-bold min-h-[44px]"
           >
             <option value="all">Level: All</option>
             <option value="0">Cantrips</option>
             {[1,2,3,4,5,6,7,8,9].map(lvl => (
                <option key={lvl} value={lvl.toString()}>Level {lvl}</option>
             ))}
           </select>
           <select
             value={school}
             onChange={e => setSchool(e.target.value)}
             className="bg-black/60 border border-white/10 px-3 py-2 rounded-xl text-sm text-[var(--parchment)] focus:border-[var(--gold-accent)]/50 focus:outline-none uppercase tracking-widest font-bold min-h-[44px] max-w-full sm:max-w-[160px]"
           >
             <option value="all">School: All</option>
             {schools.map(s => (
                <option key={s} value={s.toLowerCase()}>{schoolNames[s]}</option>
             ))}
           </select>
           <select
             value={sort}
             onChange={e => setSort(e.target.value)}
             className="bg-black/60 border border-white/10 px-3 py-2 rounded-xl text-sm text-[var(--parchment)] focus:border-[var(--gold-accent)]/50 focus:outline-none uppercase tracking-widest font-bold min-h-[44px]"
           >
             <option value="level_asc">Sort: Lvl Asc</option>
             <option value="level_desc">Sort: Lvl Desc</option>
             <option value="name_asc">Sort: Name A-Z</option>
             <option value="name_desc">Sort: Name Z-A</option>
           </select>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading && spells.length === 0 ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin text-[var(--gold-accent)] opacity-50"><Sparkles size={24} /></div>
            </div>
          ) : spells.length === 0 ? (
            <div className="text-center py-12 text-white/40 italic font-serif">
              No magical texts found matching these parameters.
            </div>
          ) : (
            spells.map((spell) => {
              const spellSchoolName = spellSchoolNames[spell.school?.toUpperCase()] || spell.school || "Unknown";
              const isSelected = selectedSpells.has(spell.id);
              const isAlreadyInSpellbook = existingSpellIds.includes(spell.id);

              return (
                <div 
                  key={spell.id}
                  className={`bg-neutral-800/40 border transition-colors rounded-xl overflow-hidden ${
                    isSelected ? "border-[var(--gold-accent)]" : "border-white/5 hover:border-white/20"
                  } ${isAlreadyInSpellbook ? 'opacity-50 grayscale' : ''}`}
                >
                  <div 
                    className="flex items-center gap-4 p-4 cursor-pointer"
                    onClick={() => {
                      if (!isAlreadyInSpellbook) toggleSelect(spell);
                    }}
                  >
                    <button 
                      className={`w-5 h-5 rounded flex items-center justify-center border transition-colors shrink-0 ${
                        isAlreadyInSpellbook ? 'bg-white/10 border-white/10 cursor-not-allowed' :
                        isSelected ? "bg-[var(--gold-accent)] border-[var(--gold-accent)] text-black" : "bg-black/40 border-white/20"
                      }`}
                    >
                      {(isSelected || isAlreadyInSpellbook) && <Check size={14} />}
                    </button>
                    <div className="flex-1 min-w-0">
                       <h3 className="font-serif italic font-bold text-neutral-200 truncate pr-4 text-base">
                         {spell.name} {isAlreadyInSpellbook && <span className="text-xs uppercase ml-2 text-white/50 tracking-widest font-sans not-italic">In Spellbook</span>}
                       </h3>
                       <div className="text-[10px] uppercase tracking-widest text-neutral-500 mt-1 truncate">
                         Level {spell.level === 0 || spell.level === "0" ? 'Cantrip' : spell.level} • {spellSchoolName}
                       </div>
                    </div>
                    <button
                      className="p-2 text-neutral-500 hover:text-neutral-300"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedSpell(expandedSpell === spell.id ? null : spell.id);
                      }}
                    >
                      {expandedSpell === spell.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </button>
                  </div>
                  
                  <AnimatePresence>
                    {expandedSpell === spell.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-4 pb-4 pt-0 border-t border-white/5 bg-black/20 text-sm"
                      >
                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 mb-4 text-[10px] uppercase font-bold tracking-tighter opacity-70">
                            <div><span className="text-[var(--gold-accent)] opacity-80 block mb-0.5">Time</span> {spell.time || '1 Action'}</div>
                            <div><span className="text-[var(--gold-accent)] opacity-80 block mb-0.5">Range</span> {spell.range || '60ft'}</div>
                            <div><span className="text-[var(--gold-accent)] opacity-80 block mb-0.5">Components</span> {spell.components || 'V, S'}</div>
                            <div><span className="text-[var(--gold-accent)] opacity-80 block mb-0.5">Duration</span> {spell.duration || 'Instantaneous'}</div>
                         </div>
                         <div className="font-serif text-sm opacity-80 leading-relaxed whitespace-pre-wrap">
                            {spell.entries ? renderEntries(spell.entries) : (spell.description || "No description provided.")}
                         </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          )}
        </div>

        <div className="p-4 border-t border-white/10 bg-black/40 flex justify-end gap-3">
          <MythosButton variant="secondary" onClick={onClose}>
            Cancel
          </MythosButton>
          <MythosButton 
            disabled={selectedSpells.size === 0}
            onClick={handleAdd}
            className="flex items-center gap-2"
          >
            <Plus size={16} /> Inscribe {selectedSpells.size > 0 ? selectedSpells.size : ''} Spells
          </MythosButton>
        </div>
      </motion.div>
    </div>
  );
}

function renderEntries(entries: any): string {
  if (!entries) return "";
  if (typeof entries === 'string') return entries;
  if (Array.isArray(entries)) {
    return entries.map(e => renderEntries(e)).filter(Boolean).join('\n\n');
  }
  if (typeof entries === 'object') {
     if (entries.type === 'entries') return `${entries.name ? entries.name + ': ' : ''}${renderEntries(entries.entries)}`;
     if (entries.type === 'list' && entries.items) return entries.items.map((i: any) => `• ${renderEntries(i)}`).join('\n');
     if (entries.type === 'table') return '[Table Data omitted for brevity]';
     if (entries.type === 'entries' && !entries.entries) return entries.name || '';
     if (entries.type === 'options') return renderEntries(entries.entries);
     if (entries.items) return entries.items.map((i:any)=>renderEntries(i)).join('\n');
     if (entries.entries) return renderEntries(entries.entries);
     
     // Fallback for object with no known type
     return '';
  }
  return String(entries);
}

const spellSchoolNames: Record<string, string> = {
  "A": "Abjuration",
  "C": "Conjuration",
  "D": "Divination",
  "E": "Evocation",
  "EN": "Enchantment",
  "I": "Illusion",
  "N": "Necromancy",
  "T": "Transmutation",
  "V": "Variable"
};
