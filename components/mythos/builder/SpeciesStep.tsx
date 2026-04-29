'use client';

import React from 'react';
import { MythosPanel, MythosLabel } from '../UI';

interface SpeciesStepProps {
  race: any;
  setRace: (v: any) => void;
  races: any[];
}

export const SpeciesStep = ({ race, setRace, races }: SpeciesStepProps) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {races.map((r) => (
          <button
            key={r.name}
            onClick={() => setRace(r)}
            className={cn(
              "text-left p-6 rounded-xl border transition-all h-full flex flex-col justify-between",
              race?.name === r.name ? "bg-[var(--gold-accent)]/10 border-[var(--gold-accent)] shadow-[0_0_20px_rgba(197,160,89,0.1)]" : "bg-black/40 border-white/5 hover:border-white/20"
            )}
          >
            <div>
              <div className="font-serif italic font-black text-xl mb-1">{r.name}</div>
              <div className="text-[8px] uppercase tracking-widest opacity-40">{r.source}</div>
            </div>
          </button>
        ))}
      </div>

      {race && (
        <MythosPanel variant="deep" className="p-8 border-[var(--gold-accent)]/20">
           <h3 className="font-serif italic text-2xl text-[var(--gold-accent)] mb-4">{race.name} Lineage</h3>
           <p className="font-serif italic opacity-70 leading-relaxed mb-6 border-b border-white/5 pb-6">
              {race.description || 'This lineage is storied and complex, spanning cycles of growth and decline in the mythic realms.'}
           </p>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                 <MythosLabel>Inherent Traits</MythosLabel>
                 <div className="text-xs space-y-2 opacity-60">
                    {/* Placeholder for real trait extraction if available */}
                    <p>• Darkvision (60ft)</p>
                    <p>• Elemental Resistance</p>
                    <p>• Ancestral Legacy</p>
                 </div>
              </div>
           </div>
        </MythosPanel>
      )}
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
