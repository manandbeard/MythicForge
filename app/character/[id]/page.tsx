'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import Image from 'next/image';
import { 
  ArrowLeft, 
  Save, 
  Sword, 
  Shield, 
  Heart, 
  FastForward, 
  Zap, 
  Image as ImageIcon,
  Scroll,
  Backpack,
  Wand2,
  Trash2,
  Plus,
  Dice5,
  Sparkles,
  Search,
  CheckCircle2,
  Target,
  Skull,
  Settings
} from 'lucide-react';
import { doc, getDoc, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from '@/lib/firebase';
import { 
  getModifier, 
  formatModifier, 
  rollDice, 
  SKILLS, 
  Ability, 
  ABILITIES,
  SPELLCASTING_ABILITIES,
  getSpellSlots,
  getCasterType,
  getProficiencyBonus
} from '@/lib/dnd-engine';
import { generateBackstory, generatePortrait, analyzeAction, generateClassFeatures } from '@/lib/ai-service';
import { fetchSpells, fetchItems, fetchFeats, Spell, Item, extractText } from '@/lib/data-import';
import { useGame } from '@/components/GameContext';
import { ChevronDown, ChevronRight } from 'lucide-react';

export default function CharacterSheet() {
  const { id } = useParams();
  const router = useRouter();
  const { rollDice, comboRoll, setCampaignContext } = useGame();
  
  const [character, setCharacter] = useState<any>(null);
  const [baseStatsSynced, setBaseStatsSynced] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'main' | 'combat' | 'spells' | 'inventory' | 'feats' | 'backstory' | 'notes' | 'settings'>('main');
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  
  // 5e.tools search state
  const [libraryData, setLibraryData] = useState<{ spells: Spell[], items: Item[], feats: any[] }>({ spells: [], items: [], feats: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  
  // Spell filters & expansion state
  const [spellFilterLevel, setSpellFilterLevel] = useState<string>('all');
  const [spellFilterClass, setSpellFilterClass] = useState<string>('all');
  const [expandedArchiveSpells, setExpandedArchiveSpells] = useState<Set<number>>(new Set());
  const [expandedPersonalSpells, setExpandedPersonalSpells] = useState<Set<number>>(new Set());

  // Inventory filtering & expansion state
  const [inventorySearchLocal, setInventorySearchLocal] = useState('');
  const [inventorySortBy, setInventorySortBy] = useState<'name' | 'type'>('name');
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  // 5e Item Seeker filtering state
  const [itemTypeFilter, setItemTypeFilter] = useState<string>('all');
  const [itemRarityFilter, setItemRarityFilter] = useState<string>('all');
  
  // Portrait AI generation state
  const [portraitModalOpen, setPortraitModalOpen] = useState(false);
  const [portraitStyle, setPortraitStyle] = useState('Fantasy Realism');
  const [physicalDesc, setPhysicalDesc] = useState('');

  useEffect(() => {
     if (character) {
        setCampaignContext(character.campaignId || null, character.name || 'Unknown Hero');
     }
  }, [character, setCampaignContext]);

  useEffect(() => {
    const fetchChar = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'characters', id as string);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCharacter({ id: docSnap.id, ...docSnap.data() });
        } else {
          router.push('/');
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `characters/${id}`);
      } finally {
        setLoading(false);
      }
    };
    fetchChar();
  }, [id, router]);

  const handleUpdate = (updates: any) => {
    let newChar = { ...character, ...updates };
    
    // If stats are updated directly in UI, they are base stats
    if (updates.stats && !updates.isRecalculation) {
       newChar.baseStats = { ...updates.stats };
    }

    // Trigger recalculation if inventory or baseStats changed
    if (updates.inventory || updates.baseStats || updates.stats) {
       newChar = calculateDerivedStats(newChar);
    }
    
    setCharacter(newChar);
  };

  const calculateDerivedStats = (char: any) => {
    if (!char) return char;
    
    // 1. Ensure baseStats exists
    const baseStats = char.baseStats || { ...char.stats };
    
    // 2. Start recalc
    const newStats = { ...baseStats };
    const bonuses = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
    const overrides = { str: -1, dex: -1, con: -1, int: -1, wis: -1, cha: -1 };
    
    // 3. Scan inventory for active items
    const activeItems = (char.inventory || []).filter((item: any) => 
      item.isEquipped && (!item.requiresAttunement || item.isAttuned)
    );

    activeItems.forEach((item: any) => {
      if (item.attributeBonuses) {
        Object.entries(item.attributeBonuses).forEach(([stat, val]) => {
          const s = stat.toLowerCase() as keyof typeof bonuses;
          if (s in bonuses) bonuses[s] += (val as number);
        });
      }
      if (item.attributeOverrides) {
        Object.entries(item.attributeOverrides).forEach(([stat, val]) => {
          const s = stat.toLowerCase() as keyof typeof overrides;
          if (s in overrides) overrides[s] = Math.max(overrides[s], (val as number));
        });
      }
    });

    // Appy bonuses/overrides
    Object.keys(newStats).forEach(stat => {
      const s = stat as keyof typeof newStats;
      newStats[s] = baseStats[s] + bonuses[s];
      if (overrides[s] !== -1) {
        newStats[s] = Math.max(newStats[s], overrides[s]);
      }
    });

    // 4. Sync Spells from items
    const characterSpells = char.spells || [];
    // Keep internal spells (not from items)
    const baseSpells = characterSpells.filter((s: any) => !s.isFromItem);
    const itemSpells: any[] = [];
    
    activeItems.forEach((item: any) => {
      if (item.attachedSpells && item.attachedSpells.length > 0) {
        item.attachedSpells.forEach((spellName: string) => {
          // Basic spell placeholder
          if (!baseSpells.find((bs: any) => bs.name.toLowerCase() === spellName.toLowerCase())) {
            itemSpells.push({
              name: spellName,
              level: 0,
              school: 'Item',
              isFromItem: true,
              itemName: item.name,
              prepared: true,
              entries: [`This spell is granted by the attuned item: ${item.name}`]
            });
          }
        });
      }
    });

    // 5. Spellcasting Stats
    const charClass = char.class || 'Wizard';
    const spellAbility = SPELLCASTING_ABILITIES[charClass] || 'int';
    const currentLevel = char.level || 1;
    const pb = getProficiencyBonus(currentLevel);
    const spellAbilityMod = getModifier(newStats[spellAbility]);
    
    const spellSaveDC = 8 + pb + spellAbilityMod;
    const spellAttackMod = pb + spellAbilityMod;
    
    // 6. Spell Slots
    const casterType = getCasterType(charClass);
    const maxSlots = getSpellSlots(currentLevel, casterType);

    return {
      ...char,
      baseStats,
      stats: newStats,
      spells: [...baseSpells, ...itemSpells],
      spellSaveDC,
      spellAttackMod,
      proficiencyBonus: pb,
      maxSpellSlots: maxSlots,
      isRecalculation: true
    };
  };

  const handleLevelUp = () => {
    const nextLevel = (character.level || 1) + 1;
    const hitDieSize = character.hitDice?.type === 'd12' ? 12 : character.hitDice?.type === 'd10' ? 10 : character.hitDice?.type === 'd6' ? 6 : 8;
    const conMod = getModifier(character.stats.con);
    const hpGain = Math.max(1, Math.floor(hitDieSize / 2) + 1 + conMod);
    
    handleUpdate({
      level: nextLevel,
      hp: {
        ...character.hp,
        max: (character.hp.max || 10) + hpGain,
        current: (character.hp.current || 10) + hpGain
      },
      hitDice: {
        ...character.hitDice,
        max: (character.hitDice.max || 1) + 1,
        current: (character.hitDice.current || 1) + 1
      }
    });
  };

  const handleIdentifyFeatures = async () => {
    setAiLoading(true);
    try {
      const result = await generateClassFeatures(character.class, character.subclass, character.level, character.campaignTheme);
      if (result && result.features) {
        // Merge features, avoiding duplicates by name
        const existingClassFeatures = character.classFeatures || [];
        const newFeatures = [...existingClassFeatures];
        
        result.features.forEach((feature: any) => {
          if (!newFeatures.find((f: any) => f.name.toLowerCase() === feature.name.toLowerCase())) {
            newFeatures.push(feature);
          }
        });
        
        handleUpdate({ classFeatures: newFeatures });
      }
    } catch (err) {
      console.error("AI Feature Identification Error:", err);
    }
    setAiLoading(false);
  };

  const saveToFirebase = async () => {
    if (!id || !character) return;
    setSaving(true);
    try {
      const docRef = doc(db, 'characters', id as string);
      await updateDoc(docRef, {
        ...character,
        updatedAt: serverTimestamp(),
      });
      // Minimal success feedback
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `characters/${id}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteCharacter = async () => {
    if (!window.confirm('Are you sure you want to delete this legend? This action cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'characters', id as string));
      router.push('/');
    } catch (error) {
       handleFirestoreError(error, OperationType.DELETE, `characters/${id}`);
    }
  };

  const handleGenerateBackstory = async () => {
    setAiLoading(true);
    try {
      const bio = await generateBackstory(character.name, character.class, character.race, character.background || 'Commoner', character.campaignTheme);
      handleUpdate({ backstory: bio });
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(false);
    }
  };

  const confirmGeneratePortrait = async () => {
    setAiLoading(true);
    setPortraitModalOpen(false);
    try {
      const url = await generatePortrait(`${physicalDesc ? physicalDesc + ', ' : ''}A ${portraitStyle} style portrait of a ${character.race} ${character.class} named ${character.name}, holding ${character.inventory?.[0]?.name || 'a legendary item'}`, character.campaignTheme || portraitStyle);
      if (url) {
        handleUpdate({ imageUrl: url, physicalDescription: physicalDesc, portraitStyle: portraitStyle });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAiLoading(true);
    setPortraitModalOpen(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Compress to JPEG with 0.8 quality to keep it well under 1MB
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          handleUpdate({ imageUrl: dataUrl, physicalDescription: physicalDesc, portraitStyle: portraitStyle });
        }
        setAiLoading(false);
      };
      img.onerror = () => {
        console.error("Error loading image for compression");
        setAiLoading(false);
      }
    };
    reader.onerror = () => {
        console.error("Error reading file");
        setAiLoading(false);
    }
    reader.readAsDataURL(file);
  };

  const searchLibrary = async () => {
    setSearching(true);
    try {
      if (activeTab === 'spells') {
        const spells = await fetchSpells();
        const filtered = spells.filter(s => {
            const matchesQuery = s.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesLevel = spellFilterLevel === 'all' || s.level.toString() === spellFilterLevel;
            
            // Check classes if it exists in the raw json format (s.classes?.fromClassList)
            let matchesClass = true;
            if (spellFilterClass !== 'all') {
               const classList = (s as any).classes?.fromClassList || [];
               matchesClass = classList.some((c: any) => c.name.toLowerCase() === spellFilterClass.toLowerCase());
            }

            return matchesQuery && matchesLevel && matchesClass;
        });
        // Sort spells: Cantrips (0) first, then by ascending level. Within level, sort alphabetically.
        filtered.sort((a, b) => {
            if (a.level !== b.level) return a.level - b.level;
            return a.name.localeCompare(b.name);
        });
        setLibraryData(prev => ({ ...prev, spells: filtered }));
      } else if (activeTab === 'inventory') {
        const items = await fetchItems();
        const filtered = items.filter(i => {
             const matchesQuery = i.name.toLowerCase().includes(searchQuery.toLowerCase());
             const matchesType = itemTypeFilter === 'all' || (i.type && i.type.toLowerCase().includes(itemTypeFilter.toLowerCase())) || (!i.type && itemTypeFilter === 'unknown');
             const matchesRarity = itemRarityFilter === 'all' || (i.rarity && i.rarity.toLowerCase() === itemRarityFilter.toLowerCase()) || (!i.rarity && itemRarityFilter === 'unknown');
             return matchesQuery && matchesType && matchesRarity;
        });
        
        // Sort alphabetically
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        
        setLibraryData(prev => ({ ...prev, items: filtered }));
      } else if (activeTab === 'feats') {
        const feats = await fetchFeats();
        const filtered = feats.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
        setLibraryData(prev => ({ ...prev, feats: filtered }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  if (loading || !character) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--deep-slate)]">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 4, ease: "linear" }} className="text-[var(--gold-accent)]">
           <Scroll size={48} />
        </motion.div>
        <p className="ml-4 font-serif italic text-lg text-[var(--gold-accent)] animate-pulse">Unrolling the Archive...</p>
      </div>
    );
  }

  const hpPercent = (character.hp.current / character.hp.max) * 100;

  return (
    <div className="min-h-screen bg-[var(--deep-slate)] pb-24 text-[var(--parchment)]">
      {/* Top Banner */}
      <header className="sticky top-0 z-40 bg-[var(--deep-slate)] border-b border-[var(--gold-accent)] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <button onClick={() => router.push('/')} className="p-2 hover:bg-white/10 rounded-full transition-colors border border-[var(--gold-accent)]/20 text-[var(--gold-accent)]">
               <ArrowLeft size={20} />
             </button>
             <h1 className="font-serif italic font-bold text-2xl truncate max-w-[200px] sm:max-w-md text-[var(--gold-accent)]">
               {character.name}
             </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={deleteCharacter}
              className="p-2 text-[var(--blood-red)] hover:bg-[var(--blood-red)]/10 rounded-full transition-colors"
              title="Vanish from History"
            >
              <Trash2 size={20} />
            </button>
            <button
              onClick={saveToFirebase}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-[var(--gold-accent)] text-[var(--deep-slate)] rounded-full font-serif italic text-sm hover:shadow-[0_0_20px_rgba(197,160,89,0.3)] transition-all disabled:opacity-50 font-bold"
            >
              {saving ? <div className="w-4 h-4 border-2 border-[var(--deep-slate)] border-t-transparent animate-spin rounded-full" /> : <Save size={18} />}
              Ethch Script
            </button>
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 flex gap-6 overflow-x-auto scrollbar-hide">
           {[
             { id: 'main', label: 'Attributes', icon: Zap },
             { id: 'combat', label: 'Combat', icon: Sword },
             { id: 'spells', label: 'Spellbook', icon: Wand2 },
             { id: 'inventory', label: 'Inventory', icon: Backpack },
             { id: 'feats', label: 'Feats', icon: CheckCircle2 },
             { id: 'backstory', label: 'Chronicle', icon: Scroll },
             { id: 'notes', label: 'Journal', icon: Scroll },
             { id: 'settings', label: 'Settings', icon: Settings }
           ].map(tab => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id as any)}
               className={`flex items-center gap-2 py-3 border-b-2 font-bold uppercase text-[10px] tracking-widest transition-all whitespace-nowrap ${
                 activeTab === tab.id ? 'border-[var(--gold-accent)] text-[var(--gold-accent)]' : 'border-transparent text-gray-500 hover:text-white'
               }`}
             >
               <tab.icon size={14} />
               {tab.label}
             </button>
           ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar / Top Info */}
        <aside className="lg:col-span-4 space-y-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="eldritch-panel relative overflow-hidden group">
            <div className="relative group cursor-pointer" onClick={() => {
              setPhysicalDesc(character.physicalDescription || '');
              setPortraitStyle(character.portraitStyle || 'Fantasy Realism');
              setPortraitModalOpen(true);
            }}>
              <div className="aspect-square rounded border border-[var(--gold-accent)]/30 bg-black overflow-hidden relative shadow-inner">
                {character.imageUrl ? (
                  <Image 
                    src={character.imageUrl} 
                    alt={character.name} 
                    fill 
                    className="object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center opacity-40">
                    <ImageIcon size={48} className="text-[var(--gold-accent)]" />
                    <span className="text-[10px] uppercase font-bold mt-2 tracking-widest">Invoke Vision</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 uppercase text-white font-bold text-[10px] tracking-widest pointer-events-none">
                  <Sparkles size={16} className="mr-2" /> Redraw Portrait
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-4">
               <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 text-[var(--gold-accent)]">Nom de Guerre</label>
                  <input
                    type="text"
                    value={character.name}
                    onChange={(e) => handleUpdate({ name: e.target.value })}
                    className="w-full bg-transparent border-b border-[var(--gold-accent)]/20 py-1 font-serif text-2xl outline-none focus:border-[var(--gold-accent)] text-[var(--gold-accent)]"
                  />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-40">Order (Class)</label>
                    <input
                      type="text"
                      value={character.class}
                      onChange={(e) => handleUpdate({ class: e.target.value })}
                      className="w-full bg-transparent border-b border-white/5 py-1 font-serif italic outline-none focus:border-[var(--gold-accent)] text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-40">Legend (Subclass)</label>
                    <input
                      type="text"
                      placeholder="Identify path..."
                      value={character.subclass || ''}
                      onChange={(e) => handleUpdate({ subclass: e.target.value })}
                      className="w-full bg-transparent border-b border-white/5 py-1 font-serif italic outline-none focus:border-[var(--gold-accent)] text-sm"
                    />
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 italic">Heritage</label>
                    <input
                      type="text"
                      value={character.race}
                      onChange={(e) => handleUpdate({ race: e.target.value })}
                      className="w-full bg-transparent border-b border-white/5 py-1 font-serif italic outline-none focus:border-[var(--gold-accent)] text-sm"
                    />
                  </div>
                  <div className="flex flex-col">
                     <label className="text-[10px] uppercase tracking-widest font-bold opacity-40">Rank (Level)</label>
                     <div className="flex items-center gap-2">
                        <span className="font-serif text-xl border-b border-white/10 px-2 italic text-[var(--gold-accent)]">{character.level || 1}</span>
                        <button 
                          onClick={handleLevelUp}
                          className="flex items-center gap-1 px-2 py-0.5 bg-green-900/20 border border-green-500/30 text-green-200 rounded text-[8px] font-bold uppercase tracking-widest hover:bg-green-900/40 transition-all"
                        >
                          <Plus size={10} /> Level Up
                        </button>
                     </div>
                  </div>
               </div>
               <div>
                  <label className="text-[10px] uppercase tracking-widest font-bold opacity-40 flex justify-between">
                     Party Ledger ID
                     <span className="text-white/30 text-[8px] tracking-normal normal-case">Match this string globally to link your rolls</span>
                  </label>
                  <input
                    type="text"
                    value={character.campaignId || ''}
                    onChange={(e) => handleUpdate({ campaignId: e.target.value })}
                    placeholder="Enter unique Campaign ID (e.g. 'curse-of-strahd')"
                    className="w-full bg-transparent border-b border-white/5 py-1 font-mono text-xs outline-none focus:border-[var(--gold-accent)] text-white/50"
                  />
               </div>
            </div>
          </motion.div>

          {/* Core Stats / HP / AC */}
          <div className="grid grid-cols-2 gap-4">
             <div className="vital-box-immersive flex flex-col items-center">
                <div className="flex items-center gap-2 mb-2">
                   <Shield size={16} className="text-[var(--magic-blue)]" />
                   <span className="text-[10px] uppercase font-bold opacity-40">Defense</span>
                </div>
                <input
                  type="number"
                  value={character.ac}
                  onChange={(e) => handleUpdate({ ac: Number(e.target.value) })}
                  className="bg-transparent text-3xl font-serif text-center w-full outline-none text-[var(--gold-accent)]"
                />
             </div>
             <div className="vital-box-immersive flex flex-col items-center">
                <div className="flex items-center gap-2 mb-2">
                   <FastForward size={16} className="text-[var(--gold-accent)]" />
                   <span className="text-[10px] uppercase font-bold opacity-40">Walk</span>
                </div>
                <input
                  type="number"
                  placeholder="30"
                  defaultValue={30}
                  className="bg-transparent text-3xl font-serif text-center w-full outline-none text-[var(--gold-accent)]"
                />
             </div>
          </div>

          <div className="eldritch-panel border-white/5 bg-black/20">
             <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                   <Heart size={16} className="text-[var(--blood-red)]" />
                   <span className="text-[10px] uppercase font-bold text-white/50 tracking-widest leading-none">Vitals</span>
                </div>
                <div className="flex bg-black/40 border border-white/5 rounded px-2 py-1 gap-2 items-center text-xs font-mono">
                   <input
                    type="number"
                    value={character.hp?.current ?? 10}
                    onChange={(e) => handleUpdate({ hp: { ...(character.hp || {max:10, temp:0}), current: Number(e.target.value) } })}
                    className="w-8 text-center bg-transparent text-[var(--gold-accent)] outline-none"
                    title="Current HP"
                   />
                   <span className="opacity-40 select-none">/</span>
                   <input
                    type="number"
                    value={character.hp?.max ?? 10}
                    onChange={(e) => handleUpdate({ hp: { ...(character.hp || {current:10, temp:0}), max: Number(e.target.value) } })}
                    className="w-8 text-center bg-transparent text-white/70 outline-none"
                    title="Max HP"
                   />
                </div>
             </div>
             <div className="h-2 bg-black/50 rounded-full overflow-hidden border border-white/5 mb-3">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${hpPercent}%` }}
                  className={`h-full transition-all duration-1000 ${hpPercent < 25 ? 'bg-[var(--blood-red)] shadow-[0_0_10px_rgba(139,0,0,0.5)]' : hpPercent < 50 ? 'bg-orange-600' : 'bg-green-700'}`}
                />
             </div>

             <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-3">
                 <div className="flex flex-col items-center p-2 rounded bg-white/5 border border-white/5">
                     <span className="text-[8px] uppercase tracking-widest text-[#a8a29e] mb-1">Temp HP</span>
                     <input
                         type="number"
                         value={character.hp?.temp ?? 0}
                         onChange={(e) => handleUpdate({ hp: { ...character.hp, temp: Number(e.target.value) } })}
                         className="w-full text-center bg-transparent text-lg font-bold font-serif text-[var(--magic-blue)] outline-none"
                     />
                 </div>
                 <div className="flex flex-col items-center p-2 rounded bg-white/5 border border-white/5">
                     <span className="text-[8px] uppercase tracking-widest text-[#a8a29e] mb-1">Hit Dice</span>
                     <div className="flex items-center">
                        <input
                            type="number"
                            value={character.hitDice?.current ?? 1}
                            onChange={(e) => handleUpdate({ hitDice: { ...(character.hitDice || {max:1, type:'d8'}), current: Number(e.target.value) } })}
                            className="w-6 text-right bg-transparent font-bold font-mono text-[var(--gold-accent)] outline-none"
                        />
                        <span className="text-white/40 text-xs mx-1">/</span>
                        <input
                            type="number"
                            value={character.hitDice?.max ?? 1}
                            onChange={(e) => handleUpdate({ hitDice: { ...(character.hitDice || {type:'d8', current:1}), max: Number(e.target.value) } })}
                            className="w-6 text-left bg-transparent text-xs text-white/70 outline-none"
                        />
                     </div>
                 </div>
             </div>

             {(character.hp?.current <= 0) && (
               <div className="mt-3 p-3 bg-red-900/20 border border-[var(--blood-red)]/50 rounded-lg flex flex-col items-center">
                 <div className="flex items-center gap-2 mb-2 text-[var(--blood-red)]">
                    <Skull size={14} />
                    <span className="text-[10px] uppercase font-bold tracking-widest">Death Saves</span>
                 </div>
                 <div className="flex gap-4 w-full justify-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[8px] uppercase text-white/50 tracking-widest">Success</span>
                      <div className="flex gap-1">
                        {[1,2,3].map(i => (
                          <button key={`s-${i}`} onClick={() => {
                             const current = character.deathSaves?.successes || 0;
                             handleUpdate({ deathSaves: { ...character.deathSaves, successes: current === i ? i - 1 : i }});
                          }} className={`w-4 h-4 rounded-full border border-white/20 flex items-center justify-center transition-all ${character.deathSaves?.successes >= i ? 'bg-white shadow-[0_0_8px_white]' : 'bg-black/50 hover:bg-white/20'}`} />
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[8px] uppercase text-white/50 tracking-widest">Fail</span>
                      <div className="flex gap-1">
                        {[1,2,3].map(i => (
                          <button key={`f-${i}`} onClick={() => {
                             const current = character.deathSaves?.failures || 0;
                             handleUpdate({ deathSaves: { ...character.deathSaves, failures: current === i ? i - 1 : i }});
                          }} className={`w-4 h-4 rounded-full border border-[var(--blood-red)]/50 flex items-center justify-center transition-all ${character.deathSaves?.failures >= i ? 'bg-[var(--blood-red)] shadow-[0_0_8px_var(--blood-red)]' : 'bg-black/50 hover:bg-[var(--blood-red)]/30'}`} />
                        ))}
                      </div>
                    </div>
                 </div>
               </div>
             )}

             {/* Status Effects */}
             <div className="mt-4 pt-3 border-t border-white/5">
                 <div className="flex items-center gap-2 mb-2 text-[var(--magic-blue)]">
                    <Sparkles size={14} />
                    <span className="text-[10px] uppercase font-bold tracking-widest">Status Effects</span>
                 </div>
                 <div className="flex flex-wrap gap-1.5">
                    {[ 'Blinded', 'Charmed', 'Deafened', 'Frightened', 'Grappled', 'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious', 'Exhausted' ].map(condition => {
                       const isActive = character.statusEffects?.includes(condition);
                       return (
                         <button
                           key={condition}
                           onClick={() => {
                             const current = character.statusEffects || [];
                             const updated = isActive ? current.filter((c: string) => c !== condition) : [...current, condition];
                             handleUpdate({ statusEffects: updated });
                           }}
                           className={`px-2 py-1 text-[9px] uppercase font-bold tracking-widest rounded border transition-colors ${isActive ? 'bg-[var(--blood-red)]/20 border-[var(--blood-red)] text-white shadow-[0_0_8px_rgba(139,0,0,0.3)]' : 'bg-black/40 border-white/10 text-white/40 hover:border-white/30 hover:text-white/70'}`}
                         >
                           {condition}
                         </button>
                       );
                    })}
                 </div>
             </div>

             {/* Rest Buttons */}
             <div className="flex gap-2 mt-4 pt-3 border-t border-white/5">
                <button 
                  onClick={() => {
                    const confirm = window.confirm("Take a Short Rest? You can spend Hit Dice to recover HP.");
                    // In a full feature we'd pop a modal to roll hit dice. For now it's just a log entry.
                    if (confirm) rollDice(1, 20, 0, "Short Rest (Status)");
                  }}
                  className="flex-1 py-1.5 rounded bg-black/40 border border-white/10 text-[10px] uppercase tracking-widest font-bold text-white/70 hover:bg-white/10 transition-colors"
                >
                  Short Rest
                </button>
                <button 
                  onClick={() => {
                    if(window.confirm("Take a Long Rest? Fully restores HP, half Hit Dice, and spell slots.")) {
                      handleUpdate({ 
                        hp: { ...character.hp, current: character.hp.max, temp: 0 },
                        hitDice: { ...character.hitDice, current: Math.min(character.hitDice?.max || 1, (character.hitDice?.current || 0) + Math.max(1, Math.floor((character.hitDice?.max || 1)/2))) },
                        deathSaves: { successes: 0, failures: 0 }
                      });
                      rollDice(1, 20, 0, "Long Rest Completed");
                    }
                  }}
                  className="flex-1 py-1.5 rounded bg-[var(--gold-accent)]/10 border border-[var(--gold-accent)]/30 text-[10px] uppercase tracking-widest font-bold text-[var(--gold-accent)] hover:bg-[var(--gold-accent)] hover:text-black transition-colors"
                >
                  Long Rest
                </button>
             </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <section className="lg:col-span-8 flex flex-col gap-8">
          <AnimatePresence mode="wait">
            {activeTab === 'main' && (
              <motion.div
                key="main"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Abilities Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
                  {(Object.keys(ABILITIES) as Ability[]).map(ab => (
                    <div key={ab} className="stat-card-immersive group relative overflow-hidden">
                      <span className="text-[10px] uppercase font-bold opacity-40 mb-1 tracking-widest">{ABILITIES[ab]}</span>
                      <div className="text-3xl font-serif font-bold mb-1 text-white">
                        {formatModifier(getModifier(character.stats[ab]))}
                      </div>
                      <div className="flex items-center gap-1 border-t border-white/5 pt-1 w-full justify-center">
                        <input
                          type="number"
                          value={character.baseStats?.[ab] ?? character.stats[ab]}
                          onChange={(e) => handleUpdate({ stats: { ...(character.baseStats || character.stats), [ab]: Number(e.target.value) } })}
                          className="w-10 bg-transparent text-center font-mono font-bold outline-none opacity-40 focus:opacity-100"
                        />
                      </div>
                      <Dice5 size={12} className="absolute top-1 right-1 opacity-10 group-hover:opacity-100 transition-opacity cursor-pointer text-[var(--gold-accent)]" onClick={(e) => {
                         e.stopPropagation();
                         rollDice(1, 20, getModifier(character.stats[ab]), `Roll: ${ABILITIES[ab]}`);
                      }} />
                    </div>
                  ))}
                </div>

                {/* Skills List */}
                <div className="eldritch-panel">
                  <h3 className="font-serif italic text-xl mb-4 border-b border-white/5 pb-2 text-[var(--gold-accent)]">Manifested Skills</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                    {SKILLS.map(skill => {
                      const isProficient = character.proficiencies?.includes(skill.name);
                      const baseMod = getModifier(character.stats[skill.ability]);
                      const pb = 2; // Default starting PB
                      const mod = isProficient ? baseMod + pb : baseMod;

                      return (
                        <div key={skill.name} onClick={() => rollDice(1, 20, mod, `Skill Check: ${skill.name}`)} className="flex items-center justify-between group hover:bg-white/5 p-1 rounded transition-colors cursor-pointer border-b border-white/5">
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full border transition-colors ${isProficient ? 'bg-[var(--gold-accent)] border-[var(--gold-accent)]' : 'border-[var(--gold-accent)]/30 group-hover:bg-[var(--gold-accent)]/50'}`} />
                            <span className={`text-sm ${isProficient ? 'font-bold text-white' : 'font-medium opacity-80'}`}>{skill.name}</span>
                            <span className="text-[10px] uppercase font-bold opacity-30 tracking-tighter">({skill.ability})</span>
                          </div>
                          <span className={`font-mono font-bold text-sm px-2 rounded ${isProficient ? 'text-[var(--gold-accent)]' : 'text-white/50'}`}>{formatModifier(mod)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'combat' && (
              <motion.div
                key="combat"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                  <div className="eldritch-panel">
                     <h3 className="font-serif italic text-xl mb-4 border-b border-white/5 pb-2 text-[var(--gold-accent)]">Tactical Stance</h3>
                     <div className="space-y-4">
                        <div className="p-4 bg-[var(--blood-red)]/10 border border-[var(--blood-red)]/30 rounded-lg flex items-center justify-between">
                            <div>
                               <h4 className="font-serif font-bold text-lg text-[var(--blood-red)]">Initiative</h4>
                               <p className="text-xs text-[var(--blood-red)] opacity-70 italic tracking-wide">Flow of the fray.</p>
                            </div>
                            <div className="flex items-center gap-4">
                               <span className="text-3xl font-serif text-[var(--blood-red)]">{formatModifier(getModifier(character.stats.dex))}</span>
                               <button 
                                 onClick={() => rollDice(1, 20, getModifier(character.stats.dex), 'Initiative')}
                                 className="p-3 bg-[var(--blood-red)] text-white rounded-full hover:scale-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(139,0,0,0.3)]">
                                  <Dice5 size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-[var(--magic-blue)]/5 border border-[var(--magic-blue)]/20 rounded-lg">
                               <h4 className="font-serif font-bold text-xs text-[var(--magic-blue)] mb-2 uppercase tracking-widest">Passive Perception</h4>
                               <p className="text-3xl font-serif text-[var(--magic-blue)]">{10 + getModifier(character.stats.wis)}</p>
                            </div>
                            <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                               <h4 className="font-serif font-bold text-xs text-white mb-2 uppercase tracking-widest">Saving Throws</h4>
                               <div className="flex gap-2 flex-wrap">
                                  {(Object.keys(ABILITIES) as Ability[]).map(ab => (
                                    <span key={ab} className="px-2 py-1 bg-black/40 border border-white/10 rounded text-[10px] font-bold text-[var(--gold-accent)] cursor-pointer hover:bg-[var(--gold-accent)] hover:text-black transition-colors" onClick={() => rollDice(1, 20, getModifier(character.stats[ab]), `${ab.toUpperCase()} Save`)}>
                                      {ab.toUpperCase()} {formatModifier(getModifier(character.stats[ab]))}
                                    </span>
                                  ))}
                               </div>
                            </div>
                        </div>

                        {/* Weapons / Attacks pulled from inventory */}
                        <div className="mt-8 border-t border-[var(--gold-accent)]/20 pt-6">
                            <h4 className="font-serif font-bold text-lg text-[var(--gold-accent)] mb-4 flex items-center gap-2"><Target size={18} /> Available Strikes & Gear</h4>
                            
                            {(!character.inventory || character.inventory.filter((i:any) => i.weaponCategory || i.dmg1 || i.quickSlot).length === 0) ? (
                               <p className="text-sm italic opacity-40 font-serif">No weapons mapped in Vaulted Gear.</p>
                            ) : (
                               <div className="flex flex-col gap-3">
                                  {character.inventory.filter((i:any) => i.weaponCategory || i.dmg1 || i.quickSlot).map((w: any, idx: number) => {
                                      // If it's explicitly a weapon or has damage logic
                                      const isWeapon = w.weaponCategory || w.dmg1;
                                      
                                      if (isWeapon) {
                                        // Highly simplified stat calc for display purposes
                                        const isFinesse = w.property?.includes('F');
                                        const isRanged = w.weaponCategory?.includes('ranged');
                                        const statToUse = isRanged || (isFinesse && getModifier(character.stats.dex) > getModifier(character.stats.str)) ? 'dex' : 'str';
                                        const mod = getModifier(character.stats[statToUse as Ability]);
                                        
                                        // Extract dice logic (e.g. "1d8")
                                        const dmg1 = w.dmg1 || "1d4";
                                        let dCount = 1; let dType = 6;
                                        try { 
                                          const parts = dmg1.toLowerCase().split('d');
                                          if (parts.length === 2) {
                                            dCount = parseInt(parts[0]) || 1;
                                            dType = parseInt(parts[1]) || 6;
                                          }
                                        } catch(e) {}

                                        return (
                                          <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-[var(--blood-red)]/20 rounded bg-black/40 hover:bg-[var(--blood-red)]/5 transition-all outline-none">
                                             <div>
                                                <p className="font-bold text-white font-serif">{w.name}</p>
                                                <p className="text-[10px] uppercase text-[var(--blood-red)] font-bold tracking-widest">{w.weaponCategory || "Weapon"} • {statToUse.toUpperCase()}</p>
                                             </div>
                                             <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
                                                <button onClick={() => comboRoll([
                                                    { count: 1, type: 20, modifier: mod, reason: `Attack: ${w.name}` },
                                                    { count: dCount, type: dType as any, modifier: mod, reason: `Damage: ${w.name} (${w.dmg1})` }
                                                ], w.entries ? extractText(w.entries) : undefined, w.effectSummary)} className="px-3 py-1 bg-purple-900/40 hover:bg-purple-900/60 text-purple-200 rounded text-xs font-bold font-mono border border-purple-500/30 flex items-center gap-1 transition-colors shadow-[0_0_8px_rgba(147,51,234,0.3)]">
                                                   <Sword size={12} /> COMBINED
                                                </button>
                                                <button onClick={() => rollDice(1, 20, mod, `Attack: ${w.name}`, w.entries ? extractText(w.entries) : undefined, w.effectSummary)} className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-xs font-bold font-mono border border-white/10 flex items-center gap-1 transition-colors">
                                                   <Target size={12} /> ATK {formatModifier(mod)}
                                                </button>
                                                <button onClick={() => rollDice(dCount, dType as any, mod, `Damage: ${w.name}`, w.entries ? extractText(w.entries) : undefined, w.effectSummary)} className="px-3 py-1 bg-[var(--blood-red)]/20 hover:bg-[var(--blood-red)]/40 text-[var(--blood-red)] rounded text-xs font-bold font-mono border border-[var(--blood-red)]/30 flex items-center gap-1 transition-colors">
                                                   <Skull size={12} /> DMG {w.dmg1} {formatModifier(mod)}
                                                </button>
                                             </div>
                                          </div>
                                        );
                                      } else {
                                        // A non-weapon quickslotted item
                                        return (
                                          <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border border-[var(--gold-accent)]/20 rounded bg-black/40 hover:bg-[var(--gold-accent)]/5 transition-all outline-none">
                                             <div className="flex-1">
                                                <p className="font-bold text-white font-serif">{w.name}</p>
                                                <p className="text-[10px] uppercase text-[var(--gold-accent)] font-bold tracking-widest">{w.type || "Object"} • Qty: {w.quantity || 1}</p>
                                             </div>
                                             <div className="flex items-center gap-2 mt-2 sm:mt-0">
                                                <button 
                                                   disabled={aiLoading}
                                                   onClick={async () => {
                                                     setAiLoading(true);
                                                     try {
                                                       const desc = extractText(w.entries);
                                                       const stats = await analyzeAction(w.name, desc, character.campaignTheme);
                                                       if (stats) {
                                                           console.log("Analyzing...");
                                                          const newInv = [...character.inventory];
                                                          const originalIndex = character.inventory.findIndex((i:any) => i.name === w.name);
                                                          if (originalIndex > -1) {
                                                             newInv[originalIndex] = { 
                                                               ...newInv[originalIndex], 
                                                               dmg1: stats.dice,
                                                               damageType: stats.damageType,
                                                               range: stats.range,
                                                               effectSummary: stats.effectSummary,
                                                               requiresAttunement: stats.requiresAttunement,
                                                               attributeBonuses: stats.attributeBonuses,
                                                               attributeOverrides: stats.attributeOverrides,
                                                               attachedSpells: stats.attachedSpells
                                                             };
                                                             handleUpdate({ inventory: newInv });
                                                          }
                                                       }
                                                     } catch (err) {
                                                       console.error("AI Action Analysis Error:", err);
                                                     }
                                                     setAiLoading(false);
                                                   }}
                                                   className="px-3 py-1 bg-blue-900/40 hover:bg-blue-900/60 text-blue-200 rounded text-xs font-bold font-mono border border-blue-500/30 flex items-center gap-1 transition-all"
                                                >
                                                   <Sparkles size={12} /> {aiLoading ? 'Seeking...' : 'AI ANALYZE'}
                                                </button>
                                                <button onClick={() => rollDice(1, 20, 0, `Used: ${w.name}`, w.entries ? extractText(w.entries) : undefined)} className="px-3 py-1 bg-[var(--gold-accent)]/10 hover:bg-[var(--gold-accent)]/20 text-[var(--gold-accent)] rounded text-xs font-bold font-mono border border-[var(--gold-accent)]/20 flex items-center gap-1 transition-colors">
                                                   <Wand2 size={12} /> USE D20
                                                </button>
                                             </div>
                                          </div>
                                        );
                                      }
                                  })}
                               </div>
                            )}
                        </div>
                     </div>
                  </div>
              </motion.div>
            )}

            {activeTab === 'spells' && (
              <motion.div
                key="spells"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Spellcasting Power */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="vital-box-immersive flex flex-col items-center">
                    <span className="text-[8px] uppercase font-bold opacity-40 mb-1 tracking-widest text-[#a8a29e]">Spell Save DC</span>
                    <span className="text-3xl font-serif text-[var(--gold-accent)] drop-shadow-[0_0_8px_rgba(255,200,0,0.2)]">{character.spellSaveDC || 8}</span>
                  </div>
                  <div className="vital-box-immersive flex flex-col items-center">
                    <span className="text-[8px] uppercase font-bold opacity-40 mb-1 tracking-widest text-[#a8a29e]">Spell Attack Mod</span>
                    <span className="text-3xl font-serif text-[var(--gold-accent)] drop-shadow-[0_0_8px_rgba(255,200,0,0.2)]">{formatModifier(character.spellAttackMod || 0)}</span>
                  </div>
                  <div className="vital-box-immersive flex flex-col items-center">
                    <span className="text-[8px] uppercase font-bold opacity-40 mb-1 tracking-widest text-[#a8a29e]">Proficiency</span>
                    <span className="text-3xl font-serif text-[var(--gold-accent)] drop-shadow-[0_0_8px_rgba(255,200,0,0.2)]">+{character.proficiencyBonus || 2}</span>
                  </div>
                  <div className="vital-box-immersive flex flex-col items-center">
                    <span className="text-[8px] uppercase font-bold opacity-40 mb-1 tracking-widest text-[#a8a29e]">Spell Ability</span>
                    <span className="text-lg font-serif italic text-[var(--gold-accent)] uppercase mt-1">
                       {ABILITIES[SPELLCASTING_ABILITIES[character.class] || 'int'] || 'Intelligence'}
                    </span>
                  </div>
                </div>

                {/* Spell Slots Tracker */}
                <div className="eldritch-panel border-white/5 bg-black/20">
                   <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 border-b border-white/5 pb-2">
                       <h3 className="font-serif italic text-[var(--gold-accent)] text-lg flex items-center gap-2">
                           <Wand2 size={16} /> Arcane Resonance
                       </h3>
                       <p className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Ritual Matrices (Slots)</p>
                   </div>
                   <div className="flex flex-wrap gap-4">
                     {[1,2,3,4,5,6,7,8,9].map(level => {
                        const calculatedMax = character.maxSpellSlots?.[level] || 0;
                        const slotData = character.spellSlots?.[level.toString()] || { max: calculatedMax, current: calculatedMax };
                        
                        if (calculatedMax === 0 && slotData.max === 0) return null;

                        return (
                             <div key={level} className="flex flex-col gap-1 p-2 bg-white/5 border border-white/10 rounded items-center shrink-0 w-[4.5rem] relative overflow-hidden group">
                                 <div className="absolute inset-0 bg-blue-900/5 group-hover:bg-blue-900/10 transition-colors" />
                                 <span className="text-[8px] uppercase font-bold text-[var(--gold-accent)]/70 relative z-10">Lvl {level}</span>
                                 <div className="flex gap-1 items-center relative z-10">
                                    <input
                                      type="number"
                                      value={slotData.current}
                                      onChange={(e) => {
                                         const val = Number(e.target.value);
                                         handleUpdate({ 
                                            spellSlots: { ...character.spellSlots, [level]: { ...slotData, current: val } } 
                                         });
                                      }}
                                      className="w-5 text-right bg-transparent outline-none font-mono text-sm text-[var(--magic-blue)] font-bold"
                                    />
                                    <span className="text-white/30 text-xs">/</span>
                                    <input
                                      type="number"
                                      value={slotData.max}
                                      onChange={(e) => {
                                         const val = Number(e.target.value);
                                         handleUpdate({ 
                                            spellSlots: { ...character.spellSlots, [level]: { ...slotData, max: val } } 
                                         });
                                      }}
                                      className="w-5 text-left bg-transparent outline-none font-mono text-xs text-white/50"
                                    />
                                 </div>
                                 <button 
                                   onClick={() => {
                                      const next = Math.max(0, slotData.current - 1);
                                      handleUpdate({ 
                                        spellSlots: { ...character.spellSlots, [level]: { ...slotData, current: next } } 
                                      });
                                   }}
                                   className="mt-1 w-full flex justify-center py-0.5 hover:bg-white/5 rounded text-white/40 hover:text-[var(--magic-blue)] transition-colors relative z-10"
                                 >
                                    <Zap size={10} />
                                 </button>
                             </div>
                        );
                     })}
                   </div>
                   <button 
                      onClick={() => {
                        const newSlots = { ...(character.spellSlots || {}) };
                        [1,2,3,4,5,6,7,8,9].forEach(lvl => {
                           const max = character.maxSpellSlots?.[lvl] || (newSlots[lvl]?.max || 0);
                           newSlots[lvl] = { ...newSlots[lvl], max, current: max };
                        });
                        handleUpdate({ spellSlots: newSlots });
                      }}
                      className="mt-4 text-[8px] uppercase font-bold tracking-widest text-[var(--gold-accent)]/50 hover:text-[var(--gold-accent)] transition-colors"
                   >
                     Long Rest Reprieve (Reset Slots)
                   </button>
                </div>

                {/* Library Search */}
                <div className="eldritch-panel mb-8 border border-[var(--gold-accent)]/40 bg-black/40">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-2 bg-[var(--gold-accent)] text-[var(--deep-slate)] rounded-lg">
                       <Search size={20} />
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-lg text-[var(--gold-accent)]">Grimoire Archive</h3>
                      <p className="text-xs opacity-60">Synchronize forbidden spells from the 5e library.</p>
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Trace sigil name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1 bg-black/40 border border-white/10 rounded-full px-4 py-2 text-sm italic focus:border-[var(--gold-accent)]/50 outline-none text-[var(--gold-accent)]"
                    />
                    <select
                      value={spellFilterLevel}
                      onChange={(e) => setSpellFilterLevel(e.target.value)}
                      className="bg-black/40 border border-white/10 rounded-full px-4 py-2 text-sm italic outline-none text-[var(--parchment)]"
                    >
                      <option value="all">All Levels</option>
                      <option value="0">Cantrip</option>
                      {[1,2,3,4,5,6,7,8,9].map(lvl => (
                        <option key={lvl} value={lvl.toString()}>Level {lvl}</option>
                      ))}
                    </select>
                    <select
                      value={spellFilterClass}
                      onChange={(e) => setSpellFilterClass(e.target.value)}
                      className="bg-black/40 border border-white/10 rounded-full px-4 py-2 text-sm italic outline-none text-[var(--parchment)]"
                    >
                      <option value="all">All Classes</option>
                      {['Artificer', 'Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger', 'Sorcerer', 'Warlock', 'Wizard'].map(cls => (
                        <option key={cls} value={cls}>{cls}</option>
                      ))}
                    </select>
                    <button 
                      onClick={searchLibrary}
                      className="px-6 py-2 bg-[var(--gold-accent)] text-[var(--deep-slate)] rounded-full font-serif italic text-sm hover:shadow-[0_0_15px_rgba(197,160,89,0.3)] transition-all font-bold whitespace-nowrap"
                    >
                      {searching ? 'Tracing...' : 'Unseal'}
                    </button>
                  </div>

                  {libraryData.spells.length > 0 && (
                    <div className="mt-4 grid grid-cols-1 max-h-[400px] overflow-y-auto gap-2 pr-2 custom-scrollbar">
                       {libraryData.spells.map((spell, i) => {
                         const isExpanded = expandedArchiveSpells.has(i);
                         return (
                         <div key={i} className="flex flex-col bg-white/5 rounded border border-white/5 group hover:border-[var(--gold-accent)]/50 transition-colors overflow-hidden">
                            <div className="flex items-center justify-between p-3 cursor-pointer" onClick={() => {
                                const newSet = new Set(expandedArchiveSpells);
                                if (isExpanded) newSet.delete(i);
                                else newSet.add(i);
                                setExpandedArchiveSpells(newSet);
                            }}>
                                <div className="flex items-center gap-3">
                                   {isExpanded ? <ChevronDown size={16} className="text-[var(--gold-accent)]" /> : <ChevronRight size={16} className="text-white/40" />}
                                   <div>
                                      <p className="font-serif font-bold text-sm text-[var(--parchment)]">{spell.name}</p>
                                      <p className="text-[10px] text-white/40 uppercase tracking-widest">Level {spell.level} • {spell.school}</p>
                                   </div>
                                </div>
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newSpells = [...(character.spells || []), spell];
                                    handleUpdate({ spells: newSpells });
                                    setLibraryData(prev => ({ ...prev, spells: [] }));
                                    setSearchQuery('');
                                    setExpandedArchiveSpells(new Set());
                                  }}
                                  className="p-2 text-[var(--gold-accent)] opacity-30 hover:opacity-100 hover:scale-110 transition-all focus:outline-none"
                                >
                                  <Plus size={20} />
                                </button>
                            </div>
                            <AnimatePresence>
                                {isExpanded && (
                                   <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-4 pb-4 pt-1">
                                      <div className="bg-black/40 p-3 rounded text-xs border border-white/5 text-[var(--parchment)]/80 italic leading-relaxed">
                                          {spell.entries ? extractText(spell.entries) : "No incantation records found."}
                                      </div>
                                   </motion.div>
                                )}
                            </AnimatePresence>
                         </div>
                       )})}
                    </div>
                  )}
                </div>

                {/* Character Spells */}
                <div className="eldritch-panel">
                  <h3 className="font-serif italic text-xl mb-6 border-b border-white/5 pb-2 text-[var(--gold-accent)]">Personal Grimoire</h3>
                  <div className="space-y-4">
                    {(!character.spells || character.spells.length === 0) ? (
                      <p className="text-center py-12 text-sm text-gray-500 italic font-serif">No inscriptions found. Consult the archive above.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {character.spells.map((spell: any, i: number) => {
                          const isPrepared = spell.prepared ?? true;
                          const isExpanded = expandedPersonalSpells.has(i);
                          return (
                          <motion.div 
                             initial={{ opacity: 0, scale: 0.95 }}
                             animate={{ opacity: 1, scale: 1 }}
                             key={i} 
                             className={`p-4 border bg-black/20 rounded-lg group relative transition-all ${isPrepared ? 'border-[var(--gold-accent)]/40 shadow-[0_0_15px_rgba(197,160,89,0.1)]' : 'border-white/5 opacity-60 grayscale-[0.3]'} cursor-pointer`}
                             onClick={() => {
                                const newSet = new Set(expandedPersonalSpells);
                                if (isExpanded) newSet.delete(i);
                                else newSet.add(i);
                                setExpandedPersonalSpells(newSet);
                             }}
                          >
                             <div className={`absolute left-0 top-0 bottom-0 w-1 ${isPrepared ? 'bg-[var(--gold-accent)]' : 'bg-white/10'}`} />
                             <div className="flex justify-between items-start">
                               <div>
                                 <h4 className="font-serif font-bold text-lg text-[var(--gold-accent)] flex items-center gap-2">
                                   {isExpanded ? <ChevronDown size={18} className="text-[var(--gold-accent)]" /> : <ChevronRight size={18} className="text-white/40" />}
                                   {spell.name}
                                   <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const newSpells = [...character.spells];
                                        newSpells[i] = { ...spell, prepared: !isPrepared };
                                        handleUpdate({ spells: newSpells });
                                      }}
                                      className={`text-[8px] px-2 py-0.5 rounded-full uppercase tracking-widest border ${isPrepared ? 'bg-[var(--gold-accent)]/20 border-[var(--gold-accent)] text-[var(--gold-accent)]' : 'border-white/20 text-white/50'}`}
                                   >
                                     {isPrepared ? 'Prepared' : 'Unprepared'}
                                   </button>
                                 </h4>
                                 <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-3 pl-7">Level {spell.level || 0} {spell.school}</p>
                               </div>
                               <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const newSpells = character.spells.filter((_: any, idx: number) => idx !== i);
                                    handleUpdate({ spells: newSpells });
                                  }}
                                  className="p-1 opacity-0 group-hover:opacity-100 text-[var(--blood-red)] hover:scale-110 transition-all font-bold focus:outline-none"
                               >
                                  <Trash2 size={16} />
                               </button>
                             </div>
                             
                             <AnimatePresence>
                                {isExpanded && (
                                   <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="pt-2">
                                      <div className="bg-black/40 p-3 mb-3 ml-7 rounded text-xs border border-white/5 text-[var(--parchment)]/80 italic leading-relaxed cursor-text" onClick={(e) => e.stopPropagation()}>
                                          {spell.entries ? extractText(spell.entries) : "No incantation records found."}
                                      </div>
                                   </motion.div>
                                )}
                             </AnimatePresence>

                             <div className="flex gap-2 mt-2 pl-7">
                               <button 
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   const spellMod = Math.max(getModifier(character.stats.int), getModifier(character.stats.wis), getModifier(character.stats.cha));
                                   
                                   if (spell.level > 0 && character?.spellSlots?.[spell.level]?.current > 0) {
                                      const newSlots = { ...character.spellSlots };
                                      newSlots[spell.level] = {
                                          ...newSlots[spell.level],
                                          current: Math.max(0, newSlots[spell.level].current - 1)
                                      };
                                      handleUpdate({ spellSlots: newSlots });
                                   }

                                   rollDice(1, 20, spellMod, `Cast: ${spell.name}`, spell.entries ? extractText(spell.entries) : undefined, spell.effectSummary);
                                 }}
                                 className="flex items-center gap-2 px-4 py-1.5 bg-[var(--gold-accent)]/10 border border-[var(--gold-accent)]/50 text-[var(--gold-accent)] rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--gold-accent)] hover:text-[var(--deep-slate)] transition-all"
                               >
                                 <Wand2 size={12} /> Cast Spell
                               </button>

                               {spell.dmg && (
                                 <button 
                                   onClick={(e) => {
                                      e.stopPropagation();
                                      let dCount = 1; let dType = 8;
                                      try {
                                        const parts = spell.dmg.toLowerCase().split('d');
                                        if (parts.length === 2) {
                                          dCount = parseInt(parts[0]) || 1;
                                          dType = parseInt(parts[1]) || 8;
                                        }
                                      } catch(e) {}
                                      rollDice(dCount, dType as any, 0, `Damage: ${spell.name}`, spell.entries ? extractText(spell.entries) : undefined, spell.effectSummary);
                                   }}
                                   className="flex items-center gap-2 px-4 py-1.5 bg-[var(--blood-red)]/10 border border-[var(--blood-red)]/50 text-[var(--blood-red)] rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--blood-red)] hover:text-white transition-all ml-2"
                                 >
                                    <Skull size={12} /> {spell.dmg} {spell.dmgType}
                                 </button>
                               )}

                               <button 
                                 disabled={aiLoading}
                                 onClick={async (e) => {
                                   e.stopPropagation();
                                   setAiLoading(true);
                                   try {
                                     const desc = extractText(spell.entries);
                                     const stats = await analyzeAction(spell.name, desc, character.campaignTheme);
                                     if (stats && (stats.dice || stats.damageType)) {
                                        const newSpells = [...character.spells];
                                        newSpells[i] = { 
                                          ...spell, 
                                          dmg: stats.dice, 
                                          dmgType: stats.damageType,
                                          saveAttr: stats.saveAttr,
                                          effectSummary: stats.effectSummary
                                        };
                                        handleUpdate({ spells: newSpells });
                                     }
                                   } catch (err) {
                                     console.error("AI Spell Analysis Error:", err);
                                   }
                                   setAiLoading(false);
                                 }}
                                 className="flex items-center gap-2 px-4 py-1.5 bg-blue-900/10 border border-blue-500/30 text-blue-200 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-blue-900/40 transition-all disabled:opacity-50"
                               >
                                 <Sparkles size={12} /> {aiLoading ? 'Analyzing...' : 'Analyze Spell'}
                               </button>
                             </div>
                          </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'inventory' && (
              <motion.div
                key="inventory"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                  {/* Coin Purse / Wealth */}
                  <div className="eldritch-panel flex items-center justify-between border-white/5 bg-black/20">
                     <div className="flex items-center gap-3">
                        <div className="p-3 bg-[var(--gold-accent)]/10 text-[var(--gold-accent)] border border-[var(--gold-accent)]/20 rounded-full">
                           {/* Using a Lucide generic icon for coins/wealth */}
                           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/></svg>
                        </div>
                        <div>
                           <h3 className="font-serif font-bold text-lg text-[var(--gold-accent)]">Coin Purse</h3>
                           <p className="text-[10px] uppercase opacity-50 tracking-widest text-[#a8a29e]">Material wealth</p>
                        </div>
                     </div>
                     <div className="flex gap-4">
                        <div className="flex flex-col items-center">
                           <input 
                             type="number"
                             value={character.cp || 0}
                             onChange={(e) => handleUpdate({ cp: parseInt(e.target.value) || 0 })}
                             className="w-16 bg-black/40 border border-[#b87333]/30 text-[#b87333] text-center font-mono rounded px-2 py-1 text-lg font-bold outline-none focus:border-[#b87333]" 
                           />
                           <span className="text-[10px] uppercase mt-1 font-bold text-[#b87333]">CP</span>
                        </div>
                        <div className="flex flex-col items-center">
                           <input 
                             type="number"
                             value={character.sp || 0}
                             onChange={(e) => handleUpdate({ sp: parseInt(e.target.value) || 0 })}
                             className="w-16 bg-black/40 border border-[#c0c0c0]/30 text-[#c0c0c0] text-center font-mono rounded px-2 py-1 text-lg font-bold outline-none focus:border-[#c0c0c0]" 
                           />
                           <span className="text-[10px] uppercase mt-1 font-bold text-[#c0c0c0]">SP</span>
                        </div>
                        <div className="flex flex-col items-center">
                           <input 
                             type="number"
                             value={character.gp || 0}
                             onChange={(e) => handleUpdate({ gp: parseInt(e.target.value) || 0 })}
                             className="w-16 bg-black/40 border border-[#ffd700]/30 text-[#ffd700] text-center font-mono rounded px-2 py-1 text-lg font-bold outline-none focus:border-[#ffd700]" 
                           />
                           <span className="text-[10px] uppercase mt-1 font-bold text-[#ffd700]">GP</span>
                        </div>
                     </div>
                  </div>

                  {/* Item Seeker */}
                  <div className="eldritch-panel border-white/5 bg-black/20">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-[var(--gold-accent)] text-[var(--deep-slate)] rounded-lg shrink-0">
                          <Backpack size={20} />
                        </div>
                        <div>
                          <h3 className="font-serif font-bold text-lg text-[var(--gold-accent)]">Item Manifest</h3>
                          <p className="text-xs opacity-60">Materialize relics from the ether.</p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 shrink-0">
                        <select
                          value={itemTypeFilter}
                          onChange={(e) => setItemTypeFilter(e.target.value)}
                          className="bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] font-mono text-white/70 outline-none focus:border-[var(--gold-accent)]/50 appearance-none uppercase tracking-widest"
                        >
                          <option value="all">All Types</option>
                          <option value="weapon">Weapon</option>
                          <option value="armor">Armor</option>
                          <option value="potion">Potion</option>
                          <option value="ring">Ring</option>
                          <option value="scroll">Scroll</option>
                          <option value="wondrous">Wondrous Item</option>
                          <option value="gear">Adventuring Gear</option>
                          <option value="tool">Tool</option>
                        </select>

                        <select
                          value={itemRarityFilter}
                          onChange={(e) => setItemRarityFilter(e.target.value)}
                          className="bg-black/40 border border-white/10 rounded px-2 py-1 text-[10px] font-mono text-white/70 outline-none focus:border-[var(--gold-accent)]/50 appearance-none uppercase tracking-widest"
                        >
                          <option value="all">All Rarities</option>
                          <option value="common">Common</option>
                          <option value="uncommon">Uncommon</option>
                          <option value="rare">Rare</option>
                          <option value="very rare">Very Rare</option>
                          <option value="legendary">Legendary</option>
                          <option value="artifact">Artifact</option>
                          <option value="unknown">Basic/None</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                       <input
                        type="text"
                        placeholder="Seek object... (Press Enter)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') searchLibrary(); }}
                        className="flex-1 bg-black/40 border border-white/10 rounded-full px-4 py-2 text-sm italic focus:border-[var(--gold-accent)]/50 outline-none text-[var(--gold-accent)]"
                       />
                       <button 
                         onClick={searchLibrary}
                         className="px-6 py-2 bg-[var(--gold-accent)] text-[var(--deep-slate)] rounded-full font-serif italic text-sm font-bold shadow-[0_0_10px_rgba(255,200,0,0.2)] hover:scale-105 active:scale-95 transition-all"
                       >
                         {searching ? '...' : 'Seek'}
                       </button>
                    </div>

                    {libraryData.items.length > 0 && (
                      <div className="mt-4 grid grid-cols-1 max-h-60 overflow-y-auto gap-2 pr-2 custom-scrollbar">
                        {libraryData.items.map((item, i) => (
                           <div key={i} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-lg group hover:border-[var(--gold-accent)] transition-colors">
                              <div>
                                 <p className="font-serif font-bold text-sm text-white">{item.name}</p>
                                 <p className="text-[10px] text-white/40 uppercase tracking-widest">{item.type} • {item.rarity}</p>
                              </div>
                              <button 
                                onClick={async () => {
                                  let analyzedItem = { ...item, quantity: 1 };
                                  setAiLoading(true);
                                  try {
                                     const desc = extractText(item.entries);
                                     const stats = await analyzeAction(item.name, desc, character.campaignTheme);
                                     if (stats) {
                                        analyzedItem = {
                                           ...analyzedItem,
                                           dmg1: stats.dice,
                                           damageType: stats.damageType,
                                           range: stats.range,
                                           effectSummary: stats.effectSummary,
                                           requiresAttunement: stats.requiresAttunement,
                                           attributeBonuses: stats.attributeBonuses,
                                           attributeOverrides: stats.attributeOverrides,
                                           attachedSpells: stats.attachedSpells
                                        };
                                     }
                                  } catch (err) {
                                     console.error("Auto-analysis error:", err);
                                  }
                                  setAiLoading(false);
                                  const newInv = [...(character.inventory || []), analyzedItem];
                                  handleUpdate({ inventory: newInv });
                                  setLibraryData(prev => ({ ...prev, items: [] }));
                                  setSearchQuery('');
                                }}
                                className="p-2 opacity-30 group-hover:opacity-100 hover:scale-110 transition-all text-[var(--gold-accent)]"
                              >
                                 <Plus size={20} />
                              </button>
                           </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Character Inventory */}
                  <div className="eldritch-panel">
                     <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 border-b border-white/5 pb-4 gap-4">
                       <h3 className="font-serif italic text-xl text-[var(--gold-accent)]">Vaulted Gear</h3>
                       {character.inventory && character.inventory.length > 0 && (
                         <div className="flex items-center gap-2">
                           <input
                            type="text"
                            placeholder="Filter gear..."
                            value={inventorySearchLocal}
                            onChange={(e) => setInventorySearchLocal(e.target.value)}
                            className="bg-black/40 border border-white/10 rounded-full px-4 py-1 text-xs italic focus:border-[var(--gold-accent)]/50 outline-none w-32 md:w-48 text-[var(--gold-accent)]"
                           />
                           <select
                             value={inventorySortBy}
                             onChange={(e: any) => setInventorySortBy(e.target.value)}
                             className="bg-black/40 border border-white/10 rounded-full px-3 py-1 text-xs font-mono text-white/70 outline-none focus:border-[var(--gold-accent)]/50 appearance-none min-w-[70px] text-center"
                           >
                             <option value="name">Name</option>
                             <option value="type">Type</option>
                           </select>
                         </div>
                       )}
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(!character.inventory || character.inventory.length === 0) ? (
                          <p className="col-span-full text-center py-12 text-sm text-gray-500 italic font-serif opacity-40">The vault is currently empty.</p>
                        ) : (
                          character.inventory
                            .map((item: any, originalIndex: number) => ({ ...item, originalIndex }))
                            .filter((item: any) => !inventorySearchLocal || item.name.toLowerCase().includes(inventorySearchLocal.toLowerCase()) || (item.type && item.type.toLowerCase().includes(inventorySearchLocal.toLowerCase())))
                            .sort((a: any, b: any) => {
                              if (inventorySortBy === 'name') return a.name.localeCompare(b.name);
                              if (inventorySortBy === 'type') return (a.type || 'Z').localeCompare(b.type || 'Z');
                              return 0;
                            })
                            .map((item: any) => {
                              const isExpanded = expandedItems.has(item.originalIndex);
                              
                              return (
                                <div key={item.originalIndex} className="p-4 border border-[var(--gold-accent)]/20 bg-black/40 rounded flex flex-col group relative overflow-hidden transition-all hover:border-[var(--gold-accent)]/50">
                                   <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--gold-accent)]/40" />
                                   
                                   <div className="flex justify-between items-start cursor-pointer" onClick={() => {
                                      const newExpanded = new Set(expandedItems);
                                      if (newExpanded.has(item.originalIndex)) newExpanded.delete(item.originalIndex);
                                      else newExpanded.add(item.originalIndex);
                                      setExpandedItems(newExpanded);
                                   }}>
                                     <div className="pr-2">
                                        <h4 className="font-serif font-bold leading-tight text-[var(--parchment)]">{item.name}</h4>
                                        <p className="text-[10px] uppercase font-bold text-[var(--gold-accent)] opacity-40 mt-1">{item.type || 'Object'}{item.rarity ? ` • ${item.rarity}` : ''}</p>
                                        <p className="text-[10px] text-white/30 uppercase mt-0.5">Weight: {item.weight || 0} lbs {item.value ? ` • ${(item.value / 100).toFixed(2)} gp` : ''}</p>
                                     </div>
                                     <div className="flex flex-col items-end gap-1 shrink-0">
                                       <div className="flex items-center bg-black/60 border border-white/10 rounded overflow-hidden" onClick={e => e.stopPropagation()}>
                                          <button 
                                            onClick={() => {
                                              const newInv = [...character.inventory];
                                              newInv[item.originalIndex] = { ...newInv[item.originalIndex], quantity: Math.max(0, (newInv[item.originalIndex].quantity || 1) - 1) };
                                              handleUpdate({ inventory: newInv });
                                            }}
                                            className="px-2 py-0.5 border-r border-white/10 hover:bg-white/10 transition-colors text-white/50 hover:text-white"
                                          >-</button>
                                          <span className="w-6 text-center text-xs font-mono text-[var(--gold-accent)]">{item.quantity || 1}</span>
                                          <button 
                                            onClick={() => {
                                              const newInv = [...character.inventory];
                                              newInv[item.originalIndex] = { ...newInv[item.originalIndex], quantity: (newInv[item.originalIndex].quantity || 1) + 1 };
                                              handleUpdate({ inventory: newInv });
                                            }}
                                            className="px-2 py-0.5 border-l border-white/10 hover:bg-white/10 transition-colors text-white/50 hover:text-white"
                                          >+</button>
                                       </div>
                                       <div className="flex pt-1 right-0 justify-end w-full gap-1">
                                         <button
                                           onClick={(e) => {
                                             e.stopPropagation();
                                             const newInv = [...character.inventory];
                                             newInv[item.originalIndex] = { ...newInv[item.originalIndex], isEquipped: !newInv[item.originalIndex].isEquipped };
                                             handleUpdate({ inventory: newInv });
                                           }}
                                           title={item.isEquipped ? "Unequip" : "Equip"}
                                           className={`p-1.5 transition-all hover:scale-110 border rounded ${item.isEquipped ? 'bg-[var(--gold-accent)]/20 border-[var(--gold-accent)] text-[var(--gold-accent)]' : 'bg-black/40 border-white/5 text-white opacity-40 hover:opacity-100 group-hover:opacity-100'}`}
                                         >
                                            <Shield size={14} />
                                         </button>

                                         {item.requiresAttunement && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const newInv = [...character.inventory];
                                                newInv[item.originalIndex] = { ...newInv[item.originalIndex], isAttuned: !newInv[item.originalIndex].isAttuned };
                                                handleUpdate({ inventory: newInv });
                                              }}
                                              title={item.isAttuned ? "Unattune" : "Attune"}
                                              className={`p-1.5 transition-all hover:scale-110 border rounded ${item.isAttuned ? 'bg-purple-900/40 border-purple-500 text-purple-200' : 'bg-black/40 border-white/5 text-white opacity-40 hover:opacity-100 group-hover:opacity-100'}`}
                                            >
                                               <Zap size={14} />
                                            </button>
                                         )}
                                         <button
                                           onClick={(e) => {
                                             e.stopPropagation();
                                             const newInv = [...character.inventory];
                                             newInv[item.originalIndex] = { ...newInv[item.originalIndex], quickSlot: !newInv[item.originalIndex].quickSlot };
                                             handleUpdate({ inventory: newInv });
                                           }}
                                           title="Toggle Combat Quick Slot"
                                           className={`p-1.5 transition-all hover:scale-110 ${item.quickSlot ? 'text-[var(--gold-accent)] opacity-100' : 'text-white opacity-40 hover:opacity-100 group-hover:opacity-100'}`}
                                         >
                                            <Target size={14} />
                                         </button>
                                         <button 
                                           onClick={(e) => {
                                             e.stopPropagation();
                                             const newInv = character.inventory.filter((_: any, idx: number) => idx !== item.originalIndex);
                                             handleUpdate({ inventory: newInv });
                                           }}
                                           title="Remove from Vault"
                                           className="p-1.5 opacity-60 hover:opacity-100 transition-opacity text-[var(--blood-red)] hover:scale-110"
                                         >
                                            <Trash2 size={14} />
                                         </button>
                                       </div>
                                     </div>
                                   </div>
                                   
                                   {/* Description / Extra Details (Accordion) */}
                                   <AnimatePresence>
                                     {isExpanded && (
                                       <motion.div
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
                                          exit={{ height: 0, opacity: 0, marginTop: 0 }}
                                          className="overflow-hidden border-t border-white/5 pt-3"
                                       >
                                         <p className="text-xs text-white/60 leading-relaxed font-serif italic mb-1">
                                            {item.entries ? extractText(item.entries) : "No mystical insights exist for this object."}
                                         </p>

                                         <div className="flex flex-wrap gap-2 mt-3 items-center">
                                            <button 
                                              disabled={aiLoading}
                                              onClick={async (e) => {
                                                e.stopPropagation();
                                                setAiLoading(true);
                                                try {
                                                  const desc = extractText(item.entries);
                                                  const stats = await analyzeAction(item.name, desc, character.campaignTheme);
                                                  if (stats) {
                                                     const newInv = [...character.inventory];
                                                     newInv[item.originalIndex] = { 
                                                       ...item, 
                                                       dmg1: stats.dice,
                                                       damageType: stats.damageType,
                                                       range: stats.range,
                                                       effectSummary: stats.effectSummary,
                                                       requiresAttunement: stats.requiresAttunement,
                                                       attributeBonuses: stats.attributeBonuses,
                                                       attributeOverrides: stats.attributeOverrides,
                                                       attachedSpells: stats.attachedSpells
                                                     };
                                                     handleUpdate({ inventory: newInv });
                                                  }
                                                } catch (err) {
                                                  console.error("AI Inventory Analysis Error:", err);
                                                }
                                                setAiLoading(false);
                                              }}
                                              className="flex items-center gap-2 px-3 py-1 bg-blue-900/10 border border-blue-500/30 text-blue-200 rounded-full text-[9px] font-bold uppercase tracking-widest hover:bg-blue-900/40 transition-all disabled:opacity-50"
                                            >
                                              <Sparkles size={10} /> {aiLoading ? 'Examining...' : 'Identify Magical Properties'}
                                            </button>

                                            {item.requiresAttunement && (
                                               <span className={`text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 border px-2 py-1 rounded-full ${item.isAttuned ? 'bg-purple-900/40 border-purple-500 text-purple-200' : 'text-purple-400/60 border-purple-500/20 bg-purple-900/10'}`}>
                                                  <Zap size={10} /> {item.isAttuned ? 'Attuned' : 'Requires Attunement'}
                                               </span>
                                            )}

                                            {item.attributeBonuses && Object.entries(item.attributeBonuses).map(([stat, val]) => (
                                               <span key={stat} className="text-[9px] font-bold uppercase tracking-widest text-green-400/60 border border-green-500/20 px-2 py-1 rounded-full bg-green-900/10">
                                                  +{val} {stat}
                                               </span>
                                            ))}

                                            {item.attributeOverrides && Object.entries(item.attributeOverrides).map(([stat, val]) => (
                                               <span key={stat} className="text-[9px] font-bold uppercase tracking-widest text-cyan-400/60 border border-cyan-500/20 px-2 py-1 rounded-full bg-cyan-900/10">
                                                  {stat} SET TO {val}
                                               </span>
                                            ))}
                                         </div>
                                       </motion.div>
                                     )}
                                   </AnimatePresence>
                                </div>
                              );
                            })
                        )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'feats' && (
              <motion.div
                key="feats"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                  {/* Path Features (Subclass & Class) */}
                  <div className="eldritch-panel border-white/5 bg-black/20">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-[var(--gold-accent)] text-[var(--deep-slate)] rounded-lg">
                          <Zap size={20} />
                        </div>
                        <div>
                          <h3 className="font-serif font-bold text-lg text-[var(--gold-accent)]">Path Features</h3>
                          <p className="text-xs opacity-60">Abilities granted by your {character.class} {character.subclass ? `(${character.subclass})` : ''} vocation.</p>
                        </div>
                      </div>
                      <button 
                        onClick={handleIdentifyFeatures}
                        disabled={aiLoading}
                        className="flex items-center gap-2 px-4 py-1.5 bg-blue-900/10 border border-blue-500/30 text-blue-200 rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-blue-900/40 transition-all disabled:opacity-50"
                      >
                        <Sparkles size={12} /> {aiLoading ? 'Seeking...' : 'Identify Path Features'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(!character.classFeatures || character.classFeatures.length === 0) ? (
                          <div className="col-span-full text-center py-12 border border-dashed border-white/10 rounded-lg">
                             <p className="text-sm text-gray-500 italic font-serif">Your arcane path remains unwritten. Use the identify tool above.</p>
                          </div>
                        ) : (
                          character.classFeatures.map((feature: any, i: number) => (
                             <div key={i} className="p-4 bg-black/40 border border-white/5 rounded-lg group hover:border-[var(--gold-accent)]/30 transition-all">
                                <div className="flex justify-between items-start mb-2">
                                   <div>
                                      <h4 className="font-serif font-bold text-[var(--gold-accent)]">{feature.name}</h4>
                                      <p className="text-[10px] uppercase tracking-widest opacity-40">{feature.source} • Level {feature.level}</p>
                                   </div>
                                   <div className="flex gap-2">
                                      {feature.usage && (
                                         <span className="text-[8px] px-2 py-0.5 rounded bg-blue-900/20 border border-blue-500/30 text-blue-200 uppercase font-bold tracking-widest">
                                            {feature.usage}
                                         </span>
                                      )}
                                      <button 
                                        onClick={() => {
                                          const newFeatures = character.classFeatures.filter((_: any, idx: number) => idx !== i);
                                          handleUpdate({ classFeatures: newFeatures });
                                        }}
                                        className="p-1 text-[var(--blood-red)] opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                         <Trash2 size={14} />
                                      </button>
                                   </div>
                                </div>
                                <div className="text-xs text-white/50 leading-relaxed font-serif italic line-clamp-2 group-hover:line-clamp-none transition-all">
                                   {Array.isArray(feature.entries) ? feature.entries.join(' ') : feature.entries}
                                </div>
                                {feature.dice && (
                                   <div className="mt-3">
                                      <button 
                                        onClick={() => {
                                           let dCount = 1; let dType = 8;
                                           try {
                                             const parts = feature.dice.toLowerCase().split('d');
                                             if (parts.length === 2) {
                                               dCount = parseInt(parts[0]) || 1;
                                               dType = parseInt(parts[1]) || 8;
                                             }
                                           } catch(e) {}
                                           rollDice(dCount, dType as any, 0, `Action: ${feature.name}`, Array.isArray(feature.entries) ? feature.entries.join(' ') : feature.entries);
                                        }}
                                        className="flex items-center gap-1.5 px-3 py-1 bg-[var(--gold-accent)]/10 border border-[var(--gold-accent)]/20 text-[var(--gold-accent)] rounded text-[9px] font-bold uppercase tracking-widest hover:bg-[var(--gold-accent)]/20 transition-all"
                                      >
                                         <Dice5 size={10} /> Roll {feature.dice}
                                      </button>
                                   </div>
                                )}
                             </div>
                          ))
                        )}
                    </div>
                  </div>

                  {/* Heroic Feats Seeker */}
                  <div className="eldritch-panel border-white/5 bg-black/20">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-2 bg-[var(--gold-accent)] text-[var(--deep-slate)] rounded-lg">
                        <CheckCircle2 size={20} />
                      </div>
                      <div>
                        <h3 className="font-serif font-bold text-lg text-[var(--gold-accent)]">Heroic Feats</h3>
                        <p className="text-xs opacity-60">Discover mighty capabilities.</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                       <input
                        type="text"
                        placeholder="Seek feat..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 bg-black/40 border border-white/10 rounded-full px-4 py-2 text-sm italic focus:border-[var(--gold-accent)]/50 outline-none text-[var(--gold-accent)]"
                       />
                       <button 
                         onClick={searchLibrary}
                         className="px-6 py-2 bg-[var(--gold-accent)] text-[var(--deep-slate)] rounded-full font-serif italic text-sm font-bold"
                       >
                         {searching ? '...' : 'Seek'}
                       </button>
                    </div>

                    {libraryData.feats.length > 0 && (
                      <div className="mt-4 grid grid-cols-1 max-h-60 overflow-y-auto gap-2 pr-2 custom-scrollbar">
                        {libraryData.feats.map((feat, i) => (
                           <div key={i} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-lg group hover:border-[var(--gold-accent)] transition-colors">
                              <div>
                                 <p className="font-serif font-bold text-sm text-white">{feat.name}</p>
                                 <p className="text-[10px] text-white/40 uppercase tracking-widest">Source: {feat.source}</p>
                              </div>
                              <button 
                                onClick={() => {
                                  const newFeats = [...(character.feats || []), feat];
                                  handleUpdate({ feats: newFeats });
                                  setLibraryData(prev => ({ ...prev, feats: [] }));
                                  setSearchQuery('');
                                }}
                                className="p-2 opacity-30 group-hover:opacity-100 hover:scale-110 transition-all text-[var(--gold-accent)]"
                              >
                                 <Plus size={20} />
                              </button>
                           </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Character Feats */}
                  <div className="eldritch-panel">
                     <h3 className="font-serif italic text-xl mb-6 border-b border-white/5 pb-2 text-[var(--gold-accent)]">Acquired Feats</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(!character.feats || character.feats.length === 0) ? (
                          <p className="col-span-full text-center py-12 text-sm text-gray-500 italic font-serif opacity-40">No feats recorded yet.</p>
                        ) : (
                          character.feats.map((feat: any, i: number) => (
                            <div key={i} className="p-4 border border-[var(--gold-accent)]/20 bg-black/40 rounded flex justify-between items-start group relative overflow-hidden transition-all hover:border-[var(--gold-accent)]/50">
                               <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--gold-accent)]/40" />
                               <div>
                                  <h4 className="font-serif font-bold leading-tight text-[var(--parchment)]">{feat.name}</h4>
                                  <p className="text-[10px] uppercase font-bold text-[var(--gold-accent)] opacity-40 mt-1">{feat.source}</p>
                               </div>
                               <button 
                                 onClick={() => {
                                   const newFeats = character.feats.filter((_: any, idx: number) => idx !== i);
                                   handleUpdate({ feats: newFeats });
                                 }}
                                 className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--blood-red)] hover:scale-110"
                               >
                                  <Trash2 size={16} />
                               </button>
                            </div>
                          ))
                        )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'backstory' && (
              <motion.div
                key="backstory"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                  <div className="eldritch-panel relative min-h-[400px]">
                     <div className="absolute top-4 right-4 flex items-center gap-2">
                        <button 
                          onClick={handleGenerateBackstory}
                          disabled={aiLoading}
                          className="ai-btn-gradient flex items-center gap-2 px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(79,172,254,0.3)]"
                        >
                           {aiLoading ? 'Channelling...' : <><Sparkles size={12} /> Invoke Chronomancy</>}
                        </button>
                     </div>
                     <h3 className="font-serif italic text-2xl mb-6 border-b border-[var(--gold-accent)]/30 inline-block pr-12 pb-2 text-[var(--gold-accent)]">The Chronicle of {character.name}</h3>
                     <textarea
                       rows={15}
                       value={character.backstory}
                       onChange={(e) => handleUpdate({ backstory: e.target.value })}
                       placeholder="Etch your legend into the archive..."
                       className="w-full bg-transparent font-serif text-lg leading-relaxed outline-none resize-none placeholder:opacity-10 italic"
                     />
                  </div>
              </motion.div>
            )}

            {activeTab === 'notes' && (
              <motion.div
                key="notes"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                  <div className="eldritch-panel min-h-[400px]">
                     <h3 className="uppercase text-[12px] font-bold tracking-[0.4em] opacity-80 mb-4 text-[var(--gold-accent)] flex items-center gap-2 border-b border-[var(--gold-accent)]/30 pb-2">
                        <Scroll size={16} /> Campaign Journal
                     </h3>
                     <textarea
                       rows={20}
                       value={character.notes}
                       onChange={(e) => handleUpdate({ notes: e.target.value })}
                       placeholder="Forbidden knowledge, recurring phantoms, arcane seeds, and party ledgers..."
                       className="w-full bg-transparent p-2 font-serif text-lg leading-relaxed outline-none resize-none placeholder:opacity-20 italic text-white/80"
                     />
                  </div>
              </motion.div>
            )}
            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                  <div className="eldritch-panel min-h-[400px]">
                     <h3 className="uppercase text-[12px] font-bold tracking-[0.4em] opacity-80 mb-6 text-[var(--gold-accent)] flex items-center gap-2 border-b border-[var(--gold-accent)]/30 pb-2">
                        <Settings size={16} /> Campaign Context & AI Flavor
                     </h3>
                     
                     <div className="space-y-6">
                        <div>
                           <label className="block text-[10px] uppercase font-bold tracking-widest text-[var(--gold-accent)] mb-2 opacity-80">Campaign Theme / Origin</label>
                           <p className="text-xs text-white/50 mb-3 font-serif italic">This setting alters how the system describes items, spells, generated backgrounds, and class features. For example: &quot;Cyberpunk D&amp;D&quot;, &quot;Mesoamerican High Fantasy&quot;, &quot;Star Wars Sci-Fi&quot;, or &quot;Grimdark Horror&quot;.</p>
                           <input
                             type="text"
                             value={character.campaignTheme || ''}
                             onChange={(e) => handleUpdate({ campaignTheme: e.target.value })}
                             placeholder="e.g. High Fantasy D&D 5e"
                             className="w-full bg-black/40 border border-[var(--gold-accent)]/20 rounded p-3 font-serif outline-none focus:border-[var(--gold-accent)]/60 text-white transition-colors"
                           />
                        </div>

                        <div className="p-4 bg-blue-900/10 border border-blue-500/20 rounded-lg">
                           <div className="flex items-start gap-4">
                              <Sparkles size={24} className="text-blue-400 shrink-0 mt-1" />
                              <div>
                                 <h4 className="font-bold text-sm text-blue-200 mb-1 font-serif">Why set a theme?</h4>
                                 <p className="text-xs text-blue-100/60 leading-relaxed font-serif">
                                    When you use the AI Identify tools (such as analyzing a spell in your Grimoire, identifying an item in your Vault, or detailing a Subclass feature), the system will adapt the flavor text to match this specific setting. This lets you seamlessly reskin D&D 5e mechanics into any genre of your choosing.
                                 </p>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
              </motion.div>
            )}

          </AnimatePresence>
        </section>
      </main>

      {/* Portrait Generation Modal */}
      <AnimatePresence>
        {portraitModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setPortraitModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="eldritch-panel border border-[var(--gold-accent)]/50 p-6 max-w-md w-full shadow-[0_0_40px_rgba(197,160,89,0.15)]"
            >
              <h3 className="font-serif italic text-2xl text-[var(--gold-accent)] mb-4 flex items-center gap-2">
                <Sparkles size={24} /> Envision Avatar
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-widest opacity-60 text-[var(--gold-accent)] mb-2 block">Physical Traits</label>
                  <textarea
                    value={physicalDesc}
                    onChange={(e) => setPhysicalDesc(e.target.value)}
                    placeholder="E.g., piercing blue eyes, a scar across the cheek, wearing dark flowing robes..."
                    rows={3}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm focus:border-[var(--gold-accent)]/50 outline-none resize-none font-serif italic text-[var(--parchment)]"
                  />
                </div>
                
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-widest opacity-60 text-[var(--gold-accent)] mb-2 block">Artistic Style</label>
                  <select
                    value={portraitStyle}
                    onChange={(e) => setPortraitStyle(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-sm focus:border-[var(--gold-accent)]/50 outline-none text-[var(--parchment)]"
                  >
                    <option value="Fantasy Realism">Fantasy Realism</option>
                    <option value="Watercolor">Ethereal Watercolor</option>
                    <option value="Dark Fantasy">Grimdark Ink</option>
                    <option value="Classic RPG">Classic RPG Manual (Pencil)</option>
                    <option value="Pixel Art">16-bit Pixel Art</option>
                  </select>
                </div>

                <div className="flex items-center gap-4 py-2">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-[10px] uppercase tracking-widest opacity-40">OR</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold tracking-widest opacity-60 text-[var(--gold-accent)] mb-2 block">Upload Custom Image</label>
                  <div className="relative">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="w-full bg-black/40 border border-white/10 border-dashed rounded-lg p-4 text-center hover:border-[var(--gold-accent)]/50 transition-colors">
                      <span className="text-sm font-bold opacity-80 flex items-center justify-center gap-2">
                        <ImageIcon size={16} /> Choose File...
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-4 pt-4 border-t border-white/10 mt-6">
                  <button
                    onClick={() => setPortraitModalOpen(false)}
                    className="px-6 py-2 rounded-full border border-white/20 text-white/60 hover:text-white hover:border-white/40 transition-colors font-bold text-xs uppercase tracking-widest flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmGeneratePortrait}
                    className="px-6 py-2 rounded-full bg-[var(--gold-accent)] text-[var(--deep-slate)] font-bold text-xs uppercase tracking-widest hover:shadow-[0_0_15px_rgba(197,160,89,0.4)] transition-all flex-[2] flex justify-center items-center gap-2"
                  >
                     <ImageIcon size={14} /> Conjure Image
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistence Indicator */}

      <AnimatePresence>
        {saving && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-2 bg-[var(--gold-accent)] text-[var(--deep-slate)] rounded-full shadow-2xl flex items-center gap-2 z-50 overflow-hidden font-bold"
          >
            <div className="w-1.5 h-1.5 bg-[var(--magic-blue)] rounded-full animate-pulse" />
            <span className="text-[10px] uppercase tracking-widest whitespace-nowrap">Synchronizing with the Archive</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
