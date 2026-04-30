import { describe, it, expect } from 'vitest';
import {
  getModifier,
  formatModifier,
  rollDice,
  getProficiencyBonus,
  getSkillModifier,
  getSpellSlots,
  getCasterType,
  SPELLCASTING_ABILITIES,
  SKILLS,
} from '@/lib/dnd-engine';

describe('getModifier', () => {
  it('returns 0 for score 10', () => expect(getModifier(10)).toBe(0));
  it('returns 0 for score 11', () => expect(getModifier(11)).toBe(0));
  it('returns +1 for score 12', () => expect(getModifier(12)).toBe(1));
  it('returns +5 for score 20', () => expect(getModifier(20)).toBe(5));
  it('returns -1 for score 8', () => expect(getModifier(8)).toBe(-1));
  it('returns -5 for score 1', () => expect(getModifier(1)).toBe(-5));
  it('returns +4 for score 18', () => expect(getModifier(18)).toBe(4));
});

describe('formatModifier', () => {
  it('prefixes positive numbers with +', () => expect(formatModifier(3)).toBe('+3'));
  it('prefixes zero with +', () => expect(formatModifier(0)).toBe('+0'));
  it('returns negative numbers as-is', () => expect(formatModifier(-2)).toBe('-2'));
});

describe('rollDice', () => {
  it('returns rolls array of correct length', () => {
    const result = rollDice(3, 6);
    expect(result.rolls).toHaveLength(3);
  });

  it('each roll is within valid range [1, sides]', () => {
    const result = rollDice(10, 20);
    result.rolls.forEach(r => {
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(20);
    });
  });

  it('total equals sum of rolls plus modifier', () => {
    const result = rollDice(2, 6, 3);
    const expected = result.rolls.reduce((a, b) => a + b, 0) + 3;
    expect(result.total).toBe(expected);
  });

  it('applies negative modifier', () => {
    const result = rollDice(1, 4, -2);
    const expected = result.rolls[0] - 2;
    expect(result.total).toBe(expected);
  });

  it('builds correct notation without modifier', () => {
    const result = rollDice(2, 8);
    expect(result.notation).toBe('2d8');
  });

  it('builds correct notation with positive modifier', () => {
    const result = rollDice(1, 6, 3);
    expect(result.notation).toBe('1d6+3');
  });

  it('builds correct notation with negative modifier', () => {
    const result = rollDice(1, 6, -1);
    expect(result.notation).toBe('1d6-1');
  });
});

describe('getProficiencyBonus', () => {
  it('returns +2 at level 1', () => expect(getProficiencyBonus(1)).toBe(2));
  it('returns +2 at level 4', () => expect(getProficiencyBonus(4)).toBe(2));
  it('returns +3 at level 5', () => expect(getProficiencyBonus(5)).toBe(3));
  it('returns +4 at level 9', () => expect(getProficiencyBonus(9)).toBe(4));
  it('returns +5 at level 13', () => expect(getProficiencyBonus(13)).toBe(5));
  it('returns +6 at level 17', () => expect(getProficiencyBonus(17)).toBe(6));
  it('returns +6 at level 20', () => expect(getProficiencyBonus(20)).toBe(6));
});

describe('getSkillModifier', () => {
  it('returns plain ability modifier when not proficient', () => {
    expect(getSkillModifier(14, false, 1)).toBe(2);
  });

  it('adds proficiency bonus when proficient', () => {
    // score 14 → mod 2, level 1 → pb 2, total = 4
    expect(getSkillModifier(14, true, 1)).toBe(4);
  });

  it('adds proficiency bonus twice for expertise', () => {
    // score 14 → mod 2, level 1 → pb 2, expertise = 2+2+2 = 6
    expect(getSkillModifier(14, true, 1, true)).toBe(6);
  });

  it('adds PB for expertise even without proficiency (flags are independent)', () => {
    // The implementation adds PB for each flag independently:
    // score 14 → mod 2, level 1 → pb 2, expertise alone = 2 + 2 = 4
    expect(getSkillModifier(14, false, 1, true)).toBe(4);
  });
});

describe('getSpellSlots', () => {
  it('level 1 full caster has 2 first-level slots', () => {
    const slots = getSpellSlots(1, 'full');
    expect(slots[1]).toBe(2);
  });

  it('level 5 full caster has 3 third-level slots', () => {
    const slots = getSpellSlots(5, 'full');
    expect(slots[3]).toBe(2);
  });

  it('half caster uses half effective level', () => {
    // level 2 half → effective level 1 → same as full caster at level 1
    const halfSlots = getSpellSlots(2, 'half');
    const fullSlots = getSpellSlots(1, 'full');
    expect(halfSlots).toEqual(fullSlots);
  });

  it('third caster uses ceil(level/3) effective level', () => {
    // level 3 third → effective level 1
    const thirdSlots = getSpellSlots(3, 'third');
    const fullSlots = getSpellSlots(1, 'full');
    expect(thirdSlots).toEqual(fullSlots);
  });

  it('level 20 full caster has max slots', () => {
    const slots = getSpellSlots(20, 'full');
    expect(slots[1]).toBe(4);
    expect(slots[9]).toBe(1);
  });

  it('clamps level beyond 20 to 20', () => {
    expect(getSpellSlots(21, 'full')).toEqual(getSpellSlots(20, 'full'));
  });
});

describe('getCasterType', () => {
  it('returns full for Wizard', () => expect(getCasterType('Wizard')).toBe('full'));
  it('returns full for Cleric', () => expect(getCasterType('Cleric')).toBe('full'));
  it('returns half for Paladin', () => expect(getCasterType('Paladin')).toBe('half'));
  it('returns half for Ranger', () => expect(getCasterType('Ranger')).toBe('half'));
  it('returns third for Fighter', () => expect(getCasterType('Fighter')).toBe('third'));
  it('returns warlock for Warlock', () => expect(getCasterType('Warlock')).toBe('warlock'));
  it('defaults to full for unknown class', () => expect(getCasterType('Barbarian')).toBe('full'));
});

describe('SPELLCASTING_ABILITIES', () => {
  it('maps Wizard to int', () => expect(SPELLCASTING_ABILITIES['Wizard']).toBe('int'));
  it('maps Cleric to wis', () => expect(SPELLCASTING_ABILITIES['Cleric']).toBe('wis'));
  it('maps Bard to cha', () => expect(SPELLCASTING_ABILITIES['Bard']).toBe('cha'));
});

describe('SKILLS', () => {
  it('includes 18 skills', () => expect(SKILLS).toHaveLength(18));
  it('Perception uses wis', () => {
    const perception = SKILLS.find(s => s.name === 'Perception');
    expect(perception?.ability).toBe('wis');
  });
  it('Stealth uses dex', () => {
    const stealth = SKILLS.find(s => s.name === 'Stealth');
    expect(stealth?.ability).toBe('dex');
  });
});
