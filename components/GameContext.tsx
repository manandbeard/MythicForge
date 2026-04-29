"use client";

import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Dices, Skull, ArrowUp, ArrowDown, Target, Sparkles } from 'lucide-react';
import Dice3DManager from './Dice3D';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, query, orderBy, limit, onSnapshot, writeBatch } from 'firebase/firestore';
import { explainActionEffect } from '@/lib/ai-service';

type DiceType = 4 | 6 | 8 | 10 | 12 | 20;
type RollMode = 'normal' | 'advantage' | 'disadvantage';

interface RollRequest {
  id: string;
  count: number;
  type: DiceType;
  modifier: number;
  reason: string;
}

interface RollResult {
  total: number;
  individual: number[];
  dropped?: number;
}

export interface RollLogEntry {
  id: string;
  timestamp: number;
  playerName?: string;
  request: RollRequest;
  result: RollResult;
  mode: RollMode;
}

interface GameContextType {
  rollDice: (count: number, type: DiceType, modifier: number, reason: string, description?: string, summary?: string) => void;
  comboRoll: (rolls: Omit<RollRequest, 'id'>[], description?: string, summary?: string) => void;
  setCampaignContext: (campaignId: string | null, playerName: string) => void;
  rollHistory: RollLogEntry[];
  clearHistory: () => void;
}

const GameContext = createContext<GameContextType>({
  rollDice: () => {},
  comboRoll: () => {},
  setCampaignContext: () => {},
  rollHistory: [],
  clearHistory: () => {},
});

export const useGame = () => useContext(GameContext);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [activeRoll, setActiveRoll] = useState<RollRequest | null>(null);
  const [rollMode, setRollMode] = useState<RollMode | null>(null);
  const [rollResult, setRollResult] = useState<RollResult | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [show3D, setShow3D] = useState(false);
  const [rollHistory, setRollHistory] = useState<RollLogEntry[]>([]);
  const [actionEffect, setActionEffect] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);
  
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string>('Unknown Hero');

  const setCampaignContext = React.useCallback((id: string | null, name: string) => {
      setCampaignId(id);
      setPlayerName(name);
  }, []);

  useEffect(() => {
    if (!campaignId) return;

    const q = query(
       collection(db, `campaigns/${campaignId}/rolls`),
       orderBy('timestamp', 'desc'),
       limit(50)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
       const rolls = snap.docs.map(doc => doc.data() as RollLogEntry);
       setRollHistory(rolls);
    }, (error) => {
       console.error("Firebase rolls sync error: ", error);
    });

    return () => unsubscribe();
  }, [campaignId]);

  const pushRollToHistory = (entry: RollLogEntry) => {
      if (campaignId) {
          const docRef = doc(collection(db, `campaigns/${campaignId}/rolls`), entry.id);
          setDoc(docRef, entry).catch(console.error);
      } else {
          setRollHistory(prev => [entry, ...prev]);
      }
  };

  const pushComboRollsToHistory = (entries: RollLogEntry[]) => {
      if (campaignId) {
          const batch = writeBatch(db);
          entries.forEach(entry => {
             const docRef = doc(collection(db, `campaigns/${campaignId}/rolls`), entry.id);
             batch.set(docRef, entry);
          });
          batch.commit().catch(console.error);
      } else {
          setRollHistory(prev => [...entries, ...prev]);
      }
  };

  const [activeCombo, setActiveCombo] = useState<RollRequest[] | null>(null);
  const [comboResult, setComboResult] = useState<RollResult[] | null>(null);

  const generateSingleResult = (rollReq: RollRequest, mode: RollMode): RollResult => {
    let total = rollReq.modifier;
    const individual: number[] = [];
    let dropped: undefined | number = undefined;

    if (rollReq.type === 20 && rollReq.count === 1 && mode !== 'normal') {
        const roll1 = Math.floor(Math.random() * 20) + 1;
        const roll2 = Math.floor(Math.random() * 20) + 1;
        if (mode === 'advantage') {
          const kept = Math.max(roll1, roll2);
          dropped = Math.min(roll1, roll2);
          total += kept;
          individual.push(kept);
        } else {
          const kept = Math.min(roll1, roll2);
          dropped = Math.max(roll1, roll2);
          total += kept;
          individual.push(kept);
        }
    } else {
        for (let i = 0; i < rollReq.count; i++) {
          const val = Math.floor(Math.random() * rollReq.type) + 1;
          individual.push(val);
          total += val;
        }
    }
    return { total, individual, dropped };
  };

  const triggerRoll = React.useCallback((rollReq: RollRequest, mode: RollMode) => {
    setRollMode(mode);
    setIsRolling(true);
    setShow3D(true);
    
    const resultObj = generateSingleResult(rollReq, mode);
    setRollResult(resultObj);
    
    // Add to history sync
    pushRollToHistory({
      id: Math.random().toString(),
      timestamp: Date.now(),
      playerName,
      request: rollReq,
      result: resultObj,
      mode: mode
    });
  }, [playerName, campaignId]); // eslint-disable-line react-hooks/exhaustive-deps

  const triggerComboRoll = React.useCallback((requests: RollRequest[], attackMode: RollMode) => {
    setRollMode(attackMode);
    setIsRolling(true);
    setShow3D(true);

    const generatedResults = requests.map((req, idx) => {
        // Apply advantage/disadvantage ONLY to the first roll (typically the d20 attack)
        const mode = idx === 0 ? attackMode : 'normal';
        return generateSingleResult(req, mode);
    });

    setComboResult(generatedResults);

    const newEntries = requests.map((req, idx) => ({
      id: Math.random().toString(),
      timestamp: Date.now(),
      playerName,
      request: req,
      result: generatedResults[idx],
      mode: (idx === 0 ? attackMode : 'normal') as RollMode
    }));

    pushComboRollsToHistory(newEntries);
  }, [playerName, campaignId]); // eslint-disable-line react-hooks/exhaustive-deps

  const rollDice = React.useCallback((count: number, type: DiceType, modifier: number, reason: string, description?: string, summary?: string) => {
    const newRoll = { id: Math.random().toString(), count, type, modifier, reason };
    setActiveCombo(null);
    setActiveRoll(newRoll);
    setRollResult(null);
    setShow3D(false);
    setActionEffect(null);
    
    if (summary) {
      setActionEffect(summary);
    } else if (description) {
      setIsExplaining(true);
      explainActionEffect(reason, description).then(desc => {
          setActionEffect(desc || null);
          setIsExplaining(false);
      });
    }

    if (type === 20 && count === 1) {
      setRollMode(null);
      setIsRolling(false);
    } else {
      setRollMode('normal');
      triggerRoll(newRoll, 'normal');
    }
  }, [triggerRoll]);

  const comboRoll = React.useCallback((rolls: Omit<RollRequest, 'id'>[], description?: string, summary?: string) => {
      const fullReqs = rolls.map(r => ({ ...r, id: Math.random().toString() }));
      setActiveRoll(null);
      setActiveCombo(fullReqs);
      setComboResult(null);
      setRollMode(null);
      setIsRolling(false);
      setShow3D(false);
      setActionEffect(null);

      if (summary) {
        setActionEffect(summary);
      } else if (description) {
        setIsExplaining(true);
        const actionName = fullReqs[0].reason.replace('Attack: ', '').replace('Damage: ', '');
        explainActionEffect(actionName, description).then(desc => {
            setActionEffect(desc || null);
            setIsExplaining(false);
        });
      }
  }, []);

  const handle3DSettled = () => {
    setIsRolling(false);
    setTimeout(() => setShow3D(false), 500); // fade out physics
  };

  const clearRoll = () => {
    if (isRolling && show3D) return;
    setActiveRoll(null);
    setRollResult(null);
    setActiveCombo(null);
    setComboResult(null);
    setRollMode(null);
    setShow3D(false);
  };

  const clearHistory = () => setRollHistory([]);

  const isNat20 = activeRoll?.type === 20 && rollResult?.individual[0] === 20;
  const isNat1 = activeRoll?.type === 20 && rollResult?.individual[0] === 1;

  return (
    <GameContext.Provider value={{ rollDice, comboRoll, setCampaignContext, rollHistory, clearHistory }}>
      {children}
      
      {/* Unified 8-bit / Vintage Dice Roller Modal */}
      <AnimatePresence>
        {(activeRoll || activeCombo) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
            onClick={clearRoll}
          >
            <motion.div 
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
              className="eldritch-panel border border-[var(--gold-accent)]/50 bg-[#0a0a0c] p-8 rounded-xl shadow-[0_0_80px_rgba(197,160,89,0.15)] max-w-sm w-full text-center relative overflow-hidden font-mono"
              onClick={e => e.stopPropagation()}
            >
              {/* Fancy corner accents */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[var(--gold-accent)] opacity-50 m-2 rounded-tl" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[var(--gold-accent)] opacity-50 m-2 rounded-tr" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[var(--gold-accent)] opacity-50 m-2 rounded-bl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[var(--gold-accent)] opacity-50 m-2 rounded-br" />

              <h3 className="text-xl font-bold text-[var(--gold-accent)] mb-2 uppercase tracking-widest">
                {activeRoll?.reason || activeCombo?.[0]?.reason || "Unseal the Dice"}
              </h3>
              <p className="text-sm opacity-60 mb-6 font-serif italic text-white flex items-center justify-center gap-2">
                 <Dices size={16} /> 
                 {activeRoll ? (
                   `Rolling ${activeRoll.count}d${activeRoll.type} ${activeRoll.modifier >= 0 ? `+ ${activeRoll.modifier}` : `- ${Math.abs(activeRoll.modifier)}`}`
                 ) : activeCombo ? (
                   `Multi-Roll: [${activeCombo.map(r => `${r.count}d${r.type}`).join(' + ')}]`
                 ) : ""}
              </p>
              
              <div className="min-h-[160px] flex flex-col justify-center items-center relative perspective-1000">
                <AnimatePresence mode="wait">
                  {!rollMode ? (
                     <motion.div 
                        key="select-mode"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="flex flex-col gap-3 w-full"
                      >
                        <p className="text-white/80 font-serif italic mb-2">How do you roll?</p>
                        <button 
                          onClick={() => activeCombo ? triggerComboRoll(activeCombo, 'advantage') : triggerRoll(activeRoll!, 'advantage')}
                          className="flex items-center justify-center gap-2 px-4 py-3 bg-[#4ade80]/10 border border-[#4ade80]/50 text-[#4ade80] font-bold uppercase tracking-widest rounded hover:bg-[#4ade80] hover:text-black transition-all"
                        >
                          <ArrowUp size={18} /> Advantage
                        </button>
                        <button 
                          onClick={() => activeCombo ? triggerComboRoll(activeCombo, 'normal') : triggerRoll(activeRoll!, 'normal')}
                          className="flex items-center justify-center gap-2 px-4 py-3 bg-white/5 border border-white/20 text-white font-bold uppercase tracking-widest rounded hover:bg-white hover:text-black transition-all"
                        >
                          <Target size={18} /> Normal
                        </button>
                        <button 
                          onClick={() => activeCombo ? triggerComboRoll(activeCombo, 'disadvantage') : triggerRoll(activeRoll!, 'disadvantage')}
                          className="flex items-center justify-center gap-2 px-4 py-3 bg-[var(--blood-red)]/10 border border-[var(--blood-red)]/50 text-[var(--blood-red)] font-bold uppercase tracking-widest rounded hover:bg-[var(--blood-red)] hover:text-black transition-all"
                        >
                          <ArrowDown size={18} /> Disadvantage
                        </button>
                      </motion.div>
                  ) : isRolling ? (
                    <motion.div key="rolling" className="w-full h-full min-h-[200px] relative">
                        {show3D && (
                          <Dice3DManager 
                            dice={
                              activeCombo && comboResult 
                                ? activeCombo.flatMap((req, idx) => {
                                    const res = comboResult[idx];
                                    const mode = idx === 0 ? rollMode : 'normal';
                                    if (req.type === 20 && req.count === 1 && mode !== 'normal') {
                                        return [
                                            { type: 20 as DiceType, targetValue: res.individual[0], mode: mode as any },
                                            { type: 20 as DiceType, targetValue: res.dropped!, mode: mode as any }
                                        ];
                                    }
                                    return Array.from({ length: req.count }).map((_, i) => ({
                                        type: req.type as DiceType,
                                        targetValue: res.individual[i],
                                        mode: 'normal' as any
                                    }));
                                })
                                : rollMode === 'advantage' || rollMode === 'disadvantage' 
                                 ? [
                                     { type: 20 as DiceType, targetValue: rollResult?.individual[0] || 20, mode: rollMode as any },
                                     { type: 20 as DiceType, targetValue: rollResult?.dropped || 1, mode: rollMode as any }
                                   ]
                                 : Array.from({ length: activeRoll!.count }).map((_, i) => ({
                                     type: activeRoll!.type as DiceType,
                                     targetValue: rollResult?.individual[i] || activeRoll!.type,
                                     mode: 'normal' as any
                                   }))
                            }
                            onSettled={handle3DSettled}
                          />
                        )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="result"
                      initial={{ scale: 0.5, opacity: 0, rotate: -45 }}
                      animate={{ scale: 1, opacity: 1, rotate: 0 }}
                      transition={{ type: "spring", bounce: 0.5 }}
                      className="flex flex-col items-center w-full"
                    >
                      {/* Crits (only check the first roll if it's a D20) */}
                      {((activeRoll?.type === 20 && rollResult?.individual[0] === 20) || (activeCombo?.[0]?.type === 20 && comboResult?.[0]?.individual[0] === 20)) && (
                        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="absolute -top-12 text-[var(--gold-accent)] flex items-center gap-2 font-bold uppercase tracking-widest animate-pulse">
                          <Sparkles size={16} /> Critical Success! <Sparkles size={16} />
                        </motion.div>
                      )}
                      
                      {activeCombo && comboResult ? (
                         <div className="flex flex-col gap-6 w-full px-4">
                            {activeCombo.map((req, idx) => {
                               const res = comboResult[idx];
                               return (
                                 <div key={idx} className="flex flex-col items-center p-4 border border-[var(--gold-accent)]/20 bg-black/40 rounded-lg">
                                    <div className="text-4xl font-black text-white">{res.total}</div>
                                    <p className="text-[10px] uppercase font-bold tracking-widest text-[var(--gold-accent)] opacity-60 mt-1">{req.reason}</p>
                                    <p className="text-[9px] font-mono opacity-40 mt-1">
                                      {res.individual.join(' + ')} {req.modifier !== 0 ? (req.modifier > 0 ? ` + ${req.modifier}` : ` - ${Math.abs(req.modifier)}`) : ''}
                                    </p>
                                 </div>
                               );
                            })}
                         </div>
                      ) : (
                         <>
                            <div className={`text-8xl font-black drop-shadow-[0_0_20px_rgba(197,160,89,0.5)] tracking-tighter ${activeRoll?.type === 20 && rollResult?.individual[0] === 20 ? 'text-[var(--gold-accent)]' : activeRoll?.type === 20 && rollResult?.individual[0] === 1 ? 'text-[var(--blood-red)]' : 'text-white'}`}>
                               {rollResult?.total}
                            </div>

                            <div className="mt-4 flex flex-col items-center gap-1 opacity-70">
                               {rollMode === 'advantage' && rollResult?.dropped !== undefined && (
                                  <span className="text-[10px] uppercase tracking-widest text-[#4ade80]">
                                    Advantage (Dropped {rollResult.dropped})
                                  </span>
                               )}
                               {rollMode === 'disadvantage' && rollResult?.dropped !== undefined && (
                                  <span className="text-[10px] uppercase tracking-widest text-[var(--blood-red)]">
                                    Disadvantage (Dropped {rollResult.dropped})
                                  </span>
                               )}

                               <div className="text-xs flex gap-2 flex-wrap justify-center font-mono">
                                  {rollResult?.individual.length === 1 ? (
                                    <span>D20: {rollResult.individual[0]}</span>
                                  ) : (
                                    <span>[ {rollResult?.individual.join(', ')} ]</span>
                                  )}
                                  {activeRoll?.modifier !== 0 && (
                                    <span className="text-[var(--gold-accent)]">
                                      {activeRoll && activeRoll.modifier >= 0 ? `+${activeRoll.modifier}` : activeRoll?.modifier} Mod
                                    </span>
                                  )}
                               </div>
                            </div>
                         </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

               {isExplaining && (
                <div className="mt-4 flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-2 border-[var(--gold-accent)]/20 border-t-[var(--gold-accent)] rounded-full animate-spin" />
                  <p className="text-[10px] uppercase tracking-widest text-[var(--gold-accent)]/60 animate-pulse">Consulting the Grimoire...</p>
                </div>
              )}

              {actionEffect && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-6 p-4 bg-black/40 border border-[var(--gold-accent)]/20 rounded-lg text-center relative overflow-hidden"
                >
                  <div className="text-[8px] uppercase tracking-[0.2em] text-[var(--gold-accent)] font-bold mb-2 opacity-60">Info for your DM</div>
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[var(--gold-accent)] to-transparent opacity-30" />
                  <p className="text-xs italic text-[var(--parchment)] leading-relaxed font-serif">
                    {actionEffect}
                  </p>
                </motion.div>
              )}

               {(rollResult || comboResult) && !isRolling && (
                <motion.button 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={clearRoll}
                  className="w-full mt-6 px-6 py-3 border border-[var(--gold-accent)]/50 text-[var(--gold-accent)] font-bold uppercase tracking-widest rounded hover:bg-[var(--gold-accent)] hover:text-black transition-all"
                >
                  Accept Fate
                </motion.button>
              )}

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </GameContext.Provider>
  );
}
