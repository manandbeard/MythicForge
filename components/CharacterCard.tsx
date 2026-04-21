'use client';

import React from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import Image from 'next/image';
import { User, Shield, Zap, BookOpen } from 'lucide-react';

interface CharacterCardProps {
  id: string;
  character: any;
}

export default function CharacterCard({ id, character }: CharacterCardProps) {
  return (
    <Link href={`/character/${id}`}>
      <motion.div
        whileHover={{ y: -4, scale: 1.02 }}
        className="eldritch-panel cursor-pointer relative overflow-hidden group h-full flex flex-col"
      >
        <div className="flex gap-4 items-start relative z-10">
          <div className="w-16 h-16 rounded-full border-2 border-[var(--gold-accent)] bg-black overflow-hidden shrink-0 relative">
            {character.imageUrl ? (
              <Image 
                src={character.imageUrl} 
                alt={character.name} 
                fill 
                className="object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[#111]">
                <User size={32} className="text-[var(--gold-accent)]" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-serif italic font-bold text-[var(--gold-accent)] leading-tight group-hover:text-white transition-colors">
              {character.name || 'Unnamed Adventurer'}
            </h3>
            <p className="text-xs uppercase tracking-widest font-semibold opacity-60 mt-1">
              Level {character.level || 1} {character.race} {character.class}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4 flex-1">
          <div className="vital-box-immersive">
            <span className="text-[10px] uppercase font-bold opacity-60 block">AC</span>
            <span className="font-mono text-lg text-[var(--gold-accent)]">{character.ac || 10}</span>
          </div>
          <div className="vital-box-immersive">
            <span className="text-[10px] uppercase font-bold opacity-60 block">HP</span>
            <span className="font-mono text-lg text-[var(--gold-accent)]">{character.hp?.max || 10}</span>
          </div>
          <div className="vital-box-immersive">
            <span className="text-[10px] uppercase font-bold opacity-60 block">XP</span>
            <span className="font-mono text-lg text-[var(--gold-accent)]">{character.level ? character.level * 1000 : 0}</span>
          </div>
        </div>

        {character.backstory && (
          <p className="mt-4 text-[11px] italic opacity-50 line-clamp-3 leading-relaxed border-t border-[rgba(197,160,89,0.2)] pt-2">
            &ldquo;{character.backstory}&rdquo;
          </p>
        )}

        {/* Decorative corner */}
        <div className="absolute top-0 right-0 w-8 h-8 opacity-20 pointer-events-none">
          <div className="absolute top-0 right-0 border-t-2 border-r-2 border-[var(--gold-accent)] w-full h-full" />
        </div>
      </motion.div>
    </Link>
  );
}
