const MIRROR_URL = 'https://raw.githubusercontent.com/5etools-mirror-3/5etools-src/main/data';

const fetchJson = async (path: string) => {
  try {
    const res = await fetch(`/${path}`);
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn(`Local fetch failed for ${path}, falling back...`);
  }
  const res = await fetch(`${MIRROR_URL}/${path}`);
  if (!res.ok) throw new Error(`Failed to fetch ${path}`);
  return await res.json();
};

// Helper to extract nested rich text entries from 5e tools JSON
export const extractText = (obj: any): string => {
  if (typeof obj === 'string') return obj.replace(/\{@.*?\s(.*?)(?:\|.*?)?\}/g, '$1'); // Strip tags like {@skill Insight|XPHB}
  if (Array.isArray(obj)) return obj.map(extractText).join(' ');
  if (typeof obj === 'object' && obj !== null) {
    if (obj.entries) return extractText(obj.entries);
    if (obj.items) return extractText(obj.items);
    if (obj.entry) return extractText(obj.entry);
  }
  return '';
};

// Helper to deduplicate arrays, preferring 2024 content (XPHB)
const deduplicateData = (dataArray: any[]) => {
  const map = new Map<string, any>();
  for (const item of dataArray) {
    const existing = map.get(item.name);
    if (!existing) {
      map.set(item.name, item);
    } else if (item.source === 'XPHB') {
      // Overwrite if new one is XPHB (2024)
      map.set(item.name, item);
    }
  }
  return Array.from(map.values());
};

export interface Spell {
  name: string;
  level: number;
  school: string;
  time: any;
  range: any;
  components: any;
  duration: any;
  entries: string[];
}

export interface Item {
  name: string;
  type: string;
  rarity: string;
  weight: number;
  value: number;
  entries: string[];
}

export const fetchSpells = async (): Promise<Spell[]> => {
  try {
    const [index, classLookup] = await Promise.all([
      fetchJson(`spells/index.json`),
      fetchJson(`generated/gendata-spell-source-lookup.json`).catch(() => null)
    ]);
    const spellPromises = Object.values(index).map((file: any) => fetchJson(`spells/${file}`));
    const spellFiles = await Promise.all(spellPromises);
    const combinedSpells = spellFiles.flatMap((fileData: any) => fileData.spell || []);
    
    // Inject class data
    if (classLookup) {
      for (const spell of combinedSpells) {
        const sourceLower = (spell.source || "").toLowerCase();
        const nameLower = (spell.name || "").toLowerCase();
        const lookup = classLookup[sourceLower]?.[nameLower];
        if (lookup && lookup.class) {
          // Flatten all the books/sources classes into fromClassList
          const classSet = new Set<string>();
          for (const bookSource of Object.keys(lookup.class)) {
            for (const className of Object.keys(lookup.class[bookSource])) {
              classSet.add(className);
            }
          }
          spell.classes = {
            fromClassList: Array.from(classSet).map(name => ({ name }))
          };
        }
      }
    }
    
    return deduplicateData(combinedSpells);
  } catch (error) {
    console.error('Error fetching spells:', error);
    return [];
  }
};

export const fetchItems = async (): Promise<Item[]> => {
  try {
    const [itemsData, baseItemsData, magicVariants] = await Promise.all([
      fetchJson(`items.json`),
      fetchJson(`items-base.json`),
      fetchJson(`magicvariants.json`)
    ]);
    
    const combined = [
      ...(baseItemsData.baseitem || []), 
      ...(itemsData.item || []),
      ...(magicVariants.variant || [])
    ];
    return deduplicateData(combined);
  } catch (error) {
    console.error('Error fetching items:', error);
    return [];
  }
};

export const fetchFeats = async (): Promise<any[]> => {
  try {
    const featsData = await fetchJson(`feats.json`);
    const filteredFeats = featsData.feat || [];
    return deduplicateData(filteredFeats);
  } catch (error) {
    console.error('Error fetching feats:', error);
    return [];
  }
};

export const fetchRaces = async (): Promise<any[]> => {
  try {
    const [data, fluffData] = await Promise.all([
      fetchJson(`races.json`),
      fetchJson(`fluff-races.json`)
    ]);
    
    const filteredRaces = data.race || [];
    const deduplicatedRaces = deduplicateData(filteredRaces);
    
    return deduplicatedRaces.map((r: any) => {
      const fluff = fluffData.raceFluff?.find((f: any) => f.name === r.name && f.source === r.source);
      return {
        ...r,
        description: fluff ? extractText(fluff.entries).substring(0, 300) + '...' : 'A lineage shrouded in mystery.'
      };
    });
  } catch (error) {
    console.error('Error fetching races:', error);
    return [];
  }
};

export const fetchMonsters = async (): Promise<any[]> => {
  try {
    const index = await fetchJson(`bestiary/index.json`);
    const promises = Object.values(index).map((file: any) => fetchJson(`bestiary/${file}`));
    const files = await Promise.all(promises);
    const combined = files.flatMap((fileData: any) => fileData.monster || []);
    return deduplicateData(combined);
  } catch (error) {
    console.error('Error fetching monsters:', error);
    return [];
  }
};

export const fetchConditionsDiseases = async (): Promise<any[]> => {
  try {
    const data = await fetchJson(`conditionsdiseases.json`);
    const combined = [...(data.condition || []), ...(data.disease || []), ...(data.status || [])];
    return deduplicateData(combined);
  } catch (error) {
    console.error('Error fetching conditions/diseases:', error);
    return [];
  }
};

export const fetchActions = async (): Promise<any[]> => {
  try {
    const data = await fetchJson(`actions.json`);
    return deduplicateData(data.action || []);
  } catch (error) {
    console.error('Error fetching actions:', error);
    return [];
  }
};

export const fetchClasses = async (): Promise<any[]> => {
  try {
    const index = await fetchJson(`class/index.json`);
    
    // Fetch all core class files
    const classPromises = Object.values(index)
      .map((file: any) => fetchJson(`class/${file}`));
      
    const classFiles = await Promise.all(classPromises);
    
    const allClasses = classFiles.flatMap((fileData: any) => fileData.class || []);
    const allSubclasses = classFiles.flatMap((fileData: any) => fileData.subclass || []);
    
    const uniqueClasses = deduplicateData(allClasses);
    const uniqueSubclasses = deduplicateData(allSubclasses);

    // attach subclasses to classes
    uniqueClasses.forEach((c: any) => {
       c.subclasses = uniqueSubclasses.filter((sc: any) => 
          sc.className === c.name && sc.classSource === c.source
       );
    });

    return uniqueClasses;
  } catch (error) {
    console.error('Error fetching classes:', error);
    return [];
  }
};

export const fetchBackgrounds = async (): Promise<any[]> => {
  try {
    const [data, fluffData] = await Promise.all([
      fetchJson(`backgrounds.json`),
      fetchJson(`fluff-backgrounds.json`)
    ]);
    
    const filteredBg = data.background || [];
    const deduplicatedBg = deduplicateData(filteredBg);
    
    return deduplicatedBg.map((b: any) => {
      const fluff = fluffData.backgroundFluff?.find((f: any) => f.name === b.name && f.source === b.source);
      return {
        name: b.name,
        source: b.source,
        description: fluff ? extractText(fluff.entries).substring(0, 300) + '...' : 'A mysterious past.',
        benefits: extractText(b.entries).substring(0, 300) + '...'
      };
    });
  } catch (error) {
    console.error('Error fetching backgrounds:', error);
    return [];
  }
};
