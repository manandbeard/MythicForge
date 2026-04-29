'use client';

import React, { useState } from 'react';
import { MythosPanel, MythosButton, MythosInput, MythosLabel } from './UI';
import { Backpack, Weight, Plus, Shield, Sword, Eye, EyeOff, Trash2, Zap, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DataCombobox } from '../DataCombobox';

interface InventoryPanelProps {
  character: any;
  updateCharacter: (updates: any) => void;
}


export const InventoryPanel = ({ character, updateCharacter }: InventoryPanelProps) => {
  const inventory = character.inventory || [];
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    type: 'gear',
    weight: 1,
    quantity: 1,
    isEquipped: false,
    requiresAttunement: false,
    ac: 0,
    acBonus: 0,
    armorType: 'none',
    attackBonus: 0,
    damageDice: 1,
    damageSides: 8,
    damageBonus: 0,
  });

  const handleAddItem = () => {
    if (!newItem.name.trim()) return;
    const item = {
      ...newItem,
      id: Date.now().toString(),
    };
    updateCharacter({
      inventory: [...inventory, item],
      persist: true
    });
    setIsAdding(false);
    setNewItem({
      name: '', description: '', type: 'gear', weight: 1, quantity: 1,
      isEquipped: false, requiresAttunement: false, ac: 0, acBonus: 0, armorType: 'none',
      attackBonus: 0, damageDice: 1, damageSides: 8, damageBonus: 0
    });
  };

  const removeItem = (id: string) => {
    if (!window.confirm('Cast this item into the void?')) return;
    updateCharacter({
      inventory: inventory.filter((i: any) => i.id !== id),
      persist: true
    });
  };

  const toggleEquip = (id: string, currentlyEquipped: boolean) => {
    updateCharacter({
      inventory: inventory.map((i: any) => i.id === id ? { ...i, isEquipped: !currentlyEquipped } : i),
      persist: true
    });
  };

  const toggleAttune = (id: string, currentlyAttuned: boolean) => {
    updateCharacter({
      inventory: inventory.map((i: any) => i.id === id ? { ...i, isAttuned: !currentlyAttuned } : i),
      persist: true
    });
  };

  const totalWeight = character.totalWeight || 0;
  const capacity = character.carryingCapacity || (character.stats?.str || 10) * 15;
  const encumbered = totalWeight > capacity;
  const weightPercent = Math.min((totalWeight / capacity) * 100, 100);

  const filteredInventory = inventory.filter((item: any) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || item.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Encumbrance Banner */}
      <MythosPanel variant="deep" className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-gradient-to-r from-transparent via-[var(--gold-accent)] to-transparent" />
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-center gap-6">
           <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${encumbered ? 'bg-[var(--blood-red)]/20 text-[var(--blood-red)]' : 'bg-black/40 text-[var(--gold-accent)]'}`}>
                 <Weight size={24} />
              </div>
              <div>
                 <MythosLabel>Encumbrance</MythosLabel>
                 <div className="text-2xl font-serif italic flex items-baseline gap-2">
                    <span className={encumbered ? 'text-[var(--blood-red)]' : 'text-white'}>
                       {parseFloat(totalWeight.toFixed(2))}
                    </span>
                    <span className="text-sm opacity-50">/ {capacity} lbs</span>
                 </div>
              </div>
           </div>
           
           <div className="w-full sm:w-1/2">
              <div className="h-2 bg-black/50 rounded-full overflow-hidden border border-white/5 relative">
                 <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${weightPercent}%` }}
                   className={`h-full ${encumbered ? 'bg-[var(--blood-red)]' : 'bg-[var(--gold-accent)]/80'}`}
                 />
              </div>
              {encumbered && (
                <p className="text-[10px] uppercase tracking-widest text-[var(--blood-red)] mt-2 font-bold text-right hover:animate-pulse">
                   Overburdened! Speed reduced.
                </p>
              )}
           </div>
        </div>
      </MythosPanel>

      {/* Inventory List */}
      <MythosPanel variant="default" className="p-0 overflow-hidden">
         <div className="bg-white/5 border-b border-white/10 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
               <Backpack size={20} className="text-[var(--gold-accent)]" />
               <h3 className="font-serif italic font-bold text-lg text-[var(--parchment)]">The Vault</h3>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
               <MythosInput
                 placeholder="Search Items..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="flex-1 sm:w-40 bg-black/40"
               />
               <select
                 value={filterType}
                 onChange={e => setFilterType(e.target.value)}
                 className="bg-black/60 border border-white/10 p-2 rounded-lg text-sm text-[var(--parchment)] focus:border-[var(--gold-accent)]/50 focus:outline-none uppercase tracking-widest font-bold"
               >
                 <option value="all">All</option>
                 <option value="gear">Gear</option>
                 <option value="weapon">Weapons</option>
                 <option value="armor">Armor</option>
                 <option value="shield">Shields</option>
                 <option value="magic_item">Relics</option>
               </select>
               <MythosButton variant="ghost" size="sm" onClick={() => setIsAdding(!isAdding)}>
                  {isAdding ? 'Cancel' : <span className="flex items-center gap-2"><Plus size={16} /> Store</span>}
               </MythosButton>
            </div>
         </div>

         <AnimatePresence>
            {isAdding && (
               <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-black/40 border-b border-[var(--gold-accent)]/20 overflow-hidden"
               >
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="md:col-span-2 space-y-2 mb-2">
                       <MythosLabel>Quick Search & Populate</MythosLabel>
                       <DataCombobox
                         category="items"
                         placeholder="Search 5e Database for Items..."
                         onSelect={(item) => {
                           let parsedType = 'gear';
                           if (item.type?.includes('weapon')) parsedType = 'weapon';
                           else if (item.type?.includes('armor')) parsedType = 'armor';
                           else if (item.type?.includes('shield')) parsedType = 'shield';
                           else if (item.type?.includes('wondrous') || item.type?.includes('ring') || item.type?.includes('staff')) parsedType = 'magic_item';
                           
                           setNewItem({
                             ...newItem,
                             name: item.name,
                             weight: typeof item.weight === 'number' ? item.weight : 0,
                             type: parsedType,
                             description: item.description || '',
                           });
                         }}
                         renderItem={(item) => (
                           <div className="flex flex-col">
                             <div className="font-serif italic font-bold text-neutral-200">{item.name}</div>
                             <div className="text-[10px] text-neutral-500 uppercase tracking-widest mt-0.5">
                               {item.type} {item.weight ? `• ${item.weight} lbs` : ''} 
                             </div>
                           </div>
                         )}
                       />
                       <div className="text-[10px] text-white/40 uppercase tracking-widest">Or create a custom item manually below.</div>
                     </div>

                     <div className="space-y-4">
                        <div>
                           <MythosLabel>Item Designator</MythosLabel>
                           <MythosInput 
                              placeholder="E.g., Boots of Elvenkind" 
                              value={newItem.name}
                              onChange={e => setNewItem({...newItem, name: e.target.value})}
                              className="w-full"
                           />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                           <div>
                              <MythosLabel>Type</MythosLabel>
                              <select 
                                className="w-full bg-black/60 border border-white/10 p-3 rounded-lg text-sm text-[var(--parchment)] focus:border-[var(--gold-accent)]/50 focus:outline-none transition-all uppercase tracking-widest font-bold"
                                value={newItem.type}
                                onChange={e => setNewItem({...newItem, type: e.target.value})}
                              >
                                <option value="gear">Standard Gear</option>
                                <option value="weapon">Weapon</option>
                                <option value="armor">Armor</option>
                                <option value="shield">Shield</option>
                                <option value="magic_item">Relic / Magic</option>
                              </select>
                           </div>
                           <div>
                              <MythosLabel>Qty</MythosLabel>
                              <MythosInput 
                                type="number" 
                                value={newItem.quantity} 
                                onChange={e => setNewItem({...newItem, quantity: parseInt(e.target.value) || 1})}
                              />
                           </div>
                           <div>
                              <MythosLabel>Weight/ea</MythosLabel>
                              <MythosInput 
                                type="number" 
                                value={newItem.weight} 
                                onChange={e => setNewItem({...newItem, weight: parseFloat(e.target.value) || 0})}
                              />
                           </div>
                        </div>
                     </div>

                     <div className="space-y-4">
                        {newItem.type === 'armor' && (
                           <div className="grid grid-cols-2 gap-4">
                              <div>
                                 <MythosLabel>Base AC</MythosLabel>
                                 <MythosInput 
                                    type="number" 
                                    value={newItem.ac} 
                                    onChange={e => setNewItem({...newItem, ac: parseInt(e.target.value) || 0})}
                                 />
                              </div>
                              <div>
                                 <MythosLabel>Armor Class Type</MythosLabel>
                                 <select 
                                   className="w-full bg-black/60 border border-white/10 p-3 rounded-lg text-sm text-[var(--parchment)] focus:border-[var(--gold-accent)]/50 focus:outline-none transition-all uppercase tracking-widest font-bold"
                                   value={newItem.armorType}
                                   onChange={e => setNewItem({...newItem, armorType: e.target.value})}
                                 >
                                   <option value="light">Light</option>
                                   <option value="medium">Medium</option>
                                   <option value="heavy">Heavy</option>
                                   <option value="none">None</option>
                                 </select>
                              </div>
                           </div>
                        )}
                        {newItem.type === 'weapon' && (
                           <div className="grid grid-cols-2 gap-4">
                              <div>
                                 <MythosLabel>Attack Bonus</MythosLabel>
                                 <MythosInput 
                                    type="number" 
                                    value={newItem.attackBonus} 
                                    onChange={e => setNewItem({...newItem, attackBonus: parseInt(e.target.value) || 0})}
                                 />
                              </div>
                              <div className="flex gap-2">
                                 <div>
                                    <MythosLabel>Dice</MythosLabel>
                                    <div className="flex items-center gap-1">
                                       <MythosInput 
                                          type="number" 
                                          className="w-12 text-center"
                                          value={newItem.damageDice} 
                                          onChange={e => setNewItem({...newItem, damageDice: parseInt(e.target.value) || 1})}
                                       />
                                       <span className="text-white/40">d</span>
                                       <select 
                                          className="bg-black/60 border border-white/10 p-2 rounded-lg text-sm text-[var(--parchment)]"
                                          value={newItem.damageSides}
                                          onChange={e => setNewItem({...newItem, damageSides: parseInt(e.target.value) || 8})}
                                       >
                                          <option value="4">4</option>
                                          <option value="6">6</option>
                                          <option value="8">8</option>
                                          <option value="10">10</option>
                                          <option value="12">12</option>
                                       </select>
                                    </div>
                                 </div>
                                 <div>
                                    <MythosLabel>Dmg Bonus</MythosLabel>
                                    <MythosInput 
                                       type="number" 
                                       value={newItem.damageBonus} 
                                       onChange={e => setNewItem({...newItem, damageBonus: parseInt(e.target.value) || 0})}
                                    />
                                 </div>
                              </div>
                           </div>
                        )}
                        {(newItem.type === 'shield' || newItem.type === 'magic_item' || newItem.type === 'armor') && (
                           <div>
                              <MythosLabel>Magic AC Bonus</MythosLabel>
                              <MythosInput 
                                 type="number" 
                                 value={newItem.acBonus} 
                                 onChange={e => setNewItem({...newItem, acBonus: parseInt(e.target.value) || 0})}
                              />
                           </div>
                        )}
                        <div className="flex gap-4">
                           <label className="flex items-center gap-2 text-[10px] uppercase tracking-widest cursor-pointer opacity-70 hover:opacity-100 transition-opacity">
                              <input 
                                type="checkbox"
                                checked={newItem.requiresAttunement}
                                onChange={e => setNewItem({...newItem, requiresAttunement: e.target.checked})}
                                className="accent-[var(--gold-accent)]"
                              />
                              Requires Attunement
                           </label>
                        </div>
                     </div>

                     <div className="md:col-span-2 flex justify-end">
                        <MythosButton onClick={handleAddItem} disabled={!newItem.name.trim()}>
                           Store in Vault
                        </MythosButton>
                     </div>
                  </div>
               </motion.div>
            )}
         </AnimatePresence>

         <div className="p-6 space-y-4">
            {filteredInventory.length === 0 ? (
               <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-2xl opacity-20">
                  <p className="font-serif italic text-lg">The vault returns emptiness.</p>
               </div>
            ) : (
               filteredInventory.map((item: any) => (
                  <motion.div 
                     key={item.id} 
                     layout 
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, scale: 0.95 }}
                     className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-xl transition-all group ${
                        item.isEquipped ? 'bg-[var(--gold-accent)]/5 border-[var(--gold-accent)]/30' : 'bg-black/20 border-white/5 hover:border-white/20'
                     }`}
                  >
                     <div className="mb-4 sm:mb-0">
                        <div className="flex items-center gap-3">
                           {item.type === 'weapon' ? <Sword size={16} className="opacity-50" /> : 
                            item.type === 'armor' || item.type === 'shield' ? <Shield size={16} className="opacity-50" /> : 
                            <Backpack size={16} className="opacity-50" />}
                           <h4 className="font-serif italic font-bold text-lg text-white">
                              {item.name} 
                              {item.quantity > 1 && <span className="opacity-50 ml-2 text-sm font-sans not-italic font-normal">x{item.quantity}</span>}
                           </h4>
                        </div>
                        <div className="text-[10px] flex items-center gap-2 uppercase font-bold opacity-40 tracking-widest mt-1 pl-7">
                           <span>{item.type || 'Gear'}</span>
                           {item.weight > 0 && (
                              <>
                                 <span>•</span>
                                 <span>{item.weight} lbs</span>
                              </>
                           )}
                           {(item.ac || item.acBonus) > 0 && (
                              <>
                                 <span>•</span>
                                 <span className="text-[var(--gold-accent)] opacity-100">AC +{(item.ac || 0) + (item.acBonus || 0)}</span>
                              </>
                           )}
                        </div>
                     </div>

                     <div className="flex items-center gap-3">
                        <div className="flex gap-2">
                           {(item.type === 'armor' || item.type === 'weapon' || item.type === 'shield' || item.type === 'magic_item') && (
                              <button 
                                 onClick={() => toggleEquip(item.id, item.isEquipped)}
                                 className={`p-2 rounded transition-colors ${
                                    item.isEquipped ? 'bg-[var(--gold-accent)]/20 text-[var(--gold-accent)]' : 'bg-white/5 text-white/40 hover:text-white'
                                 }`}
                                 title={item.isEquipped ? 'Unequip' : 'Equip'}
                              >
                                 <Settings2 size={16} />
                              </button>
                           )}
                           {item.requiresAttunement && (
                              <button 
                                 onClick={() => toggleAttune(item.id, item.isAttuned)}
                                 className={`p-2 rounded transition-colors ${
                                    item.isAttuned ? 'bg-[var(--magic-blue)]/20 text-[var(--magic-blue)]' : 'bg-white/5 text-white/40 hover:text-white'
                                 }`}
                                 title={item.isAttuned ? 'Break Attunement' : 'Attune'}
                              >
                                 <Zap size={16} />
                              </button>
                           )}
                        </div>
                        <button 
                           onClick={() => removeItem(item.id)}
                           className="p-2 text-white/20 hover:text-[var(--blood-red)] hover:bg-[var(--blood-red)]/10 rounded transition-all ml-2"
                        >
                           <Trash2 size={16} />
                        </button>
                     </div>
                  </motion.div>
               ))
            )}
         </div>
      </MythosPanel>
    </div>
  );
};
