'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from '@/lib/firebase';
import { calculateDerivedStats } from '@/lib/dnd-engine-derived'; // Refactored out logic

export function useCharacter() {
  const { id } = useParams();
  const router = useRouter();
  const [character, setCharacter] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;

    const docRef = doc(db, 'characters', id as string);
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setCharacter({ id: docSnap.id, ...docSnap.data() });
      } else {
        router.push('/');
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `characters/${id}`);
      setLoading(false);
    });

    return () => unsub();
  }, [id, router]);

  const updateCharacter = useCallback(async (updates: any) => {
    if (!character || !id) return;

    // Local update first for snappy UI
    let newChar = { ...character, ...updates };

    // Derived stats logic
    if (updates.inventory || updates.baseStats || updates.stats || updates.level || updates.class) {
      newChar = calculateDerivedStats(newChar);
    }

    // Update state
    setCharacter(newChar);

    // Persist if it's a persistent update
    if (updates.persist) {
      setSaving(true);
      try {
        const { id: _, persist: __, ...dataToSave } = newChar;
        await updateDoc(doc(db, 'characters', id as string), {
          ...dataToSave,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `characters/${id}`);
      } finally {
        setSaving(false);
      }
    }
  }, [character, id]);

  const deleteCharacter = useCallback(async () => {
    if (!id) return;
    if (!window.confirm('Vanish this legend from the Archive forever?')) return;

    try {
      await deleteDoc(doc(db, 'characters', id as string));
      router.push('/');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `characters/${id}`);
    }
  }, [id, router]);

  return {
    character,
    loading,
    saving,
    updateCharacter,
    deleteCharacter
  };
}
