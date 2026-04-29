import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data', 'cleaned');
const PUBLIC_DIR = path.join(process.cwd(), 'public');

/**
 * 5e.tools Data Pipeline
 * Ingests raw JSON data from /public, cleans it, and indexes it for the UI combinoboxes.
 */

async function ensureDirs() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function cleanSpell(rawSpell: any) {
  return {
    id: String(rawSpell.name).toLowerCase().replace(/\s+/g, '-'),
    name: rawSpell.name,
    level: rawSpell.level,
    school: rawSpell.school,
    source: rawSpell.source,
    classes: rawSpell.classes?.fromClassList?.map((c: any) => c.name) || [],
    description: rawSpell.entries ? JSON.stringify(rawSpell.entries).substring(0, 200) + '...' : '',
    entries: rawSpell.entries,
    time: rawSpell.time,
    range: rawSpell.range,
    components: rawSpell.components,
    duration: rawSpell.duration
  };
}

function cleanItem(rawItem: any) {
  return {
    id: rawItem.name.toLowerCase().replace(/\s+/g, '-'),
    name: rawItem.name,
    type: rawItem.type || 'gear', // gear, weapon, armor, etc.
    source: rawItem.source,
    weight: rawItem.weight || 0,
    value: rawItem.value || 0,
    rarity: rawItem.rarity || 'none',
    description: rawItem.entries ? JSON.stringify(rawItem.entries).substring(0, 200) + '...' : ''
  };
}

function cleanRace(rawRace: any) {
  return {
    id: rawRace.name.toLowerCase().replace(/\s+/g, '-'),
    name: rawRace.name,
    source: rawRace.source,
    size: rawRace.size || 'M',
    speed: rawRace.speed?.walk || rawRace.speed || 30
  };
}

function cleanBackground(rawBackground: any) {
  return {
    id: rawBackground.name.toLowerCase().replace(/\s+/g, '-'),
    name: rawBackground.name,
    source: rawBackground.source
  };
}

async function processData() {
  await ensureDirs();
  console.log('Building 5e.tools data pipeline...');

  // 1. Spells (Multiple files)
  const spellsDir = path.join(PUBLIC_DIR, 'spells');
  let allSpells: any[] = [];
  try {
    const spellFiles = await fs.readdir(spellsDir);
    for (const file of spellFiles) {
      if (file.startsWith('spells-') && file.endsWith('.json')) {
        const content = await fs.readFile(path.join(spellsDir, file), 'utf8');
        const parsed = JSON.parse(content);
        if (parsed.spell && Array.isArray(parsed.spell)) {
          allSpells.push(...parsed.spell);
        }
      }
    }
  } catch (e: any) {
    console.warn('[WARN] Could not read spell files:', e.message);
  }
  
  const cleanedSpells = allSpells.map(cleanSpell);
  await fs.writeFile(path.join(DATA_DIR, 'spells.json'), JSON.stringify(cleanedSpells, null, 2), 'utf8');
  console.log(`[OK] Indexed ${cleanedSpells.length} spells.`);

  // 2. Items
  const itemsFile = path.join(PUBLIC_DIR, 'items.json');
  let cleanedItems: any[] = [];
  try {
    const itemsContent = await fs.readFile(itemsFile, 'utf8');
    const parsed = JSON.parse(itemsContent);
    if (parsed.item && Array.isArray(parsed.item)) {
      cleanedItems = parsed.item.map(cleanItem);
    }
    await fs.writeFile(path.join(DATA_DIR, 'items.json'), JSON.stringify(cleanedItems, null, 2), 'utf8');
    console.log(`[OK] Indexed ${cleanedItems.length} items.`);
  } catch (e: any) {
    console.warn('[WARN] Could not read items.json:', e.message);
  }

  // 3. Races
  const racesFile = path.join(PUBLIC_DIR, 'races.json');
  let cleanedRaces: any[] = [];
  try {
    const racesContent = await fs.readFile(racesFile, 'utf8');
    const parsed = JSON.parse(racesContent);
    if (parsed.race && Array.isArray(parsed.race)) {
      cleanedRaces = parsed.race.map(cleanRace);
    }
    await fs.writeFile(path.join(DATA_DIR, 'races.json'), JSON.stringify(cleanedRaces, null, 2), 'utf8');
    console.log(`[OK] Indexed ${cleanedRaces.length} races.`);
  } catch (e: any) {
    console.warn('[WARN] Could not read races.json:', e.message);
  }

  // 3.5 Classes (Fallback since 5e.tools subset might not have them here)
  const baseClasses = [
    { id: 'barbarian', name: 'Barbarian', source: 'PHB', hitDice: 'd12' },
    { id: 'bard', name: 'Bard', source: 'PHB', hitDice: 'd8' },
    { id: 'cleric', name: 'Cleric', source: 'PHB', hitDice: 'd8' },
    { id: 'druid', name: 'Druid', source: 'PHB', hitDice: 'd8' },
    { id: 'fighter', name: 'Fighter', source: 'PHB', hitDice: 'd10' },
    { id: 'monk', name: 'Monk', source: 'PHB', hitDice: 'd8' },
    { id: 'paladin', name: 'Paladin', source: 'PHB', hitDice: 'd10' },
    { id: 'ranger', name: 'Ranger', source: 'PHB', hitDice: 'd10' },
    { id: 'rogue', name: 'Rogue', source: 'PHB', hitDice: 'd8' },
    { id: 'sorcerer', name: 'Sorcerer', source: 'PHB', hitDice: 'd6' },
    { id: 'warlock', name: 'Warlock', source: 'PHB', hitDice: 'd8' },
    { id: 'wizard', name: 'Wizard', source: 'PHB', hitDice: 'd6' },
  ];
  await fs.writeFile(path.join(DATA_DIR, 'classes.json'), JSON.stringify(baseClasses, null, 2), 'utf8');
  console.log(`[OK] Indexed ${baseClasses.length} base classes.`);

  // 4. Backgrounds
  const bgFile = path.join(PUBLIC_DIR, 'backgrounds.json');
  let cleanedBackgrounds: any[] = [];
  try {
    const bgContent = await fs.readFile(bgFile, 'utf8');
    const parsed = JSON.parse(bgContent);
    if (parsed.background && Array.isArray(parsed.background)) {
      cleanedBackgrounds = parsed.background.map(cleanBackground);
    }
    await fs.writeFile(path.join(DATA_DIR, 'backgrounds.json'), JSON.stringify(cleanedBackgrounds, null, 2), 'utf8');
    console.log(`[OK] Indexed ${cleanedBackgrounds.length} backgrounds.`);
  } catch (e: any) {
    console.warn('[WARN] Could not read backgrounds.json:', e.message);
  }
}

processData()
  .then(() => console.log('Data pipeline completed successfully.'))
  .catch(err => {
    console.error('Data pipeline encountered an error:', err);
    process.exit(1);
  });
