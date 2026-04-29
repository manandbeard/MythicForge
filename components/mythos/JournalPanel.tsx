'use client';

import React, { useState } from 'react';
import { MythosPanel, MythosLabel, MythosButton } from './UI';
import { Book, Sparkles, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { GoogleGenAI } from '@google/genai';

interface JournalPanelProps {
  character: any;
  updateCharacter: (updates: any) => void;
}

export const JournalPanel = ({ character, updateCharacter }: JournalPanelProps) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateLore = async () => {
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY as string });
      
      const prompt = `
        As an expert Dungeons & Dragons dungeon master and creative writer, generate a rich lore profile for a player character.
        
        Details:
        - Race: ${character.race || 'Unknown'}
        - Class: ${character.class || 'Unknown'}
        - Alignment: ${character.alignment || 'Unknown'}
        
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
      
      updateCharacter({
        backstoryText: data.backstory || character.backstoryText || '',
        physicalDesc: data.physicalDescription || character.physicalDesc || '',
        traits: data.personalityTraits || character.traits || '',
        persist: true
      });

    } catch (error) {
      console.error("Failed to generate lore:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-serif font-black italic text-[var(--gold-accent)]">The Chronicle</h2>
            <p className="text-xs uppercase font-bold tracking-widest opacity-40">Tales of the chosen</p>
          </div>
          <MythosButton variant="secondary" onClick={handleGenerateLore} disabled={isGenerating}>
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {isGenerating ? 'Divining...' : 'Regenerate Lore with AI'}
          </MythosButton>
       </div>

       <div className="grid grid-cols-1 gap-8">
          <MythosPanel>
            <div className="flex items-center gap-3 mb-6">
               <Book size={20} className="text-[var(--gold-accent)]" />
               <h3 className="font-serif italic font-bold text-lg">Background Story</h3>
            </div>
            <textarea
              className="w-full min-h-[300px] bg-black/40 border border-white/5 rounded-xl p-6 font-serif text-[var(--parchment)] leading-loose focus:border-[var(--gold-accent)]/50 focus:outline-none transition-colors resize-y"
              value={character.backstoryText || ''}
              onChange={(e) => updateCharacter({ backstoryText: e.target.value })}
              placeholder="Your ancient history..."
            />
          </MythosPanel>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <MythosPanel>
               <h3 className="font-serif italic font-bold text-lg mb-6">Physical Traits & Appearance</h3>
               <textarea
                 className="w-full min-h-[150px] bg-black/40 border border-white/5 rounded-xl p-4 font-serif text-sm leading-relaxed focus:border-[var(--gold-accent)]/50 focus:outline-none transition-colors resize-y"
                 value={character.physicalDesc || ''}
                 onChange={(e) => updateCharacter({ physicalDesc: e.target.value })}
                 placeholder="Scars, robes, distinct features..."
               />
             </MythosPanel>
             <MythosPanel>
               <h3 className="font-serif italic font-bold text-lg mb-6">Ideals, Bonds & Flaws</h3>
               <textarea
                 className="w-full min-h-[150px] bg-black/40 border border-white/5 rounded-xl p-4 font-serif text-sm leading-relaxed focus:border-[var(--gold-accent)]/50 focus:outline-none transition-colors resize-y"
                 value={character.traits || ''}
                 onChange={(e) => updateCharacter({ traits: e.target.value })}
                 placeholder="I will die for my friends, but I lie constantly..."
               />
             </MythosPanel>
          </div>
       </div>
    </div>
  );
};
