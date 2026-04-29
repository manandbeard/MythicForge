'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from '@/lib/firebase';
import { fetchClasses, fetchRaces, fetchBackgrounds } from '@/lib/data-import';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, Save, Loader2, ArrowLeft } from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { MythosButton } from '@/components/mythos/UI';
import { IdentityStep } from '@/components/mythos/builder/IdentityStep';
import { SpeciesStep } from '@/components/mythos/builder/SpeciesStep';
import { AttributesStep } from '@/components/mythos/builder/AttributesStep';
import { LoreStep } from '@/components/mythos/builder/LoreStep';

const STEPS = ['Identity', 'Species', 'Order', 'Attributes', 'Lore'];
const DEFAULT_STATS = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };

export default function CharacterBuilder() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);

  // Character State
  const [name, setName] = useState('');
  const [background, setBackground] = useState('');
  const [race, setRace] = useState<any>(null);
  const [charClass, setCharClass] = useState<any>(null);
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [alignment, setAlignment] = useState('True Neutral');
  const [keywords, setKeywords] = useState('');
  const [backstoryText, setBackstoryText] = useState('');
  const [physicalDesc, setPhysicalDesc] = useState('');
  const [traits, setTraits] = useState('');
  const [saving, setSaving] = useState(false);

  // Library Data
  const [races, setRaces] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [backgroundData, setBackgroundData] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) router.push('/');
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [rData, cData, bData] = await Promise.all([fetchRaces(), fetchClasses(), fetchBackgrounds()]);
        setRaces(rData);
        setClasses(cData);
        setBackgroundData(bData);
      } catch (err) {
        console.error('Failed to load codex data', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleComplete = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const hpBase = charClass?.hd?.faces ? (Array.isArray(charClass.hd.faces) ? charClass.hd.faces[0] : charClass.hd.faces) : 10;
      const hp = hpBase + Math.floor((stats.con - 10) / 2);

      const docRef = await addDoc(collection(db, 'characters'), {
        uid: user.uid,
        name: name || 'Unnamed Hero',
        race: race?.name || 'Unknown',
        class: charClass?.name || 'Adventurer',
        background: background || 'Acolyte',
        level: 1,
        stats,
        alignment,
        backstoryText,
        physicalDesc,
        traits,
        hp: { current: hp, max: hp, temp: 0 },
        ac: 10 + Math.floor((stats.dex - 10) / 2),
        proficiencies: { saves: [], skills: [], expertise: [] },
        inventory: [],
        spells: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      router.push(`/character/${docRef.id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'characters');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--deep-slate)]">
        <Loader2 className="animate-spin text-[var(--gold-accent)] w-12 h-12" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--deep-slate)] text-[var(--parchment)] py-20 px-4">
      <div className="max-w-5xl mx-auto">
        <header className="mb-20 flex flex-col md:flex-row justify-between items-end gap-6 border-b border-[var(--gold-accent)]/20 pb-12">
          <div className="space-y-4">
             <button onClick={() => router.push('/')} className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest opacity-40 hover:opacity-100 transition-opacity">
                <ArrowLeft size={16} /> Retreat to Library
             </button>
             <h1 className="text-6xl font-serif font-black tracking-tighter text-[var(--gold-accent)]">
               MANIFEST<span className="italic font-light">HERO</span>
             </h1>
          </div>
          
          <div className="flex gap-4">
             {STEPS.map((s, i) => (
               <div key={s} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-serif italic font-bold border transition-all ${step === i ? 'bg-[var(--gold-accent)] text-[var(--deep-slate)] border-[var(--gold-accent)]' : 'border-white/10 opacity-30'}`}>
                     {i + 1}
                  </div>
                  {step === i && <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--gold-accent)] animate-in fade-in slide-in-from-left-2">{s}</span>}
               </div>
             ))}
          </div>
        </header>

        <div className="min-h-[50vh]">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <IdentityStep 
                key="id" 
                name={name} 
                setName={setName} 
                background={background} 
                setBackground={setBackground} 
                backgroundData={backgroundData} 
              />
            )}
            {step === 1 && (
              <SpeciesStep key="sp" race={race} setRace={setRace} races={races} />
            )}
            {step === 2 && (
              <div key="cl" className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {classes.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => setCharClass(c)}
                      className={cn(
                        "text-left p-6 rounded-xl border transition-all h-full flex flex-col justify-between",
                        charClass?.name === c.name ? "bg-[var(--gold-accent)]/10 border-[var(--gold-accent)] shadow-[0_0_20px_rgba(197,160,89,0.1)]" : "bg-black/40 border-white/5 hover:border-white/20"
                      )}
                    >
                      <div className="font-serif italic font-black text-xl mb-1">{c.name}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            {step === 3 && (
              <AttributesStep key="at" stats={stats} setStats={setStats} />
            )}
            {step === 4 && (
              <LoreStep
                key="lore"
                race={race?.name}
                charClass={charClass?.name}
                alignment={alignment}
                setAlignment={setAlignment}
                keywords={keywords}
                setKeywords={setKeywords}
                backstory={backstoryText}
                setBackstory={setBackstoryText}
                physicalDesc={physicalDesc}
                setPhysicalDesc={setPhysicalDesc}
                traits={traits}
                setTraits={setTraits}
              />
            )}
          </AnimatePresence>
        </div>

        <footer className="mt-20 flex justify-between pt-12 border-t border-white/5">
           <MythosButton variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
             <ChevronLeft size={18} /> Previous Cycle
           </MythosButton>
           
           {step < STEPS.length - 1 ? (
             <MythosButton onClick={() => setStep(step + 1)}>
               Continue Manifestation <ChevronRight size={18} />
             </MythosButton>
           ) : (
             <MythosButton onClick={handleComplete} disabled={saving}>
               {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
               Inscribe to Eternity
             </MythosButton>
           )}
        </footer>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
