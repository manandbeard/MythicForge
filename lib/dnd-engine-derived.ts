import { 
  getModifier, 
  getProficiencyBonus, 
  getSpellSlots, 
  getCasterType, 
  SPELLCASTING_ABILITIES 
} from './dnd-engine';

export const calculateDerivedStats = (char: any) => {
  if (!char) return char;
  
  // 1. Ensure baseStats exists
  const baseStats = char.baseStats || { ...char.stats };
  
  // 2. Start recalc
  const newStats = { ...baseStats };
  const bonuses = { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 };
  const overrides = { str: -1, dex: -1, con: -1, int: -1, wis: -1, cha: -1 };
  
  // 3. Scan inventory for active items
  const inventory = char.inventory || [];
  const activeItems = inventory.filter((item: any) => 
    item.isEquipped && (!item.requiresAttunement || item.isAttuned)
  );

  let totalWeight = 0;
  inventory.forEach((item: any) => {
    if (item.weight) {
      totalWeight += (item.weight * (item.quantity || 1));
    }
  });

  let armorAc = 0; // if 0, unarmored
  let shieldAc = 0;
  let bonusAc = 0;
  let dexLimit = Infinity;

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
    
    // AC Calculations
    if (item.type === 'armor') {
        const baseArmorAc = item.ac || 10;
        if (baseArmorAc > armorAc) {
             armorAc = baseArmorAc;
             // Light: Infinity, Medium: 2, Heavy: 0
             if (item.armorType === 'heavy') dexLimit = 0;
             else if (item.armorType === 'medium') dexLimit = 2;
             else dexLimit = Infinity;
        }
    } else if (item.type === 'shield') {
        shieldAc = Math.max(shieldAc, item.ac || 2);
    }
    if (item.acBonus) {
        bonusAc += item.acBonus;
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

  // Derived AC
  const dexMod = getModifier(newStats.dex);
  const effectiveDexMod = Math.min(dexMod, dexLimit);
  const calculatedAc = (armorAc || 10) + (armorAc === 0 ? dexMod : effectiveDexMod) + shieldAc + bonusAc;
  // If baseAc is defined use it, otherwise use char.ac ONLY IF there's no calculated armor to avoid sticky AC
  // If unarmored, default to char.ac if it exists and is > calculated.
  const naturalAc = char.baseAc || (armorAc === 0 && shieldAc === 0 ? (char.ac || 10) : 10);
  const finalAc = Math.max(naturalAc, calculatedAc);

  // Encumbrance
  const carryingCapacity = newStats.str * 15;
  const isEncumbered = totalWeight > carryingCapacity;

  // 4. Sync Spells from items
  const characterSpells = char.spells || [];
  const baseSpells = characterSpells.filter((s: any) => !s.isFromItem);
  const itemSpells: any[] = [];
  
  activeItems.forEach((item: any) => {
    if (item.attachedSpells && item.attachedSpells.length > 0) {
      item.attachedSpells.forEach((spellName: string) => {
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

  const currentLevel = char.level || 1;
  const pb = getProficiencyBonus(currentLevel);

  // 6. Sync Attacks from items
  const baseAttacks = char.attacks || [];
  const itemAttacks: any[] = [];
  const strMod = getModifier(newStats.str);
  const bestPhysicalMod = Math.max(strMod, dexMod); // naive finesse handling

  activeItems.forEach((item: any) => {
    if (item.type === 'weapon') {
      const wepAttBonus = (item.attackBonus || 0) + pb + bestPhysicalMod;
      const wepDmgBonus = (item.damageBonus || 0) + bestPhysicalMod;
      const bstr = wepDmgBonus !== 0 ? (wepDmgBonus > 0 ? `+${wepDmgBonus}` : wepDmgBonus.toString()) : '';
      itemAttacks.push({
        id: `inv-wep-${item.id}`,
        name: item.name,
        range: 'Melee/Ranged',
        type: 'Weapon',
        bonus: wepAttBonus,
        damageDice: item.damageDice || 1,
        damageSides: item.damageSides || 8,
        damageBonus: wepDmgBonus,
        damage: `${item.damageDice || 1}d${item.damageSides || 8}${bstr}`,
      });
    }
  });

  const allAttacks = [...baseAttacks, ...itemAttacks];

  // 7. Spellcasting Stats
  const charClass = char.class || 'Wizard';
  const spellAbility = SPELLCASTING_ABILITIES[charClass] || 'int';
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
    attacks: allAttacks,
    spellSaveDC,
    spellAttackMod,
    proficiencyBonus: pb,
    maxSpellSlots: maxSlots,
    ac: finalAc, // override character.ac with calculated
    calculatedAc,
    totalWeight,
    carryingCapacity,
    isEncumbered,
    isRecalculation: true
  };
};
