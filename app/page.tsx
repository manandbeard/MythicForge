'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { 
  Plus, 
  Search, 
  Book, 
  Swords, 
  LogOut, 
  LogIn, 
  Ghost,
  ShieldCheck,
  Zap,
  Flame,
  Wand2
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
  onSnapshot, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db, OperationType, handleFirestoreError } from '@/lib/firebase';
import CharacterCard from '@/components/CharacterCard';
import DiceRoller from '@/components/DiceRoller';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [characters, setCharacters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCharacters([]);
      return;
    }

    const q = query(collection(db, 'characters'), where('uid', '==', user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const chars = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCharacters(chars);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'characters');
    });

    return () => unsub();
  }, [user]);

  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

  const createNewCharacter = () => {
    if (!user) return;
    router.push('/builder');
  };

  const filteredCharacters = characters.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.class.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.race.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--deep-slate)]">
        <motion.div
           animate={{ rotate: 360 }}
           transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
           className="text-[var(--gold-accent)]"
        >
          <Ghost size={48} />
        </motion.div>
        <p className="mt-4 font-serif italic text-lg animate-pulse text-[var(--gold-accent)]">Whispering to the Archive...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Navigation / Header */}
      <header className="flex flex-col md:flex-row justify-between items-end md:items-center mb-16 border-b-2 border-[var(--gold-accent)] pb-8">
        <div>
          <Image src="https://picsum.photos/seed/eldritch/200/200" alt="Logo" width={40} height={40} className="mb-4 rounded-full border border-[var(--gold-accent)]" />
          <h1 className="text-6xl md:text-8xl font-serif font-black tracking-tighter text-[var(--gold-accent)] leading-none mb-2">
            ELDRITCH<span className="italic font-light">ARCHIVE</span>
          </h1>
          <div className="flex items-center gap-4 text-xs uppercase tracking-[0.2em] font-bold opacity-60 text-[var(--parchment)]">
            <span>Grimoire Manager</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold-accent)]" />
            <span>AI Chronomancer</span>
          </div>
        </div>

        <div className="mt-8 md:mt-0">
          {user ? (
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <button
                onClick={() => router.push('/combat')}
                className="group flex flex-col items-center gap-1"
              >
                <div className="p-3 border border-[var(--gold-accent)] rounded-full group-hover:bg-[var(--blood-red)] group-hover:border-[var(--blood-red)] group-hover:text-white transition-all text-[var(--gold-accent)]">
                  <Swords size={20} />
                </div>
                <span className="text-[10px] uppercase font-bold tracking-tighter text-[var(--gold-accent)]">Combat</span>
              </button>
              <button
                onClick={() => router.push('/encounters')}
                className="group flex flex-col items-center gap-1"
              >
                <div className="p-3 border border-[var(--gold-accent)] rounded-full group-hover:bg-[var(--gold-accent)] group-hover:text-[var(--deep-slate)] transition-all">
                  <Ghost size={20} />
                </div>
                <span className="text-[10px] uppercase font-bold tracking-tighter">Encounters</span>
              </button>
              <button
                onClick={() => router.push('/spellbook')}
                className="group flex flex-col items-center gap-1"
              >
                <div className="p-3 border border-[var(--gold-accent)] rounded-full group-hover:bg-[var(--gold-accent)] group-hover:text-[var(--deep-slate)] transition-all">
                  <Wand2 size={20} />
                </div>
                <span className="text-[10px] uppercase font-bold tracking-tighter">Spellbook</span>
              </button>
              <button
                onClick={() => router.push('/history')}
                className="group flex flex-col items-center gap-1"
              >
                <div className="p-3 border border-[var(--gold-accent)] rounded-full group-hover:bg-[var(--gold-accent)] group-hover:text-[var(--deep-slate)] transition-all">
                  <Book size={20} />
                </div>
                <span className="text-[10px] uppercase font-bold tracking-tighter">History</span>
              </button>
              <div className="text-right hidden md:block border-l border-[var(--gold-accent)]/30 pl-4 sm:pl-6 ml-2 sm:ml-0">
                <p className="text-sm font-bold text-[var(--gold-accent)]">{user.displayName}</p>
                <p className="text-[10px] uppercase tracking-widest opacity-60">High Archivist</p>
              </div>
              <button
                onClick={() => signOut(auth)}
                className="group flex flex-col items-center gap-1 ml-2 sm:ml-0"
              >
                <div className="p-3 border border-[var(--gold-accent)] rounded-full group-hover:bg-[var(--gold-accent)] group-hover:text-[var(--deep-slate)] transition-all">
                  <LogOut size={20} />
                </div>
                <span className="text-[10px] uppercase font-bold tracking-tighter">Exit</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              className="group flex items-center gap-4 px-6 py-3 border-2 border-[var(--gold-accent)] rounded-full hover:bg-[var(--gold-accent)] hover:text-[var(--deep-slate)] transition-all font-bold"
            >
              <LogIn size={20} />
              <span className="font-serif italic text-lg">Unseal the Archive</span>
            </button>
          )}
        </div>
      </header>

      {!user ? (
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center min-h-[50vh]">
          <div>
            <h2 className="text-4xl md:text-5xl font-serif italic mb-6 leading-tight text-[var(--parchment)]">
              Your legend is etched in <span className="underline decoration-[var(--gold-accent)] decoration-4 underline-offset-8">shadow and magic.</span>
            </h2>
            <p className="text-lg text-[var(--parchment)] opacity-80 leading-relaxed mb-8 font-serif">
              Eldritch Archive is the definitive repository for the modern adventurer. 
              Harness forbidden Chronomany to draft your past, and visualize your future through the eyes of the AI Oracle.
            </p>
            <div className="flex flex-wrap gap-4">
               {[
                 { icon: Swords, text: "Tactical Insight" },
                 { icon: Book, text: "Grimoire Sync" },
                 { icon: Wand2, text: "Ethereal Portraits" },
                 { icon: ShieldCheck, text: "Vault Protection" }
               ].map((feat, i) => (
                 <div key={i} className="flex items-center gap-2 px-4 py-2 bg-black/40 border border-[var(--gold-accent)]/20 rounded-full text-xs font-bold uppercase tracking-wider text-[var(--gold-accent)]">
                   <feat.icon size={14} />
                   {feat.text}
                 </div>
               ))}
            </div>
          </div>
          <div className="relative aspect-square rounded-3xl overflow-hidden shadow-2xl border-2 border-[var(--gold-accent)]/50 group">
            <Image 
              src="https://picsum.photos/seed/eldritch-abyss/1000/1000" 
              alt="Eldritch Abyss" 
              fill
              className="object-cover opacity-70 mix-blend-luminosity group-hover:mix-blend-normal transition-all duration-1000 group-hover:scale-105"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-[#0a0a0c]/80 to-transparent opacity-90" />
            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-10 pointer-events-none">
              <div className="flex flex-col gap-3">
                <div className="self-start">
                  <span className="px-3 py-1 bg-[var(--gold-accent)]/10 border border-[var(--gold-accent)]/40 text-[var(--gold-accent)] text-[10px] uppercase font-bold tracking-[0.3em] rounded-sm backdrop-blur-sm shadow-[0_0_15px_rgba(197,160,89,0.2)]">
                    Ethereal Vision
                  </span>
                </div>
                <p className="font-serif italic text-2xl md:text-3xl lg:text-4xl leading-tight text-white/90 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">
                  &quot;The shadows began to whisper names long forgotten, reaching out from the void...&quot;
                </p>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section>
          {/* Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-12">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--gold-accent)] opacity-60" size={18} />
              <input
                type="text"
                placeholder="Seek an adventurer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-black/40 border-2 border-[var(--gold-accent)]/30 rounded-full font-serif italic focus:outline-none focus:border-[var(--gold-accent)] transition-all shadow-sm text-[var(--parchment)] placeholder:text-[var(--parchment)]/30"
              />
            </div>
            <button
              onClick={createNewCharacter}
              className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-3 bg-[var(--gold-accent)] text-[var(--deep-slate)] rounded-full font-serif italic text-lg hover:shadow-[0_0_20px_rgba(197,160,89,0.4)] transition-all active:scale-95 font-bold"
            >
              <Plus size={20} />
              Forge Legend
            </button>
          </div>

          {/* Grid */}
          <AnimatePresence mode="popLayout">
            {filteredCharacters.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-[var(--gold-accent)]/20 rounded-3xl bg-black/20"
              >
                <div className="p-6 rounded-full bg-black/40 mb-4 border border-[var(--gold-accent)]/20">
                   <Ghost size={48} className="text-[var(--gold-accent)] opacity-30" />
                </div>
                <h3 className="text-2xl font-serif italic mb-2 text-[var(--gold-accent)]">The Archive stays silent...</h3>
                <p className="text-[var(--parchment)]/40 uppercase text-[10px] tracking-[0.3em] font-bold">Unseal a new legend above</p>
              </motion.div>
            ) : (
              <motion.div 
                layout
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
              >
                {filteredCharacters.map((char) => (
                  <motion.div key={char.id} layout transition={{ type: 'spring', damping: 20, stiffness: 100 }}>
                    <CharacterCard id={char.id} character={char} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}

      {/* Decorative Rail Text */}
      <div className="fixed left-4 top-1/2 -translate-y-1/2 hidden xl:block pointer-events-none">
        <p className="writing-vertical-rl rotate-180 text-[10px] uppercase tracking-[0.5em] font-bold opacity-10 text-[var(--gold-accent)]">
          ETERNITY • KNOWLEDGE • DOOM
        </p>
      </div>

      <DiceRoller />
    </div>
  );
}
