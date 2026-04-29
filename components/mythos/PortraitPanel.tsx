'use client';

import React from 'react';
import { MythosPanel, MythosLabel, MythosInput } from './UI';
import Image from 'next/image';
import { Image as ImageIcon, Sparkles, Plus, Trash2 } from 'lucide-react';

interface PortraitPanelProps {
  character: any;
  updateCharacter: (updates: any) => void;
  onPortraitClick: () => void;
  onLevelUp: () => void;
}

export const PortraitPanel = ({ character, updateCharacter, onPortraitClick, onLevelUp }: PortraitPanelProps) => {
  return (
    <div className="space-y-6">
      <MythosPanel variant="default" className="relative overflow-hidden group p-0 aspect-square">
        <div className="w-full h-full relative cursor-pointer" onClick={onPortraitClick}>
          {character.imageUrl ? (
            <Image 
              src={character.imageUrl} 
              alt={character.name} 
              fill 
              className="object-cover opacity-80 group-hover:opacity-100 transition-all duration-700 group-hover:scale-105" 
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-black/40">
               <ImageIcon size={48} className="text-[var(--gold-accent)] opacity-20" />
               <span className="text-[10px] uppercase font-bold tracking-[0.3em] opacity-40 mt-4">Unseal Vision</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
          <div className="absolute bottom-4 left-0 right-0 text-center opacity-0 group-hover:opacity-100 transition-all">
             <span className="px-4 py-2 bg-[var(--gold-accent)] text-[var(--deep-slate)] rounded-full text-[10px] font-bold uppercase tracking-widest shadow-xl">
                Redraw Portait
             </span>
          </div>
        </div>
      </MythosPanel>

      <MythosPanel variant="deep" className="space-y-4">
         <div>
            <MythosLabel>True Name</MythosLabel>
            <input
              type="text"
              value={character.name || ''}
              onChange={(e) => updateCharacter({ name: e.target.value })}
              className="w-full bg-transparent border-b border-[var(--gold-accent)]/20 py-1 font-serif text-2xl outline-none focus:border-[var(--gold-accent)] text-[var(--gold-accent)] font-black"
            />
         </div>

         <div className="grid grid-cols-2 gap-4">
            <div>
               <MythosLabel>Heritage</MythosLabel>
               <input
                 type="text"
                 value={character.race || ''}
                 onChange={(e) => updateCharacter({ race: e.target.value })}
                 className="w-full bg-transparent border-b border-white/5 py-1 font-serif italic outline-none focus:border-[var(--gold-accent)] text-sm"
               />
            </div>
            <div className="flex flex-col">
               <MythosLabel>Rank (Level)</MythosLabel>
               <div className="flex items-center gap-2">
                  <span className="font-serif text-xl border-b border-white/10 px-2 italic text-[var(--gold-accent)]">{character.level || 1}</span>
                  <button 
                    onClick={onLevelUp}
                    className="flex items-center gap-1 px-2 py-0.5 bg-[var(--gold-accent)]/10 border border-[var(--gold-accent)]/30 text-[var(--gold-accent)] rounded text-[8px] font-bold uppercase tracking-widest hover:bg-[var(--gold-accent)] hover:text-black transition-all"
                  >
                    <Plus size={10} /> Up
                  </button>
               </div>
            </div>
         </div>

         <div className="grid grid-cols-1 gap-4">
            <div>
               <MythosLabel>Order (Class)</MythosLabel>
               <input
                 type="text"
                 value={character.class || ''}
                 onChange={(e) => updateCharacter({ class: e.target.value })}
                 className="w-full bg-transparent border-b border-white/5 py-1 font-serif italic outline-none focus:border-[var(--gold-accent)] text-sm"
               />
            </div>
         </div>
      </MythosPanel>
    </div>
  );
};
