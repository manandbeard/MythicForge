'use client';

import React, { useState } from 'react';
import { MythosPanel, MythosLabel, MythosInput, MythosButton } from '../UI';
import { Sparkles, Loader2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

interface IdentityStepProps {
  name: string;
  setName: (v: string) => void;
  background: string;
  setBackground: (v: string) => void;
  backgroundData: any[];
}

export const IdentityStep = ({ name, setName, background, setBackground, backgroundData }: IdentityStepProps) => {
  const [namePrompt, setNamePrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateName = async () => {
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY as string });
      const promptStr = namePrompt.trim() !== '' ? namePrompt : "a random, cool-sounding high fantasy hero";
      
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: `Generate a single, cool sounding fantasy name for a D&D character based on this idea or feeling: "${promptStr}". Only return the name itself, with no additional text, quotes, or explanations.`
      });
      const generatedName = response.text?.trim();
      if (generatedName) setName(generatedName);
    } catch (error) {
      console.error("Failed to generate name:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="space-y-4">
        <MythosLabel>Nom de Guerre (Name)</MythosLabel>
        <MythosInput
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="E.g. Sylas Nightbreeze"
          className="text-4xl w-full"
        />
        
        <div className="flex flex-col sm:flex-row gap-4 items-end bg-black/20 p-4 rounded-xl border border-white/5">
           <div className="flex-1 space-y-2 w-full">
              <span className="text-[10px] uppercase font-bold opacity-30 italic">AI Oracle Whisper</span>
              <MythosInput
                value={namePrompt}
                onChange={(e) => setNamePrompt(e.target.value)}
                placeholder="A dark elf assassin..."
                className="w-full text-sm py-1"
                onKeyDown={(e) => e.key === 'Enter' && handleGenerateName()}
              />
           </div>
           <MythosButton variant="secondary" size="sm" onClick={handleGenerateName} disabled={isGenerating}>
              {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {isGenerating ? 'Divining...' : 'Generate'}
           </MythosButton>
        </div>
      </div>

      <div className="space-y-4">
        <MythosLabel>Heritage Origin (Background)</MythosLabel>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           {backgroundData.map(b => (
             <button
               key={b.name}
               onClick={() => setBackground(b.name)}
               className={cn(
                 "text-left p-4 rounded-xl border transition-all",
                 background === b.name ? "bg-[var(--gold-accent)]/10 border-[var(--gold-accent)]/60 shadow-[0_0_15px_rgba(197,160,89,0.1)]" : "bg-black/40 border-white/5 hover:border-white/20"
               )}
             >
                <div className="font-serif italic font-bold">{b.name}</div>
                <div className="text-[10px] opacity-40 uppercase tracking-widest mt-1 line-clamp-2">{b.description}</div>
             </button>
           ))}
        </div>
      </div>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
