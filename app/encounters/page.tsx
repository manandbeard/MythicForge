"use client";

import React, { useState } from "react";
import { generateEncounter } from "@/lib/ai-service";
import { Trees, Compass, Map as MapIcon, Loader2, Link as LinkIcon, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";

interface EncounterData {
  title: string;
  description: string;
  monsters: { name: string; count: number; short_desc: string }[];
  nonCombat: string;
  environmentalChallenge: string;
}

export default function RandomEncounter() {
  const [loading, setLoading] = useState(false);
  const [level, setLevel] = useState<number>(3);
  const [environment, setEnvironment] = useState<string>("Forest");
  const [encounter, setEncounter] = useState<EncounterData | null>(null);

  const environments = [
    "Forest", "Dungeon", "City", "Mountain", "Swamp", "Desert", "Ocean", "Underdark", "Feywild", "Astral Plane", "Ruins"
  ];

  const handleGenerate = async () => {
    setLoading(true);
    setEncounter(null);
    const data = await generateEncounter(level, environment);
    setEncounter(data);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[var(--deep-slate)] text-[var(--parchment)] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8 border-b-2 border-[var(--gold-accent)] pb-4">
          <div>
            <Link href="/" className="inline-flex items-center text-[var(--gold-accent)] hover:opacity-80 transition-opacity mb-4">
              <ArrowLeft size={16} className="mr-2" /> Return to Archive
            </Link>
            <h1 className="text-4xl md:text-5xl font-serif font-black tracking-tighter text-[var(--gold-accent)] uppercase">
              Encounter Maker
            </h1>
            <p className="text-sm md:text-base opacity-70 mt-2 font-serif italic">
              Conjure scenarios, beasts, and hazards tailored to the wild unknown.
            </p>
          </div>
          <Compass size={48} className="text-[var(--gold-accent)] opacity-50 hidden md:block" />
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Controls */}
          <div className="md:col-span-1 space-y-6">
            <div className="p-6 bg-black/40 border border-[var(--gold-accent)]/30 rounded-xl shadow-[0_0_15px_rgba(197,160,89,0.1)]">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-widest text-[#a8a29e] mb-1 block">Party Level (Avg)</label>
                  <input 
                    type="number"
                    min={1} max={20}
                    value={level}
                    onChange={(e) => setLevel(parseInt(e.target.value) || 1)}
                    className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 outline-none focus:border-[var(--gold-accent)] font-mono text-center"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-widest text-[#a8a29e] mb-1 block">Environment</label>
                  <select 
                    value={environment} 
                    onChange={(e) => setEnvironment(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-sm italic outline-none focus:border-[var(--gold-accent)]"
                  >
                    {environments.map(env => (
                      <option key={env} value={env}>{env}</option>
                    ))}
                  </select>
                </div>

                <button 
                  onClick={handleGenerate}
                  disabled={loading}
                  className="w-full mt-4 flex justify-center items-center gap-2 bg-[var(--gold-accent)]/10 text-[var(--gold-accent)] border border-[var(--gold-accent)]/50 p-3 rounded hover:bg-[var(--gold-accent)] hover:text-black transition-all uppercase tracking-widest font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <MapIcon size={16} />}
                  {loading ? "Divining..." : "Generate Encounter"}
                </button>
              </div>
            </div>
            
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
              <p className="text-xs italic text-white/60 text-center">
                 Powered by AI. Encounters may contain untamed horrors. Use DM discretion.
              </p>
            </div>
          </div>

          {/* Result Output */}
          <div className="md:col-span-2">
            <AnimatePresence mode="wait">
              {encounter && !loading ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-black/60 border border-[var(--gold-accent)] rounded-xl p-6 md:p-8 shadow-[0_0_30px_rgba(197,160,89,0.15)] bg-[url('/img/parchment-texture.png')] bg-cover bg-center bg-blend-soft-light"
                >
                  <h2 className="text-2xl md:text-3xl font-serif font-black text-[var(--gold-accent)] mb-4 pb-4 border-b border-[var(--gold-accent)]/30">
                    {encounter.title}
                  </h2>

                  <div className="mb-6">
                    <p className="font-serif italic text-lg leading-relaxed text-[var(--parchment)] opacity-90">
                       &quot;{encounter.description}&quot;
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm uppercase tracking-widest font-bold text-[var(--blood-red)] mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 bg-[var(--blood-red)] rounded-full animate-pulse" />
                        Hostiles Identified
                      </h3>
                      <div className="grid gap-3">
                        {encounter.monsters?.map((monster, i) => (
                          <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border border-white/10 rounded bg-white/5 gap-2">
                            <div>
                               <span className="font-bold font-serif text-white">{monster.name}</span>
                               <p className="text-xs opacity-60 font-mono mt-1">{monster.short_desc}</p>
                            </div>
                            <span className="bg-black/80 px-3 py-1 rounded text-[10px] uppercase tracking-widest text-[#a8a29e] border border-white/10 shrink-0">
                               Count: <span className="font-bold text-[var(--gold-accent)]">{monster.count}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 border border-[#4ade80]/30 bg-[#4ade80]/5 rounded-lg">
                        <h3 className="text-[10px] uppercase tracking-widest font-bold text-[#4ade80] mb-2">Non-Combat Discovery</h3>
                        <p className="text-sm font-serif italic text-white/80 leading-relaxed">
                           {encounter.nonCombat}
                        </p>
                      </div>

                      <div className="p-4 border border-blue-400/30 bg-blue-400/5 rounded-lg">
                        <h3 className="text-[10px] uppercase tracking-widest font-bold text-blue-400 mb-2">Environmental Hazard</h3>
                        <p className="text-sm font-serif italic text-white/80 leading-relaxed">
                           {encounter.environmentalChallenge}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : !loading && (
                <div className="h-full min-h-[300px] flex items-center justify-center border border-dashed border-[var(--gold-accent)]/30 rounded-xl bg-black/20">
                   <div className="text-center opacity-50 flex flex-col items-center gap-4">
                     <Trees size={48} className="text-[var(--gold-accent)] opacity-50" />
                     <p className="font-serif italic text-lg">The wilds are quiet... for now.</p>
                   </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
