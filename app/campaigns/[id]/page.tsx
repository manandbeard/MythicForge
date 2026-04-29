'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  doc, 
  onSnapshot, 
  query, 
  addDoc, 
  deleteDoc, 
  updateDoc, 
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { MythosButton, MythosPanel, MythosInput, MythosLabel } from '@/components/mythos/UI';
import { 
  ArrowLeft, Plus, Save, Trash2, Map, Users, ScrollText, 
  BookOpen, Compass, Info, Ghost
} from 'lucide-react';

type NoteType = 'world' | 'plot' | 'location' | 'session' | 'general';

interface CampaignNote {
  id: string;
  title: string;
  content: string;
  type: NoteType;
  createdAt: any;
}

export default function CampaignSheet() {
  const { id } = useParams();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [campaign, setCampaign] = useState<any>(null);
  const [notes, setNotes] = useState<CampaignNote[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit State
  const [activeTab, setActiveTab] = useState<NoteType>('session');
  const [isComposing, setIsComposing] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) router.push('/');
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!id || !user) return;

    // Load Campaign
    const unsubCamp = onSnapshot(doc(db, 'campaigns', id as string), (docSnap) => {
      if (docSnap.exists()) {
        const campaignData = docSnap.data();
        // Check access informally (read is open but let's be nice)
        setCampaign({ id: docSnap.id, ...campaignData });
      } else {
        router.push('/');
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `campaigns/${id}`);
      setLoading(false);
    });

    // Load Notes
    const qNotes = query(collection(db, 'campaigns', id as string, 'notes'), orderBy('createdAt', 'desc'));
    const unsubNotes = onSnapshot(qNotes, (snapshot) => {
      const loadedNotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CampaignNote));
      setNotes(loadedNotes);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `campaigns/${id}/notes`);
    });

    return () => {
      unsubCamp();
      unsubNotes();
    };
  }, [id, user, router]);

  const handleSaveNote = async () => {
    if (!noteTitle.trim()) return;
    setSavingNote(true);
    try {
      await addDoc(collection(db, 'campaigns', id as string, 'notes'), {
        title: noteTitle.trim(),
        content: noteContent.trim(),
        type: activeTab,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setNoteTitle('');
      setNoteContent('');
      setIsComposing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `campaigns/${id}/notes`);
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!window.confirm('Erase this record completely?')) return;
    try {
      await deleteDoc(doc(db, 'campaigns', id as string, 'notes', noteId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `campaigns/${id}/notes/${noteId}`);
    }
  };

  if (loading || !campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--deep-slate)]">
        <Ghost className="animate-pulse text-[var(--gold-accent)] opacity-40 w-12 h-12" />
      </div>
    );
  }

  const isOwner = user?.uid === campaign.uid;
  const filteredNotes = notes.filter(n => n.type === activeTab);

  const TABS: { id: NoteType, label: string, icon: any }[] = [
    { id: 'session', label: 'Sessions', icon: ScrollText },
    { id: 'world', label: 'World', icon: Map },
    { id: 'location', label: 'Locations', icon: Compass },
    { id: 'plot', label: 'Plot', icon: BookOpen },
    { id: 'general', label: 'General', icon: Info },
  ];

  return (
    <div className="min-h-screen bg-[var(--deep-slate)] text-[var(--parchment)] font-sans flex flex-col">
      <header className="sticky top-0 z-40 bg-[var(--deep-slate)]/80 backdrop-blur-md border-b border-[var(--gold-accent)]/20 px-4 md:px-8">
        <div className="max-w-7xl mx-auto h-24 flex items-center justify-between">
           <div className="flex items-center gap-6">
             <button 
               onClick={() => router.push('/')} 
               className="p-3 border border-[var(--gold-accent)]/20 rounded-full text-[var(--gold-accent)] hover:bg-[var(--gold-accent)] hover:text-black transition-all"
             >
               <ArrowLeft size={18} />
             </button>
             <div>
                <h1 className="font-serif italic font-black text-3xl text-[var(--gold-accent)] tracking-tighter">
                   {campaign.name}
                </h1>
                <p className="text-[10px] uppercase font-bold opacity-30 tracking-[0.2em]">
                   DM: {isOwner ? 'You' : 'Another'}
                </p>
             </div>
           </div>
        </div>

        <div className="max-w-7xl mx-auto flex gap-6 overflow-x-auto scrollbar-hide border-t border-white/5 pt-2">
           {TABS.map(tab => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={`flex items-center gap-2 py-3 border-b-2 font-bold uppercase text-[10px] tracking-[0.2em] transition-all whitespace-nowrap ${
                 activeTab === tab.id 
                  ? 'border-[var(--gold-accent)] text-[var(--gold-accent)]' 
                  : 'border-transparent text-white/30 hover:text-white'
               }`}
             >
               <tab.icon size={14} /> {tab.label}
             </button>
           ))}
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-8">
         <section className="flex-1 space-y-8 min-w-[50%]">
            <div className="flex justify-between items-end border-b border-white/5 pb-4">
               <div>
                  <h2 className="font-serif italic text-3xl text-[var(--gold-accent)] capitalize">
                    {activeTab} Codex
                  </h2>
               </div>
               {isOwner && (
                 <MythosButton size="sm" onClick={() => setIsComposing(!isComposing)}>
                    {isComposing ? 'Cancel Composition' : <span className="flex items-center gap-2"><Plus size={16}/> New Entry</span>}
                 </MythosButton>
               )}
            </div>

            <AnimatePresence>
              {isComposing && isOwner && (
                <motion.div 
                   initial={{ opacity: 0, height: 0 }}
                   animate={{ opacity: 1, height: 'auto' }}
                   exit={{ opacity: 0, height: 0 }}
                   className="overflow-hidden"
                >
                  <MythosPanel variant="deep" className="p-6 mb-8 border border-[var(--gold-accent)]/40 shadow-[0_0_20px_rgba(197,160,89,0.1)]">
                     <div className="space-y-4">
                        <div>
                           <MythosLabel>Designation / Title</MythosLabel>
                           <MythosInput
                             value={noteTitle}
                             onChange={e => setNoteTitle(e.target.value)}
                             className="text-2xl w-full"
                             autoFocus
                           />
                        </div>
                        <div>
                           <MythosLabel>Content</MythosLabel>
                           <textarea
                             value={noteContent}
                             onChange={e => setNoteContent(e.target.value)}
                             className="w-full min-h-[200px] bg-black/40 border border-white/10 p-4 rounded-xl font-serif text-[var(--parchment)] focus:outline-none focus:border-[var(--gold-accent)]/50 transition-colors"
                           />
                        </div>
                        <div className="flex justify-end pt-4">
                           <MythosButton onClick={handleSaveNote} disabled={savingNote || !noteTitle.trim()}>
                              <Save size={16} /> Seal Record
                           </MythosButton>
                        </div>
                     </div>
                  </MythosPanel>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-6">
               <AnimatePresence mode="popLayout">
                  {filteredNotes.length === 0 && !isComposing ? (
                    <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="text-center py-20 opacity-30 border-2 border-dashed border-white/10 rounded-3xl"
                    >
                       <p className="font-serif italic text-xl">The pages remain blank...</p>
                    </motion.div>
                  ) : (
                    filteredNotes.map(note => (
                      <motion.div 
                        key={note.id} 
                        layout 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                      >
                         <MythosPanel variant="default" className="group">
                            <div className="flex justify-between items-start mb-4">
                               <h3 className="font-serif italic font-bold text-2xl text-[var(--gold-accent)]">
                                  {note.title}
                               </h3>
                               {isOwner && (
                                 <button 
                                   onClick={() => handleDeleteNote(note.id)}
                                   className="opacity-0 group-hover:opacity-100 text-[var(--blood-red)]/60 hover:text-[var(--blood-red)] transition-all p-2 rounded hover:bg-[var(--blood-red)]/10"
                                 >
                                    <Trash2 size={16} />
                                 </button>
                               )}
                            </div>
                            <div className="text-sm font-serif opacity-80 whitespace-pre-wrap leading-relaxed">
                               {note.content}
                            </div>
                         </MythosPanel>
                      </motion.div>
                    ))
                  )}
               </AnimatePresence>
            </div>
         </section>

         {/* Sidebar: Associated PCs / Details */}
         <aside className="w-full lg:w-[350px] space-y-8">
            <MythosPanel variant="deep" className="p-6">
               <h3 className="text-[10px] uppercase font-bold tracking-[0.2em] text-[var(--gold-accent)] opacity-60 mb-4 flex items-center gap-2">
                  <Map size={14}/> Campaign Details
               </h3>
               <p className="font-serif italic opacity-80 leading-relaxed text-sm">
                  {campaign.description || "No description provided."}
               </p>
            </MythosPanel>

            <MythosPanel variant="deep" className="p-6">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[10px] uppercase font-bold tracking-[0.2em] text-[var(--gold-accent)] opacity-60 flex items-center gap-2">
                     <Users size={14} /> Adventurers
                  </h3>
               </div>
               
               <div className="opacity-40 text-center py-6 border-y border-white/5 font-serif italic text-sm">
                  Character associations incoming... 
                  (You would invite characters to join your campaign by submitting their IDs or searching)
               </div>
               
            </MythosPanel>
         </aside>
      </main>
    </div>
  );
}
