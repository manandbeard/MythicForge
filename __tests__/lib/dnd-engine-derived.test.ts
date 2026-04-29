import { describe, it, expect } from 'vitest';
import { calculateDerivedStats } from '@/lib/dnd-engine-derived';

const baseChar = () => ({
  id: 'test-1',
  name: 'Test Hero',
  level: 1,
  class: 'Wizard',
  baseStats: { str: 10, dex: 14, con: 12, int: 18, wis: 10, cha: 8 },
  stats: { str: 10, dex: 14, con: 12, int: 18, wis: 10, cha: 8 },
  inventory: [],
  spells: [],
  attacks: [],
  ac: 10,
});

describe('calculateDerivedStats', () => {
  it('returns null/falsy input unchanged', () => {
    expect(calculateDerivedStats(null)).toBeNull();
    expect(calculateDerivedStats(undefined)).toBeUndefined();
  });

  it('sets isRecalculation flag', () => {
    const result = calculateDerivedStats(baseChar());
    expect(result.isRecalculation).toBe(true);
  });

  it('calculates proficiency bonus at level 1', () => {
    const result = calculateDerivedStats(baseChar());
    expect(result.proficiencyBonus).toBe(2);
  });

  it('calculates proficiency bonus at level 5', () => {
    const result = calculateDerivedStats({ ...baseChar(), level: 5 });
    expect(result.proficiencyBonus).toBe(3);
  });

  it('unarmored AC defaults to 10 + dex mod', () => {
    // dex 14 → mod +2, no armor → AC = 10 + 2 = 12
    const result = calculateDerivedStats(baseChar());
    expect(result.ac).toBe(12);
  });

  it('preserves base stats when no items equipped', () => {
    const char = baseChar();
    const result = calculateDerivedStats(char);
    expect(result.stats).toEqual(char.baseStats);
  });

  it('applies stat bonus from equipped item', () => {
    const char = {
      ...baseChar(),
      inventory: [
        {
          id: 'item-1',
          name: 'Gauntlets of Ogre Power',
          isEquipped: true,
          requiresAttunement: false,
          attributeOverrides: { str: 19 },
        },
      ],
    };
    const result = calculateDerivedStats(char);
    expect(result.stats.str).toBe(19);
  });

  it('applies armor AC for equipped armor', () => {
    const char = {
      ...baseChar(),
      inventory: [
        {
          id: 'armor-1',
          name: 'Chain Mail',
          type: 'armor',
          armorType: 'heavy',
          ac: 16,
          isEquipped: true,
          requiresAttunement: false,
        },
      ],
    };
    const result = calculateDerivedStats(char);
    // heavy armor: 16 + 0 (dex capped at 0) = 16
    expect(result.ac).toBe(16);
  });

  it('applies shield bonus on top of armor', () => {
    const char = {
      ...baseChar(),
      inventory: [
        {
          id: 'armor-1',
          name: 'Leather Armor',
          type: 'armor',
          armorType: 'light',
          ac: 11,
          isEquipped: true,
          requiresAttunement: false,
        },
        {
          id: 'shield-1',
          name: 'Shield',
          type: 'shield',
          ac: 2,
          isEquipped: true,
          requiresAttunement: false,
        },
      ],
    };
    const result = calculateDerivedStats(char);
    // light armor: 11 + dexMod(2) + shield(2) = 15
    expect(result.ac).toBe(15);
  });

  it('does not apply unequipped item bonuses', () => {
    const char = {
      ...baseChar(),
      inventory: [
        {
          id: 'item-1',
          name: 'Ring of Protection',
          isEquipped: false,
          requiresAttunement: false,
          acBonus: 1,
        },
      ],
    };
    const result = calculateDerivedStats(char);
    expect(result.ac).toBe(12); // still just 10 + dex(2)
  });

  it('does not apply un-attuned item requiring attunement', () => {
    const char = {
      ...baseChar(),
      inventory: [
        {
          id: 'item-1',
          name: 'Cloak of Protection',
          isEquipped: true,
          requiresAttunement: true,
          isAttuned: false,
          acBonus: 1,
        },
      ],
    };
    const result = calculateDerivedStats(char);
    expect(result.ac).toBe(12);
  });

  it('calculates spellSaveDC for Wizard (INT)', () => {
    // INT 18 → mod +4, PB 2 (level 1), DC = 8 + 2 + 4 = 14
    const result = calculateDerivedStats(baseChar());
    expect(result.spellSaveDC).toBe(14);
  });

  it('calculates spellAttackMod for Wizard (INT)', () => {
    // INT 18 → mod +4, PB 2, total = 6
    const result = calculateDerivedStats(baseChar());
    expect(result.spellAttackMod).toBe(6);
  });

  it('calculates carrying capacity as str * 15', () => {
    const result = calculateDerivedStats(baseChar());
    expect(result.carryingCapacity).toBe(10 * 15);
  });

  it('tracks total weight of inventory', () => {
    const char = {
      ...baseChar(),
      inventory: [
        { id: 'i1', name: 'Sword', weight: 3, quantity: 2, isEquipped: false },
        { id: 'i2', name: 'Potion', weight: 0.5, quantity: 4, isEquipped: false },
      ],
    };
    const result = calculateDerivedStats(char);
    expect(result.totalWeight).toBe(3 * 2 + 0.5 * 4); // 8
  });

  it('marks character as encumbered when over capacity', () => {
    const char = {
      ...baseChar(),
      baseStats: { str: 10, dex: 14, con: 12, int: 18, wis: 10, cha: 8 },
      stats:     { str: 10, dex: 14, con: 12, int: 18, wis: 10, cha: 8 },
      inventory: [
        { id: 'i1', name: 'Boulder', weight: 200, quantity: 1, isEquipped: false },
      ],
    };
    const result = calculateDerivedStats(char);
    expect(result.isEncumbered).toBe(true);
  });

  it('adds weapon attack from equipped weapon', () => {
    const char = {
      ...baseChar(),
      inventory: [
        {
          id: 'wep-1',
          name: 'Longsword',
          type: 'weapon',
          isEquipped: true,
          requiresAttunement: false,
          damageDice: 1,
          damageSides: 8,
          attackBonus: 0,
          damageBonus: 0,
        },
      ],
    };
    const result = calculateDerivedStats(char);
    const weaponAttack = result.attacks.find((a: any) => a.id === 'inv-wep-wep-1');
    expect(weaponAttack).toBeDefined();
    expect(weaponAttack.name).toBe('Longsword');
  });

  it('grants item spells from attuned items to spell list', () => {
    const char = {
      ...baseChar(),
      inventory: [
        {
          id: 'ring-1',
          name: 'Ring of Spell Storing',
          isEquipped: true,
          requiresAttunement: true,
          isAttuned: true,
          attachedSpells: ['Fireball'],
        },
      ],
    };
    const result = calculateDerivedStats(char);
    const fireballSpell = result.spells.find((s: any) => s.name === 'Fireball');
    expect(fireballSpell).toBeDefined();
    expect(fireballSpell.isFromItem).toBe(true);
  });

  it('preserves baseStats separately from computed stats', () => {
    const char = {
      ...baseChar(),
      inventory: [
        {
          id: 'item-1',
          name: 'Belt of Giant Strength',
          isEquipped: true,
          requiresAttunement: false,
          attributeOverrides: { str: 21 },
        },
      ],
    };
    const result = calculateDerivedStats(char);
    expect(result.baseStats.str).toBe(10);
    expect(result.stats.str).toBe(21);
  });
});
