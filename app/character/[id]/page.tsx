'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Save, 
  Trash2, 
  Zap, 
  Swords, 
  Wand2, 
  Backpack, 
  Scroll, 
  Settings,
  Shield,
  Search
} from 'lucide-react';
import { useCharacter } from '@/hooks/use-character';
import { MythosButton } from '@/components/mythos/UI';
import { AttributesPanel } from '@/components/mythos/AttributesPanel';
import { CombatPanel } from '@/components/mythos/CombatPanel';
import { SpellbookPanel } from '@/components/mythos/SpellbookPanel';
import { InventoryPanel } from '@/components/mythos/InventoryPanel';
import { JournalPanel } from '@/components/mythos/JournalPanel';
import { PortraitPanel } from '@/components/mythos/PortraitPanel';
import DiceRoller from '@/components/DiceRoller';

type TabId = 'main' | 'combat' | 'spells' | 'inventory' | 'journal' | 'settings';

export default function CharacterSheet() {
  const router = useRouter();
  const { character, loading, saving, updateCharacter, deleteCharacter } = useCharacter();
  const [activeTab, setActiveTab] = useState<TabId>('main');

  if (loading || !character) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--deep-slate)]">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 4, ease: "linear" }} className="text-[var(--gold-accent)]">
           <Scroll size={48} />
        </motion.div>
      </div>
    );
  }

  const tabs: { id: TabId; label: string; icon: any }[] = [
    { id: 'main', label: 'Attributes', icon: Zap },
    { id: 'combat', label: 'Combat', icon: Swords },
    { id: 'spells', label: 'Spellbook', icon: Wand2 },
    { id: 'inventory', label: 'Vault', icon: Backpack },
    { id: 'journal', label: 'Chronicle', icon: Scroll },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[var(--deep-slate)] pb-24 text-[var(--parchment)] font-sans">
      {/* Top Banner */}
      <header className="sticky top-0 z-40 bg-[var(--deep-slate)]/80 backdrop-blur-md border-b border-[var(--gold-accent)]/20">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
             <button 
               onClick={() => router.push('/')} 
               className="p-3 border border-[var(--gold-accent)]/20 rounded-full text-[var(--gold-accent)] hover:bg-[var(--gold-accent)] hover:text-black transition-all"
             >
               <ArrowLeft size={18} />
             </button>
             <div>
                <h1 className="font-serif italic font-black text-3xl text-[var(--gold-accent)] tracking-tighter">
                   {character.name}
                </h1>
                <div className="text-[10px] uppercase font-bold opacity-30 tracking-[0.2em] flex items-center gap-2">
                   <span>Level {character.level} {character.race} {character.class}</span>
                </div>
             </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
               onClick={deleteCharacter}
               className="p-3 text-[var(--blood-red)]/40 hover:text-[var(--blood-red)] transition-colors"
            >
               <Trash2 size={20} />
            </button>
            <MythosButton 
              onClick={() => updateCharacter({ persist: true })} 
              disabled={saving}
              className="min-w-[140px]"
            >
              {saving ? 'Etching...' : 'Etch Script'}
            </MythosButton>
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 flex gap-8 overflow-x-auto scrollbar-hide">
           {tabs.map(tab => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={`flex items-center gap-2 py-4 border-b-2 font-bold uppercase text-[10px] tracking-[0.2em] transition-all whitespace-nowrap ${
                 activeTab === tab.id 
                  ? 'border-[var(--gold-accent)] text-[var(--gold-accent)]' 
                  : 'border-transparent text-white/30 hover:text-white'
               }`}
             >
               <tab.icon size={14} />
               {tab.label}
             </button>
           ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Sidebar */}
        <aside className="lg:col-span-4 lg:sticky lg:top-48 h-fit">
           <PortraitPanel 
             character={character} 
             updateCharacter={updateCharacter}
             onPortraitClick={() => {}} // TODO: Portrait Modal
             onLevelUp={() => updateCharacter({ level: (character.level || 1) + 1, persist: true })}
           />
        </aside>

        {/* Dynamic Content */}
        <section className="lg:col-span-8 overflow-hidden min-h-[60vh]">
          <AnimatePresence mode="wait">
            {activeTab === 'main' && (
              <AttributesPanel key="main" character={character} updateCharacter={updateCharacter} />
            )}
            {activeTab === 'combat' && (
              <CombatPanel key="combat" character={character} updateCharacter={updateCharacter} />
            )}
            {activeTab === 'spells' && (
              <SpellbookPanel key="spells" character={character} updateCharacter={updateCharacter} />
            )}
            {activeTab === 'inventory' && (
              <InventoryPanel key="inventory" character={character} updateCharacter={updateCharacter} />
            )}
            {activeTab === 'journal' && (
              <JournalPanel key="journal" character={character} updateCharacter={updateCharacter} />
            )}
            {/* Other tabs can be added similarly */}
            {['settings'].includes(activeTab) && (
              <motion.div 
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-32 border-2 border-dashed border-white/5 rounded-3xl"
              >
                 <Search size={48} className="opacity-10 mb-4" />
                 <p className="font-serif italic text-lg opacity-40 uppercase tracking-widest">Archive expansion pending...</p>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      <DiceRoller />
      
      {/* Decorative Background Element */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[-1]">
         <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[var(--gold-accent)] rounded-full blur-[150px]" />
         <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-[var(--magic-blue)] rounded-full blur-[150px]" />
      </div>
    </div>
  );
}
