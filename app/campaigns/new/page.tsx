'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from '@/lib/firebase';
import { Loader2, ArrowLeft, Save } from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { MythosButton, MythosInput, MythosLabel } from '@/components/mythos/UI';

export default function NewCampaign() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Campaign State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (!u) router.push('/');
    });
    return () => unsub();
  }, [router]);

  const handleCreate = async () => {
    if (!user || !name.trim()) return;
    setSaving(true);
    try {
      const docRef = await addDoc(collection(db, 'campaigns'), {
        uid: user.uid,
        name: name.trim(),
        description: description.trim(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      router.push(`/campaigns/${docRef.id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'campaigns');
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
      <div className="max-w-2xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <header className="space-y-4">
             <button onClick={() => router.push('/')} className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest opacity-40 hover:opacity-100 transition-opacity">
                <ArrowLeft size={16} /> Retreat to Library
             </button>
             <h1 className="text-5xl font-serif font-black tracking-tighter text-[var(--gold-accent)]">
               FORGE<span className="italic font-light">CAMPAIGN</span>
             </h1>
        </header>

        <section className="space-y-6">
          <div className="space-y-2">
            <MythosLabel>Campaign Title</MythosLabel>
            <MythosInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="E.g. Call of the Netherdeep"
              className="text-4xl w-full"
            />
          </div>
          <div className="space-y-2">
            <MythosLabel>World Description</MythosLabel>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What mysteries lie ahead in this world..."
              className="w-full bg-transparent border-b border-[var(--gold-accent)]/20 py-2 font-serif focus:outline-none focus:border-[var(--gold-accent)] transition-all placeholder:opacity-30 min-h-[150px] resize-y"
            />
          </div>
        </section>

        <footer>
           <MythosButton onClick={handleCreate} disabled={saving || !name.trim()} size="lg" className="w-full">
             {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
             Inscribe Myth
           </MythosButton>
        </footer>
      </div>
    </div>
  );
}
