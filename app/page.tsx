'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { 
  Plus, 
  Search, 
  Book, 
  LogIn, 
  LogOut,
  Ghost,
  Swords,
  Wand2,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot
} from 'firebase/firestore';
import { auth, db, OperationType, handleFirestoreError } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { MythosButton, MythosPanel, MythosInput, MythosLabel } from '@/components/mythos/UI';
import CharacterCard from '@/components/CharacterCard';
import DiceRoller from '@/components/DiceRoller';

export default function LandingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [characters, setCharacters] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'characters' | 'campaigns'>('characters');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (!u) {
        setCharacters([]);
        setCampaigns([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const qChars = query(collection(db, 'characters'), where('uid', '==', user.uid));
    const unsubChars = onSnapshot(qChars, (snapshot) => {
      const chars = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCharacters(chars);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'characters');
    });

    const qCamps = query(collection(db, 'campaigns'), where('uid', '==', user.uid));
    const unsubCamps = onSnapshot(qCamps, (snapshot) => {
      const camps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCampaigns(camps);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'campaigns');
    });

    return () => {
      unsubChars();
      unsubCamps();
    };
  }, [user]);

  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

  const filteredCharacters = characters.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.class?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.race?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCampaigns = campaigns.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--deep-slate)]">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="text-[var(--gold-accent)]">
          <Ghost size={48} />
        </motion.div>
        <p className="mt-4 font-serif italic text-lg animate-pulse text-[var(--gold-accent)]">Whispering to the Archive...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-8 border-b border-[var(--gold-accent)]/20 pb-12">
        <div className="space-y-2">
           <h1 className="text-6xl md:text-8xl font-serif font-black tracking-tighter text-[var(--gold-accent)] leading-none">
             MYTHOS<span className="italic font-light">FORGE</span>
           </h1>
           <div className="flex items-center gap-4 text-[10px] uppercase tracking-[0.3em] font-bold opacity-40 text-[var(--parchment)]">
             <span>Ancient Archive</span>
             <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold-accent)]" />
             <span>AI Chronomancer</span>
           </div>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-6">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-[var(--gold-accent)]">{user.displayName}</p>
                <p className="text-[10px] uppercase tracking-widest opacity-40">High Archivist</p>
              </div>
              <MythosButton variant="outline" size="sm" onClick={() => signOut(auth)}>
                <LogOut size={16} /> Exit Archive
              </MythosButton>
            </div>
          ) : (
            <MythosButton variant="primary" onClick={handleSignIn}>
              <LogIn size={18} /> Unseal the Archive
            </MythosButton>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {!user ? (
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center py-12">
             <div className="space-y-8">
                <h2 className="text-5xl md:text-6xl font-serif italic leading-tight text-[var(--parchment)]">
                   Your legend is etched in <span className="text-[var(--gold-accent)]">shadow and gold.</span>
                </h2>
                <p className="text-lg opacity-70 leading-relaxed font-serif max-w-xl">
                   MythosForge is the definitive repository for the modern adventurer. 
                   Harness the powers of the AI Oracle to draft your past, and visualize your destiny through the eternal archive.
                </p>
                <div className="flex flex-wrap gap-4">
                   {[
                     { icon: Swords, text: "Tactical Insight" },
                     { icon: Wand2, text: "Ethereal Portraits" },
                     { icon: ShieldCheck, text: "Vault Protection" }
                   ].map((feat, i) => (
                     <div key={i} className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-wider text-[var(--gold-accent)]">
                       <feat.icon size={12} />
                       {feat.text}
                     </div>
                   ))}
                </div>
             </div>
             <div className="relative aspect-square rounded-3xl overflow-hidden border border-[var(--gold-accent)]/20 group">
                <Image 
                  src="https://picsum.photos/seed/mythos-gate/1000/1000" 
                  alt="Mythos Gate" 
                  fill
                  className="object-cover opacity-60 mix-blend-luminosity group-hover:mix-blend-normal transition-all duration-1000 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--deep-slate)] via-transparent to-transparent" />
             </div>
          </section>
        ) : (
          <section className="space-y-12">
            {/* Dashboard Controls */}
            <div className="flex flex-col gap-6">
              <div className="flex gap-4 border-b border-[var(--gold-accent)]/20 pb-4">
                <button
                  onClick={() => setActiveTab('characters')}
                  className={`text-sm tracking-[0.2em] uppercase font-bold transition-all ${
                    activeTab === 'characters' ? 'text-[var(--gold-accent)]' : 'text-white/40 hover:text-white'
                  }`}
                >
                  Characters
                </button>
                <button
                  onClick={() => setActiveTab('campaigns')}
                  className={`text-sm tracking-[0.2em] uppercase font-bold transition-all ${
                    activeTab === 'campaigns' ? 'text-[var(--gold-accent)]' : 'text-white/40 hover:text-white'
                  }`}
                >
                  Campaigns
                </button>
                <div className="w-px h-4 bg-white/20 self-center mx-2" />
                <button
                  onClick={() => router.push('/compendium')}
                  className="text-sm tracking-[0.2em] uppercase font-bold transition-all text-white/40 hover:text-[var(--magic-blue)] flex items-center gap-2"
                >
                  <Book size={14} /> The Archive
                </button>
              </div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div className="relative w-full max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--gold-accent)] opacity-40" size={18} />
                  <MythosInput
                    placeholder={activeTab === 'characters' ? "Seek an adventurer..." : "Seek a campaign..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/5 border-none"
                  />
                </div>
                <MythosButton onClick={() => activeTab === 'characters' ? router.push('/builder') : router.push('/campaigns/new')} size="lg">
                  <Plus size={20} /> {activeTab === 'characters' ? 'Forge New Legend' : 'Forge New Campaign'}
                </MythosButton>
              </div>
            </div>

            {/* Grid */}
            <AnimatePresence mode="popLayout">
              {(activeTab === 'characters' ? filteredCharacters : filteredCampaigns).length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-32 border-2 border-dashed border-[var(--gold-accent)]/10 rounded-3xl bg-black/20"
                >
                  {activeTab === 'characters' ? (
                    <>
                      <Ghost size={48} className="text-[var(--gold-accent)] opacity-10 mb-4" />
                      <h3 className="text-2xl font-serif italic mb-2 text-[var(--gold-accent)] opacity-40">The Archive stays silent...</h3>
                      <p className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-20">Forge a new legend to begin</p>
                    </>
                  ) : (
                    <>
                      <Book size={48} className="text-[var(--gold-accent)] opacity-10 mb-4" />
                      <h3 className="text-2xl font-serif italic mb-2 text-[var(--gold-accent)] opacity-40">No worlds discovered yet...</h3>
                      <p className="text-[10px] uppercase tracking-[0.3em] font-bold opacity-20">Forge a new campaign to begin</p>
                    </>
                  )}
                </motion.div>
              ) : (
                <motion.div 
                  layout
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
                >
                  {activeTab === 'characters' ? filteredCharacters.map((char) => (
                    <motion.div key={char.id} layout transition={{ type: 'spring', damping: 20, stiffness: 100 }}>
                      <CharacterCard id={char.id} character={char} />
                    </motion.div>
                  )) : filteredCampaigns.map((camp) => (
                    <motion.div key={camp.id} layout transition={{ type: 'spring', damping: 20, stiffness: 100 }} className="p-0 overflow-hidden cursor-pointer group" onClick={() => router.push(`/campaigns/${camp.id}`)}>
                      <div className="relative aspect-[3/4] rounded-2xl overflow-hidden border border-[var(--gold-accent)]/20 transition-all duration-500 group-hover:border-[var(--gold-accent)] group-hover:shadow-[0_0_30px_rgba(197,160,89,0.15)] bg-black/40">
                         <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10 opacity-80 group-hover:opacity-60 transition-opacity" />
                         <div className="absolute inset-0 z-20 p-6 flex flex-col justify-end">
                            <h2 className="text-3xl font-serif font-black italic text-[var(--gold-accent)] mb-2 group-hover:scale-105 transition-transform origin-bottom-left leading-tight">
                              {camp.name}
                            </h2>
                            <p className="text-sm font-serif italic text-[var(--parchment)] opacity-70 line-clamp-3">
                              {camp.description}
                            </p>
                         </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}
      </main>

      <DiceRoller />
      
      <footer className="mt-24 pt-12 border-t border-white/5 text-[10px] uppercase font-bold tracking-[0.5em] text-center opacity-20">
         Eternity • Knowledge • Doom
      </footer>
    </div>
  );
}
