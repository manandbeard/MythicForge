'use client';

import React, { useState } from 'react';
import { MythosPanel, MythosLabel, MythosInput, MythosButton } from '../UI';
import { Sparkles, Loader2, Book } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

interface LoreStepProps {
  race: string;
  charClass: string;
  alignment: string;
  setAlignment: (v: string) => void;
  keywords: string;
  setKeywords: (v: string) => void;
  backstory: string;
  setBackstory: (v: string) => void;
  physicalDesc: string;
  setPhysicalDesc: (v: string) => void;
  traits: string;
  setTraits: (v: string) => void;
}

const ALIGNMENTS = [
  'Lawful Good', 'Neutral Good', 'Chaotic Good',
  'Lawful Neutral', 'True Neutral', 'Chaotic Neutral',
  'Lawful Evil', 'Neutral Evil', 'Chaotic Evil'
];

export const LoreStep = ({
  race, charClass, alignment, setAlignment, keywords, setKeywords,
  backstory, setBackstory, physicalDesc, setPhysicalDesc, traits, setTraits
}: LoreStepProps) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateLore = async () => {
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY as string });
      
      const prompt = `
        As an expert Dungeons & Dragons dungeon master and creative writer, generate a rich lore profile for a new player character.
        
        Details:
        - Race: ${race || 'Unknown'}
        - Class: ${charClass || 'Unknown'}
        - Alignment: ${alignment || 'True Neutral'}
        - Special Keywords/Themes: ${keywords || 'none'}
        
        Provide the response in the following strict JSON format, without any markdown formatting or extra text:
        {
          "backstory": "A rich, multi-paragraph backstory detailing their origins, why they became an adventurer, and a significant past event. Make it evocative and fit common D&D lore.",
          "physicalDescription": "A detailed physical description including defining features, clothing vibe, and noticeable quirks.",
          "personalityTraits": "A paragraph describing their personality, bonds, ideals, and flaws."
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });
      
      const jsonStr = response.text?.trim() || '{}';
      const data = JSON.parse(jsonStr);
      
      if (data.backstory) setBackstory(data.backstory);
      if (data.physicalDescription) setPhysicalDesc(data.physicalDescription);
      if (data.personalityTraits) setTraits(data.personalityTraits);

    } catch (error) {
      console.error("Failed to generate lore:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <MythosLabel>Alignment</MythosLabel>
            <select 
              value={alignment}
              onChange={(e) => setAlignment(e.target.value)}
              className="w-full bg-black/60 border border-white/10 p-4 rounded-xl text-lg font-serif italic text-[var(--parchment)] focus:border-[var(--gold-accent)]/50 focus:outline-none transition-all"
            >
              <option value="">Select an alignment...</option>
              {ALIGNMENTS.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-2">
            <MythosLabel>Inspirational Keywords (Optional)</MythosLabel>
            <MythosInput
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="e.g. betrayed by mentor, seeks a hidden artifact, scarred, speaks with spirits"
              className="w-full text-lg"
            />
          </div>

          <MythosPanel variant="deep" className="p-6 border border-[var(--magic-blue)]/30">
            <h3 className="flex items-center gap-2 text-[var(--magic-blue)] font-bold uppercase tracking-widest text-xs mb-4">
              <Sparkles size={16} /> Oracle AI Generation
            </h3>
            <p className="text-sm font-serif italic opacity-70 mb-6">
              Call upon the Oracle to weave the threads of fate. It will read your {race || 'chosen race'} {charClass || 'chosen class'}, alignment, and whispers to forge a unique destiny.
            </p>
            <MythosButton onClick={handleGenerateLore} disabled={isGenerating} size="lg" className="w-full justify-center">
              {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Book size={18} />}
              {isGenerating ? 'Weaving Destiny...' : 'Generate Lore'}
            </MythosButton>
          </MythosPanel>
        </div>

        <div className="space-y-6">
           <div className="space-y-2">
             <MythosLabel>Background Story</MythosLabel>
             <textarea
               value={backstory}
               onChange={e => setBackstory(e.target.value)}
               className="w-full min-h-[150px] bg-black/40 border-b border-[var(--gold-accent)]/20 hover:border-[var(--gold-accent)]/50 focus:border-[var(--gold-accent)] p-4 font-serif text-[var(--parchment)] text-sm leading-relaxed focus:outline-none transition-all rounded-t-xl"
               placeholder="Your history awaits..."
             />
           </div>
           <div className="space-y-2">
             <MythosLabel>Physical Description</MythosLabel>
             <textarea
               value={physicalDesc}
               onChange={e => setPhysicalDesc(e.target.value)}
               className="w-full min-h-[100px] bg-black/40 border-b border-[var(--gold-accent)]/20 hover:border-[var(--gold-accent)]/50 focus:border-[var(--gold-accent)] p-4 font-serif text-[var(--parchment)] text-sm leading-relaxed focus:outline-none transition-all rounded-t-xl"
               placeholder="Piercing green eyes, adorned in mismatched armor..."
             />
           </div>
           <div className="space-y-2">
             <MythosLabel>Traits, Ideals, Bonds & Flaws</MythosLabel>
             <textarea
               value={traits}
               onChange={e => setTraits(e.target.value)}
               className="w-full min-h-[100px] bg-black/40 border-b border-[var(--gold-accent)]/20 hover:border-[var(--gold-accent)]/50 focus:border-[var(--gold-accent)] p-4 font-serif text-[var(--parchment)] text-sm leading-relaxed focus:outline-none transition-all rounded-t-xl"
               placeholder="I would do anything to protect the temple..."
             />
           </div>
        </div>
      </div>
    </div>
  );
};
