export type Ability = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

export const getModifier = (score: number): number => {
  return Math.floor((score - 10) / 2);
};

export const formatModifier = (mod: number): string => {
  return mod >= 0 ? `+${mod}` : `${mod}`;
};

export interface RollResult {
  total: number;
  rolls: number[];
  modifier: number;
  notation: string;
}

export const rollDice = (dice: number, sides: number, modifier: number = 0): RollResult => {
  const rolls: number[] = [];
  for (let i = 0; i < dice; i++) {
    rolls.push(Math.floor(Math.random() * sides) + 1);
  }
  const total = rolls.reduce((a, b) => a + b, 0) + modifier;
  return {
    total,
    rolls,
    modifier,
    notation: `${dice}d${sides}${modifier !== 0 ? (modifier > 0 ? `+${modifier}` : modifier) : ''}`,
  };
};

export const getProficiencyBonus = (level: number): number => {
  return Math.ceil(level / 4) + 1;
};

export const SPELLCASTING_ABILITIES: { [key: string]: Ability } = {
  'Wizard': 'int',
  'Sorcerer': 'cha',
  'Bard': 'cha',
  'Warlock': 'cha',
  'Paladin': 'cha',
  'Cleric': 'wis',
  'Druid': 'wis',
  'Ranger': 'wis',
  'Artificer': 'int',
};

export type CasterType = 'full' | 'half' | 'third' | 'warlock';

export const getSpellSlots = (level: number, type: CasterType = 'full'): number[] => {
  // Full Caster Slots (Wizard, Cleric, etc)
  const fullCasterTable: number[][] = [
    [0, 2, 0, 0, 0, 0, 0, 0, 0, 0], // Level 1 (index 0 is cantrips placeholder or ignore)
    [0, 3, 0, 0, 0, 0, 0, 0, 0, 0], // Level 2
    [0, 4, 2, 0, 0, 0, 0, 0, 0, 0], // Level 3
    [0, 4, 3, 0, 0, 0, 0, 0, 0, 0], // Level 4
    [0, 4, 3, 2, 0, 0, 0, 0, 0, 0], // Level 5
    [0, 4, 3, 3, 0, 0, 0, 0, 0, 0], // Level 6
    [0, 4, 3, 3, 1, 0, 0, 0, 0, 0], // Level 7
    [0, 4, 3, 3, 2, 0, 0, 0, 0, 0], // Level 8
    [0, 4, 3, 3, 3, 1, 0, 0, 0, 0], // Level 9
    [0, 4, 3, 3, 3, 2, 0, 0, 0, 0], // Level 10
    [0, 4, 3, 3, 3, 2, 1, 0, 0, 0], // Level 11
    [0, 4, 3, 3, 3, 2, 1, 0, 0, 0], // Level 12
    [0, 4, 3, 3, 3, 2, 1, 1, 0, 0], // Level 13
    [0, 4, 3, 3, 3, 2, 1, 1, 0, 0], // Level 14
    [0, 4, 3, 3, 3, 2, 1, 1, 1, 0], // Level 15
    [0, 4, 3, 3, 3, 2, 1, 1, 1, 0], // Level 16
    [0, 4, 3, 3, 3, 2, 1, 1, 1, 1], // Level 17
    [0, 4, 3, 3, 3, 3, 1, 1, 1, 1], // Level 18
    [0, 4, 3, 3, 3, 3, 2, 1, 1, 1], // Level 19
    [0, 4, 3, 3, 3, 3, 2, 2, 1, 1], // Level 20
  ];

  if (type === 'warlock') {
     // Warlocks are special, but for now we'll just handle basic 1-5 level slots or simplify
     // Let's just return a standard progression for full casters and handle others later if needed
     return fullCasterTable[Math.min(level - 1, 19)];
  }

  const effectiveLevel = type === 'half' ? Math.ceil(level / 2) : type === 'third' ? Math.ceil(level / 3) : level;
  return fullCasterTable[Math.min(effectiveLevel - 1, 19)];
};

export const getCasterType = (className: string): CasterType => {
  const full = ['Wizard', 'Sorcerer', 'Bard', 'Cleric', 'Druid'];
  const half = ['Paladin', 'Ranger', 'Artificer'];
  const third = ['Fighter', 'Rogue']; // Arcane Trickster/Eldritch Knight
  const special = ['Warlock'];

  if (full.includes(className)) return 'full';
  if (half.includes(className)) return 'half';
  if (third.includes(className)) return 'third';
  if (special.includes(className)) return 'warlock';
  return 'full'; // Default
};

export const getSkillModifier = (
  abilityScore: number,
  isProficient: boolean,
  level: number,
  isExpertise: boolean = false
): number => {
  let mod = getModifier(abilityScore);
  const pb = getProficiencyBonus(level);
  if (isProficient) mod += pb;
  if (isExpertise) mod += pb;
  return mod;
};

export const ABILITIES: { [key in Ability]: string } = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
};

export const SKILLS = [
  { name: 'Acrobatics', ability: 'dex' },
  { name: 'Animal Handling', ability: 'wis' },
  { name: 'Arcana', ability: 'int' },
  { name: 'Athletics', ability: 'str' },
  { name: 'Deception', ability: 'cha' },
  { name: 'History', ability: 'int' },
  { name: 'Insight', ability: 'wis' },
  { name: 'Intimidation', ability: 'cha' },
  { name: 'Investigation', ability: 'int' },
  { name: 'Medicine', ability: 'wis' },
  { name: 'Nature', ability: 'int' },
  { name: 'Perception', ability: 'wis' },
  { name: 'Performance', ability: 'cha' },
  { name: 'Persuasion', ability: 'cha' },
  { name: 'Religion', ability: 'int' },
  { name: 'Sleight of Hand', ability: 'dex' },
  { name: 'Stealth', ability: 'dex' },
  { name: 'Survival', ability: 'wis' },
] as const;
