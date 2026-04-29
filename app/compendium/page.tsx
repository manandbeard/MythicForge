'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, Search, Book } from 'lucide-react';
import { MythosInput } from '@/components/mythos/UI';
import { motion, AnimatePresence } from 'motion/react';
import { 
  fetchClasses, 
  fetchRaces, 
  fetchSpells, 
  fetchItems, 
  fetchMonsters, 
  fetchBackgrounds, 
  fetchConditionsDiseases,
  fetchFeats,
  fetchActions
} from '@/lib/data-import';
import { extractText } from '@/lib/data-import';

type Category = 'classes' | 'races' | 'backgrounds' | 'spells' | 'items' | 'monsters' | 'feats' | 'rules';

export default function Compendium() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<Category>('classes');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Data stores
  const [dataCache, setDataCache] = useState<Record<Category, any[]>>({
    classes: [],
    races: [],
    backgrounds: [],
    spells: [],
    items: [],
    monsters: [],
    feats: [],
    rules: []
  });

  useEffect(() => {
    const loadCategory = async () => {
      if (dataCache[activeCategory].length > 0) return;
      
      setLoading(true);
      try {
        let newData: any[] = [];
        if (activeCategory === 'classes') newData = await fetchClasses();
        else if (activeCategory === 'races') newData = await fetchRaces();
        else if (activeCategory === 'backgrounds') newData = await fetchBackgrounds();
        else if (activeCategory === 'spells') newData = await fetchSpells();
        else if (activeCategory === 'items') newData = await fetchItems();
        else if (activeCategory === 'monsters') newData = await fetchMonsters();
        else if (activeCategory === 'feats') newData = await fetchFeats();
        else if (activeCategory === 'rules') {
           const [conds, acts] = await Promise.all([fetchConditionsDiseases(), fetchActions()]);
           newData = [...conds, ...acts];
        }
        
        setDataCache(prev => ({ ...prev, [activeCategory]: newData }));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    loadCategory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory]);

  const currentData = dataCache[activeCategory] || [];
  const filteredData = currentData.filter(item => 
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.source?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[var(--deep-slate)] text-[var(--parchment)] py-20 px-4">
      <div className="max-w-7xl mx-auto space-y-12">
        <header className="space-y-4 border-b border-[var(--gold-accent)]/20 pb-8">
             <button onClick={() => router.push('/')} className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest opacity-40 hover:opacity-100 transition-opacity">
                <ArrowLeft size={16} /> Return to Dashboard
             </button>
             <div className="flex items-center gap-4">
               <Book size={48} className="text-[var(--gold-accent)]" />
               <h1 className="text-5xl font-serif font-black tracking-tighter text-[var(--gold-accent)]">
                 THE<span className="italic font-light">ARCHIVE</span>
               </h1>
             </div>
             <p className="font-serif italic opacity-70">
               Comprehensive knowledge drawn directly from the eternal source. Read the lore of classes, races, artifacts, and beasts.
             </p>
        </header>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="w-full lg:w-64 space-y-2 shrink-0">
            {(['classes', 'races', 'backgrounds', 'spells', 'items', 'monsters', 'feats', 'rules'] as Category[]).map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-all uppercase text-[10px] tracking-[0.2em] font-bold ${
                  activeCategory === cat 
                    ? 'bg-[var(--gold-accent)]/10 border-[var(--gold-accent)] text-[var(--gold-accent)] shadow-[0_0_15px_rgba(197,160,89,0.1)]' 
                    : 'bg-black/20 border-white/5 hover:border-white/20'
                }`}
              >
                {cat}
              </button>
            ))}
          </aside>

          {/* Main Content */}
          <main className="flex-1 space-y-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--gold-accent)] opacity-40" size={18} />
              <MythosInput
                placeholder={`Search ${activeCategory}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-xl bg-black/40 border-white/5 focus:border-[var(--gold-accent)]/50"
              />
            </div>

            <div className="min-h-[50vh]">
              {loading && dataCache[activeCategory].length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 opacity-50">
                  <Loader2 className="animate-spin text-[var(--gold-accent)] w-12 h-12 mb-4" />
                  <p className="font-serif italic">Consulting the ancient texts...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredData.slice(0, 50).map((item, idx) => (
                    <motion.div 
                      key={`${item.name}-${item.source}-${idx}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-6 rounded-xl border border-white/5 bg-black/40 hover:border-[var(--gold-accent)]/30 transition-all group overflow-hidden"
                    >
                      <h3 className="font-serif italic font-bold text-xl text-[var(--gold-accent)] mb-1 group-hover:scale-105 transition-transform origin-left">
                        {item.name}
                      </h3>
                      <div className="flex gap-2 text-[10px] uppercase tracking-widest opacity-40 font-bold mb-4">
                        <span>{item.source}</span>
                        {item.level !== undefined && <span>• Lvl {item.level}</span>}
                        {item.type && <span>• {item.type}</span>}
                        {item.cr && <span>• CR {item.cr}</span>}
                      </div>

                      <div className="text-sm font-serif opacity-70 line-clamp-4 leading-relaxed">
                        {item.description || 
                         (item.entries ? extractText(item.entries).substring(0, 200) + '...' : '') || 
                         'No additional lore provided.'}
                      </div>

                      {item.subclasses && item.subclasses.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-white/5">
                          <h4 className="text-[10px] uppercase font-bold tracking-widest text-[var(--gold-accent)] mb-2">Subclasses</h4>
                          <div className="flex flex-wrap gap-2">
                             {item.subclasses.map((sc: any, i: number) => (
                               <span key={i} className="px-2 py-1 bg-white/5 rounded text-[10px] font-bold uppercase tracking-widest">{sc.name}</span>
                             ))}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ))}
                  {filteredData.length === 0 && (
                     <div className="col-span-full py-20 text-center opacity-30">
                        <p className="font-serif italic text-xl">The texts contain nothing matching your query.</p>
                     </div>
                  )}
                  {filteredData.length > 50 && (
                     <div className="col-span-full py-4 text-center opacity-30 text-sm font-serif italic border-t border-white/5">
                        Showing first 50 results. Refine your seek to uncover more...
                     </div>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
