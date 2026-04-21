"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from '@/lib/firebase';
import { fetchClasses, fetchRaces, fetchBackgrounds } from '@/lib/data-import';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, ChevronLeft, Save, Loader2, Info, Sparkles, Dices } from 'lucide-react';
import Link from 'next/link';
import { onAuthStateChanged, User } from 'firebase/auth';
import { GoogleGenAI } from '@google/genai';

const STEPS = ['Identity', 'Species', 'Order', 'Attributes'];

const DEFAULT_STATS = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };

const SKILL_OPTIONS = [
  "Acrobatics", "Animal Handling", "Arcana", "Athletics", "Deception", 
  "History", "Insight", "Intimidation", "Investigation", "Medicine", 
  "Nature", "Perception", "Performance", "Persuasion", "Religion", 
  "Sleight of Hand", "Stealth", "Survival"
];

export default function CharacterBuilder() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  
  const [step, setStep] = useState(0);
  const [loadingConfig, setLoadingConfig] = useState(true);
  
  // Data from 5e tools
  const [races, setRaces] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [backgroundData, setBackgroundData] = useState<any[]>([]);

  // Character State
  const [name, setName] = useState('');
  const [namePrompt, setNamePrompt] = useState('');
  const [isGeneratingName, setIsGeneratingName] = useState(false);
  const [race, setRace] = useState<any>(null);
  const [charClass, setCharClass] = useState<any>(null);
  const [background, setBackground] = useState('');
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [saving, setSaving] = useState(false);

  // Custom Origin Choices
  const [originProficiencies, setOriginProficiencies] = useState<string[]>([]);
  const [bonusStats, setBonusStats] = useState<{stat: string, val: number}[]>([]);

  // Stat Rolling State
  const [rolls, setRolls] = useState<{ id: string, value: number }[]>([]);
  const [isRolling, setIsRolling] = useState(false);
  const [selectedRollId, setSelectedRollId] = useState<string | null>(null);
  const [assignedRolls, setAssignedRolls] = useState<Partial<Record<string, string>>>({});

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoadingUser(false);
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
        console.error('Failed to load 5etools data', err);
      } finally {
        setLoadingConfig(false);
      }
    };
    loadData();
  }, []);

  const handleStatChange = (stat: keyof typeof DEFAULT_STATS, val: string) => {
    setStats(prev => ({ ...prev, [stat]: parseInt(val) || 0 }));
  };

  const handleGenerateName = async () => {
    setIsGeneratingName(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
      const promptStr = namePrompt.trim() !== '' ? namePrompt : "a random, cool-sounding high fantasy hero";
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate a single, cool sounding fantasy name for a D&D character based on this idea or feeling: "${promptStr}". Only return the name itself, with no additional text, quotes, or explanations.`,
      });
      const generatedName = response.text?.trim();
      if (generatedName) setName(generatedName);
    } catch (error) {
      console.error("Failed to generate name:", error);
    } finally {
      setIsGeneratingName(false);
    }
  };

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

  const handleStatBoxClick = (stat: keyof typeof DEFAULT_STATS) => {
    if (!selectedRollId) return;

    const selectedRoll = rolls.find(r => r.id === selectedRollId);
    if (!selectedRoll) return;

    let newAssigned = { ...assignedRolls };
    for (const [key, val] of Object.entries(newAssigned)) {
      if (val === selectedRollId) {
        delete newAssigned[key];
      }
    }
    
    newAssigned[stat] = selectedRollId;
    setAssignedRolls(newAssigned);
    setStats(prev => ({ ...prev, [stat]: selectedRoll.value }));
    setSelectedRollId(null);
  };

  const handleComplete = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const clsName = charClass ? charClass.name : 'Adventurer';
      const rceName = race ? race.name : 'Unknown';
      
      const finalStats = { ...stats };
      for (const bonus of bonusStats) {
          if (bonus.stat && finalStats[bonus.stat as keyof typeof finalStats] !== undefined) {
              finalStats[bonus.stat as keyof typeof finalStats] += bonus.val;
          }
      }

      const hpBase = charClass?.hd?.faces ? (Array.isArray(charClass.hd.faces) ? charClass.hd.faces[0] : charClass.hd.faces) : 10;
      const hp = hpBase + Math.floor((finalStats.con - 10) / 2);

      const docRef = await addDoc(collection(db, 'characters'), {
        uid: user.uid,
        name: name || 'Nameless Wanderer',
        race: rceName,
        class: clsName,
        background: background || 'Acolyte (2024)',
        level: 1,
        stats: finalStats,
        hp: { current: hp, max: hp, temp: 0 },
        ac: 10 + Math.floor((finalStats.dex - 10) / 2),
        proficiencies: originProficiencies,
        bonusStats: bonusStats,
        inventory: [],
        spells: [],
        backstory: '',
        notes: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      router.push(`/character/${docRef.id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'characters');
      setSaving(false);
    }
  };

  if (loadingUser || loadingConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--deep-slate)] text-[var(--gold-accent)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin w-12 h-12" />
          <p className="font-serif italic text-lg tracking-widest animate-pulse">Initializing 2024 Rule Set Codex...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--deep-slate)] text-[var(--parchment)] py-12 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12 text-center relative">
          <Link href="/" className="absolute left-0 top-1/2 -translate-y-1/2 text-white/50 hover:text-[var(--gold-accent)]">
            &larr; Return to Library
          </Link>
          <h1 className="text-4xl md:text-5xl font-serif font-black tracking-tighter text-[var(--gold-accent)]">
            MANIFEST HERO
          </h1>
          <p className="text-sm font-bold uppercase tracking-[0.3em] opacity-50 mt-2">2024 Foundation Codex</p>
        </header>

        {/* Stepper */}
        <div className="flex justify-between items-center mb-12 relative max-w-2xl mx-auto">
          <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-white/10 -z-10" />
          {STEPS.map((s, i) => (
            <div key={s} className="flex flex-col items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${step >= i ? 'bg-[var(--gold-accent)] text-[var(--deep-slate)]' : 'bg-[var(--deep-slate)] border border-white/20 text-white/40'}`}>
                {i + 1}
              </div>
              <span className={`text-[10px] uppercase font-bold tracking-widest ${step >= i ? 'text-[var(--gold-accent)]' : 'text-white/40'}`}>
                {s}
              </span>
            </div>
          ))}
        </div>

        <div className="eldritch-panel border-2 border-[var(--gold-accent)]/30 p-8 min-h-[400px] relative">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div key="step-0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6 max-w-xl mx-auto">
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-widest opacity-60 text-[var(--gold-accent)] mb-2 block">Hero&apos;s True Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="E.g. Sylas Nightbreeze"
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-4 text-2xl font-serif italic focus:border-[var(--gold-accent)]/80 outline-none text-[var(--parchment)]"
                  />
                  
                  <div className="mt-3 p-3 bg-black/30 border border-white/5 rounded flex flex-col sm:flex-row gap-2 items-center">
                    <input
                      type="text"
                      value={namePrompt}
                      onChange={(e) => setNamePrompt(e.target.value)}
                      placeholder="Idea/Vibe (e.g. 'dark elf assassin' or 'noble knight')"
                      className="flex-1 bg-transparent border-b border-white/20 px-2 py-1 text-sm italic focus:border-[var(--gold-accent)]/50 outline-none text-[var(--parchment)]"
                      onKeyDown={(e) => e.key === 'Enter' && handleGenerateName()}
                    />
                    <button
                      onClick={handleGenerateName}
                      disabled={isGeneratingName}
                      className="whitespace-nowrap flex items-center gap-2 px-3 py-1.5 bg-[var(--gold-accent)]/10 hover:bg-[var(--gold-accent)]/20 text-[var(--gold-accent)] border border-[var(--gold-accent)]/30 rounded text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                    >
                      {isGeneratingName ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      {isGeneratingName ? 'Divining...' : 'AI Name'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-widest opacity-60 text-[var(--gold-accent)] mb-2 block">Background (2024)</label>
                  <select
                    value={background}
                    onChange={(e) => setBackground(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-4 text-lg font-serif italic focus:border-[var(--gold-accent)]/80 outline-none text-[var(--parchment)]"
                  >
                    <option value="">Select Origin...</option>
                    {backgroundData.map(b => (
                      <option key={b.name} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                  
                  <AnimatePresence>
                    {background && backgroundData.find(b => b.name === background) && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -10, height: 0 }}
                        className="mt-4 p-4 rounded-lg bg-[var(--gold-accent)]/10 border border-[var(--gold-accent)]/30 overflow-hidden"
                      >
                        <h4 className="font-serif font-bold text-[var(--gold-accent)] mb-2">
                          {backgroundData.find(b => b.name === background)?.name} Origin
                        </h4>
                        <p className="text-sm italic opacity-80 mb-3 text-[var(--parchment)]">
                          {backgroundData.find(b => b.name === background)?.description}
                        </p>
                        <div className="bg-black/40 p-3 rounded text-xs border border-white/5 space-y-1">
                          <p className="font-bold text-[var(--magic-blue)] uppercase tracking-wider text-[10px]">Granted Benefits:</p>
                          <p className="text-[var(--parchment)]/90 leading-relaxed">
                            {backgroundData.find(b => b.name === background)?.benefits}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div key="step-1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h3 className="font-serif italic text-2xl mb-6 border-b border-[var(--gold-accent)]/30 inline-block pr-12 pb-2 text-[var(--gold-accent)] mt-0 pt-0">Species Lineage (2024 SRD)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-4">
                  {races.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => setRace(r)}
                      className={`text-left p-4 rounded-lg border transition-all ${race?.name === r.name ? 'border-[var(--gold-accent)] bg-[var(--gold-accent)]/10 shadow-[0_0_15px_rgba(197,160,89,0.2)]' : 'border-white/10 hover:border-white/40 bg-black/20'}`}
                    >
                      <span className="font-serif font-bold text-lg">{r.name}</span>
                      <p className="text-[10px] uppercase tracking-widest opacity-50 mt-1">{r.source}</p>
                    </button>
                  ))}
                  {races.length === 0 && <p className="col-span-full opacity-50 italic">No species data found in codex.</p>}
                </div>
                
                <AnimatePresence>
                  {race && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
                      className="mt-6 p-4 rounded-lg bg-[var(--gold-accent)]/10 border border-[var(--gold-accent)]/30 overflow-hidden"
                    >
                      <h4 className="font-serif font-bold text-[var(--gold-accent)] mb-2">
                        {race.name}
                      </h4>
                      <p className="text-sm italic opacity-80 text-[var(--parchment)] mb-4">
                        {race.description || 'A lineage shrouded in mystery.'}
                      </p>
                      
                      <div className="border-t border-[var(--gold-accent)]/20 pt-4 mt-4">
                        <h5 className="text-[10px] uppercase font-bold tracking-[0.2em] opacity-80 text-[var(--gold-accent)] mb-3">Origin Customization</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            
                          <div className="bg-black/30 p-3 rounded border border-white/5">
                            <label className="text-[10px] uppercase font-bold tracking-widest opacity-60 text-white mb-2 block flex items-center gap-2">
                               <span>Bonus Attributes</span>
                               <span className="text-[var(--gold-accent)]">(+2 / +1) or (+1 / +1 / +1)</span>
                            </label>
                            <div className="flex flex-col gap-2">
                               <div className="flex gap-2">
                                 <select 
                                    className="flex-1 bg-black/50 border border-white/10 rounded p-2 text-xs outline-none focus:border-[var(--gold-accent)]/50 text-[var(--parchment)]"
                                    value={bonusStats[0]?.stat || ''}
                                    onChange={(e) => {
                                        const newS = [...bonusStats];
                                        newS[0] = {stat: e.target.value, val: newS.length === 3 ? 1 : 2};
                                        if (newS.length === 3) newS.splice(2, 1);
                                        setBonusStats(newS);
                                    }}
                                 >
                                    <option value="">+2 Stat...</option>
                                    {Object.keys(DEFAULT_STATS).map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                                 </select>
                                 <select 
                                    className="flex-1 bg-black/50 border border-white/10 rounded p-2 text-xs outline-none focus:border-[var(--gold-accent)]/50 text-[var(--parchment)]"
                                    value={bonusStats[1]?.stat || ''}
                                    onChange={(e) => {
                                        const newS = [...bonusStats];
                                        newS[1] = {stat: e.target.value, val: 1};
                                        setBonusStats(newS);
                                    }}
                                 >
                                    <option value="">+1 Stat...</option>
                                    {Object.keys(DEFAULT_STATS).map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                                 </select>
                               </div>
                               
                               <button 
                                 onClick={() => {
                                     if (bonusStats.length === 3) setBonusStats(bonusStats.slice(0, 2));
                                     else setBonusStats([...bonusStats.map(s => ({...s, val: 1})), {stat: '', val: 1}]);
                                 }}
                                 className="text-[10px] uppercase tracking-wider text-[var(--magic-blue)] opacity-80 hover:opacity-100 text-left mt-1"
                               >
                                  {bonusStats.length === 3 ? "Switch to +2 / +1" : "Switch to +1 / +1 / +1"}
                               </button>

                               {bonusStats.length === 3 && (
                                   <select 
                                    className="w-full bg-black/50 border border-white/10 rounded p-2 text-xs outline-none focus:border-[var(--gold-accent)]/50 text-[var(--parchment)] mt-1"
                                    value={bonusStats[2]?.stat || ''}
                                    onChange={(e) => {
                                        const newS = [...bonusStats];
                                        newS[2] = {stat: e.target.value, val: 1};
                                        setBonusStats(newS);
                                    }}
                                 >
                                    <option value="">+1 Stat...</option>
                                    {Object.keys(DEFAULT_STATS).map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                                 </select>
                               )}
                            </div>
                          </div>

                          <div className="bg-black/30 p-3 rounded border border-white/5">
                            <label className="text-[10px] uppercase font-bold tracking-widest opacity-60 text-white mb-2 block flex items-center gap-2">
                               <span>Proficiencies</span>
                               <span className="text-[var(--gold-accent)]">Select up to 2</span>
                            </label>
                            <div className="space-y-2">
                                {[0, 1].map(index => (
                                    <select 
                                      key={index}
                                      value={originProficiencies[index] || ''}
                                      onChange={(e) => {
                                          const newP = [...originProficiencies];
                                          newP[index] = e.target.value;
                                          setOriginProficiencies(newP.filter(Boolean));
                                      }}
                                      className="w-full bg-black/50 border border-white/10 rounded p-2 text-xs outline-none focus:border-[var(--gold-accent)]/50 text-[var(--parchment)]"
                                    >
                                      <option value="">Select Skill...</option>
                                      {SKILL_OPTIONS.map(skill => (
                                          <option key={skill} value={skill} disabled={originProficiencies.includes(skill) && originProficiencies[index] !== skill}>
                                            {skill}
                                          </option>
                                      ))}
                                    </select>
                                ))}
                            </div>
                          </div>

                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step-2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h3 className="font-serif italic text-2xl mb-6 border-b border-[var(--gold-accent)]/30 inline-block pr-12 pb-2 text-[var(--gold-accent)] mt-0 pt-0">Vanguard Order (2024 Class)</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-4">
                  {classes.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => setCharClass(c)}
                      className={`relative overflow-hidden text-left p-4 rounded-lg border transition-all ${charClass?.name === c.name ? 'border-[var(--magic-blue)] bg-[var(--magic-blue)]/10 shadow-[0_0_15px_rgba(79,172,254,0.2)]' : 'border-white/10 hover:border-white/40 bg-black/20'}`}
                    >
                      <span className="font-serif font-bold text-lg">{c.name}</span>
                      <p className="text-[10px] uppercase tracking-widest opacity-50 mt-1">HD: d{c.hd?.faces ? (Array.isArray(c.hd.faces) ? c.hd.faces[0] : c.hd.faces) : 8}</p>
                    </button>
                  ))}
                  {classes.length === 0 && <p className="col-span-full opacity-50 italic">No class data found in codex.</p>}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step-3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="max-w-2xl mx-auto">
                <div className="flex flex-col md:flex-row gap-6 mb-8 items-start">
                  <div className="flex-1 bg-black/30 border border-white/10 p-6 rounded-lg text-center w-full">
                    <button
                      onClick={generateStats}
                      disabled={isRolling}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--gold-accent)] text-[var(--deep-slate)] font-bold uppercase tracking-widest text-sm rounded-full transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 shadow-[0_0_15px_rgba(197,160,89,0.3)] hover:shadow-[0_0_25px_rgba(197,160,89,0.5)]"
                    >
                      {isRolling ? <Loader2 size={18} className="animate-spin" /> : <Dices size={18} />}
                      Roll 4d6 Drop Lowest
                    </button>
                    
                    <AnimatePresence>
                      {rolls.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }} 
                          animate={{ opacity: 1, height: 'auto' }} 
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-6 flex flex-col items-center overflow-hidden"
                        >
                          <div className="flex flex-wrap justify-center gap-3">
                            {rolls.map((roll) => {
                              const isAssigned = Object.values(assignedRolls).includes(roll.id);
                              return (
                                <button
                                  key={roll.id}
                                  disabled={isAssigned || isRolling}
                                  onClick={() => setSelectedRollId(selectedRollId === roll.id ? null : roll.id)}
                                  className={`
                                    w-14 h-14 flex items-center justify-center font-serif text-2xl font-bold rounded shadow-lg transition-all
                                    ${isAssigned ? 'opacity-20 grayscale border border-white/10' : 
                                      selectedRollId === roll.id ? 'bg-[var(--magic-blue)] text-white scale-110 shadow-[0_0_15px_rgba(79,172,254,0.5)] border-2 border-white' : 
                                      'bg-black/50 border border-[var(--gold-accent)]/50 text-[var(--gold-accent)] hover:border-[var(--gold-accent)]'}
                                  `}
                                >
                                  {roll.value}
                                </button>
                              );
                            })}
                          </div>
                          
                          <div className="h-6 mt-3">
                            {selectedRollId && !isRolling && (
                              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs uppercase tracking-widest text-[var(--magic-blue)] font-bold animate-pulse">
                                Select an Attribute below to assign {rolls.find(r => r.id === selectedRollId)?.value}
                              </motion.p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {(Object.keys(DEFAULT_STATS) as Array<keyof typeof DEFAULT_STATS>).map(stat => (
                    <div 
                      key={stat} 
                      onClick={() => {
                        if (selectedRollId) handleStatBoxClick(stat);
                      }}
                      className={`relative p-4 rounded-lg border text-center flex flex-col items-center group transition-all duration-300
                        ${selectedRollId ? 'cursor-pointer hover:bg-[var(--magic-blue)]/10 border-[var(--magic-blue)]/50 border-dashed' : 'bg-black/30 border-white/10 focus-within:border-[var(--gold-accent)]/80'}
                        ${assignedRolls[stat] ? 'border-[var(--gold-accent)]/50 border-solid bg-[var(--gold-accent)]/5' : ''}
                      `}
                    >
                      <span className="text-[10px] uppercase font-bold tracking-[0.2em] opacity-60 mb-2">{stat}</span>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={stats[stat]}
                        readOnly={!!selectedRollId}
                        onChange={(e) => {
                          if (!selectedRollId) handleStatChange(stat, e.target.value);
                          if (assignedRolls[stat]) {
                            const newAssigned = {...assignedRolls};
                            delete newAssigned[stat];
                            setAssignedRolls(newAssigned);
                          }
                        }}
                        className={`w-16 bg-transparent text-4xl font-serif text-center outline-none transition-colors duration-300 ${assignedRolls[stat] ? 'text-white' : 'text-[var(--gold-accent)]'} ${selectedRollId ? 'pointer-events-none' : ''}`}
                      />
                      {bonusStats.filter(b => b.stat === stat).reduce((acc, curr) => acc + curr.val, 0) > 0 && (
                          <div className="text-[10px] uppercase tracking-widest text-[var(--magic-blue)] font-bold mt-1 bg-[var(--magic-blue)]/10 px-2 py-0.5 rounded border border-[var(--magic-blue)]/30">
                             +{bonusStats.filter(b => b.stat === stat).reduce((acc, curr) => acc + curr.val, 0)} Origin
                          </div>
                      )}
                      
                      <div className="mt-2 text-xs font-mono font-bold opacity-40">
                         Mod: {Math.floor(((stats[stat] + bonusStats.filter(b => b.stat === stat).reduce((acc, curr) => acc + curr.val, 0)) - 10) / 2) >= 0 ? '+' : ''}{Math.floor(((stats[stat] + bonusStats.filter(b => b.stat === stat).reduce((acc, curr) => acc + curr.val, 0)) - 10) / 2)}
                      </div>
                      
                      <AnimatePresence>
                        {assignedRolls[stat] && (
                          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="absolute top-2 right-2 flex gap-1 pointer-events-none">
                             <Sparkles size={12} className="text-[var(--gold-accent)]" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex justify-between items-center mt-8">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="flex items-center gap-2 px-6 py-3 rounded-full border border-white/20 text-white/50 hover:text-white disabled:opacity-20 transition-colors uppercase text-xs font-bold tracking-widest"
          >
            <ChevronLeft size={16} /> Retreat
          </button>
          
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(Math.min(STEPS.length - 1, step + 1))}
              disabled={(step === 0 && (!name || !background)) || (step === 1 && !race) || (step === 2 && !charClass)}
              className="flex items-center gap-2 px-8 py-3 rounded-full bg-[var(--gold-accent)] text-[var(--deep-slate)] font-bold text-xs uppercase tracking-widest hover:shadow-[0_0_15px_rgba(197,160,89,0.4)] disabled:opacity-50 disabled:shadow-none transition-all"
            >
              Proceed <ChevronRight size={16} />
            </button>
          ) : (
            <button
               onClick={handleComplete}
               disabled={saving}
               className="ai-btn-gradient flex items-center gap-2 px-8 py-3 rounded-full text-white font-bold text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(79,172,254,0.4)] hover:shadow-[0_0_30px_rgba(79,172,254,0.6)] disabled:opacity-50 transition-all"
            >
              {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save size={16} />}
              Ethch to Chronicle
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
