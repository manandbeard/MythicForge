'use client';

import React from 'react';
import { MythosPanel, MythosLabel } from './UI';
import { Ability, ABILITIES, formatModifier, getModifier, SKILLS } from '@/lib/dnd-engine';
import { Dice5, Target } from 'lucide-react';
import { useGame } from '../GameContext';
import { DataCombobox } from '../DataCombobox';

interface AttributesPanelProps {
  character: any;
  updateCharacter: (updates: any) => void;
}

export const AttributesPanel = ({ character, updateCharacter }: AttributesPanelProps) => {
  const { rollDice } = useGame();

  const handleStatChange = (stat: Ability, value: number) => {
    updateCharacter({
      baseStats: {
        ...(character.baseStats || character.stats),
        [stat]: value
      }
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Identity Configurations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MythosPanel variant="deep" className="p-4 border-[var(--gold-accent)]/10">
          <MythosLabel className="mb-2">Race / Lineage</MythosLabel>
          <DataCombobox
            category="races"
            placeholder="Select Race..."
            selectedId={character.raceId || character.race}
            getItemLabel={(item) => item.name}
            onSelect={(item) => updateCharacter({ race: item.name, raceId: item.id })}
          />
        </MythosPanel>
        <MythosPanel variant="deep" className="p-4 border-[var(--gold-accent)]/10">
          <MythosLabel className="mb-2">Class</MythosLabel>
          <DataCombobox
            category="classes"
            placeholder="Select Class..."
            selectedId={character.classId || character.class}
            getItemLabel={(item) => item.name}
            onSelect={(item) => updateCharacter({ class: item.name, classId: item.id })}
          />
        </MythosPanel>
        <MythosPanel variant="deep" className="p-4 border-[var(--gold-accent)]/10">
          <MythosLabel className="mb-2">Background</MythosLabel>
          <DataCombobox
            category="backgrounds"
            placeholder="Select Background..."
            selectedId={character.backgroundId || character.background}
            getItemLabel={(item) => item.name}
            onSelect={(item) => updateCharacter({ background: item.name, backgroundId: item.id })}
          />
        </MythosPanel>
      </div>

      {/* Ability Scores */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        {(Object.keys(ABILITIES) as Ability[]).map(ab => {
          const score = character.stats[ab];
          const mod = getModifier(score);
          
          return (
            <MythosPanel 
              key={ab} 
              variant="default" 
              className="flex flex-col items-center group relative overflow-hidden p-4"
            >
              <MythosLabel>{ABILITIES[ab].substring(0, 3)}</MythosLabel>
              <div className="text-4xl font-serif font-black mb-1 text-[var(--gold-accent)]">
                {formatModifier(mod)}
              </div>
              <div className="flex items-center gap-2 border-t border-[var(--gold-accent)]/10 pt-2 w-full justify-center">
                <input
                  type="number"
                  value={character.baseStats?.[ab] ?? score}
                  onChange={(e) => handleStatChange(ab, Number(e.target.value))}
                  className="w-10 bg-transparent text-center font-mono font-bold outline-none opacity-40 focus:opacity-100 transition-opacity"
                />
              </div>
              <button 
                onClick={() => rollDice(1, 20, mod, `Check: ${ABILITIES[ab]}`)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-40 hover:opacity-100 transition-all text-[var(--gold-accent)]"
              >
                <Dice5 size={14} />
              </button>
            </MythosPanel>
          );
        })}
      </div>

      {/* Skills & Saving Throws */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Saving Throws */}
        <MythosPanel variant="deep" className="p-0 overflow-hidden">
          <div className="bg-[var(--gold-accent)]/10 px-4 py-2 border-b border-[var(--gold-accent)]/20">
            <h3 className="font-serif italic font-bold text-sm tracking-wide">Saving Throws</h3>
          </div>
          <div className="p-4 grid grid-cols-2 gap-y-3 gap-x-6">
            {(Object.keys(ABILITIES) as Ability[]).map(ab => {
              const isProficient = character.proficiencies?.saves?.includes(ab);
              const mod = getModifier(character.stats[ab]) + (isProficient ? (character.proficiencyBonus || 2) : 0);
              
              return (
                <div key={ab} className="flex items-center justify-between group cursor-pointer" onClick={() => rollDice(1, 20, mod, `Save: ${ABILITIES[ab]}`)}>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-2 h-2 rounded-full border transition-all",
                      isProficient ? "bg-[var(--gold-accent)] border-[var(--gold-accent)] shadow-[0_0_8px_var(--gold-accent)]" : "border-[var(--gold-accent)]/30"
                    )} />
                    <span className="text-xs uppercase tracking-wider font-bold opacity-70 group-hover:opacity-100">{ABILITIES[ab]}</span>
                  </div>
                  <span className="font-mono text-sm font-bold text-[var(--gold-accent)]">{formatModifier(mod)}</span>
                </div>
              );
            })}
          </div>
        </MythosPanel>

        {/* Vital Skills */}
        <MythosPanel variant="deep" className="p-0 overflow-hidden">
          <div className="bg-[var(--gold-accent)]/10 px-4 py-2 border-b border-[var(--gold-accent)]/20">
            <h3 className="font-serif italic font-bold text-sm tracking-wide">Expertise & Skills</h3>
          </div>
          <div className="p-4 grid grid-cols-1 gap-1">
            {SKILLS.map(skill => {
              const isProficient = character.proficiencies?.skills?.includes(skill.name);
              const isExpertise = character.proficiencies?.expertise?.includes(skill.name);
              const abilityMod = getModifier(character.stats[skill.ability as Ability]);
              const pb = character.proficiencyBonus || 2;
              const totalMod = abilityMod + (isProficient ? pb : 0) + (isExpertise ? pb : 0);

              return (
                <div 
                  key={skill.name} 
                  className="flex items-center justify-between py-1 group hover:bg-white/5 px-2 rounded -mx-2 transition-colors cursor-pointer"
                  onClick={() => rollDice(1, 20, totalMod, `Skill: ${skill.name}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-2 h-2 transition-all",
                      isExpertise ? "rotate-45 bg-[var(--gold-accent)] shadow-[0_0_10px_var(--gold-accent)]" : 
                      isProficient ? "rounded-full bg-[var(--gold-accent)]/40" : "rounded-full border border-[var(--gold-accent)]/20"
                    )} />
                    <span className="text-[10px] uppercase font-bold tracking-widest opacity-60 group-hover:opacity-100">{skill.name}</span>
                    <span className="text-[8px] opacity-20 hidden group-hover:inline uppercase">{skill.ability}</span>
                  </div>
                  <span className="font-mono text-xs font-bold">{formatModifier(totalMod)}</span>
                </div>
              );
            })}
          </div>
        </MythosPanel>
      </div>
    </div>
  );
};

// Helper inside the file to avoid import issues for now
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
