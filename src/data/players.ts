import type { Player } from '../types/game'

export const DEFAULT_PLAYERS: Player[] = [
  {
    id: 'p1', name: 'Player 1', characterName: 'Aldric', characterClass: 'Paladin', level: 5,
    tokenColor: '#e74c3c', position: { x: 0, y: 0 }, hp: 38, maxHp: 38,
    ac: 18, speed: 30, initiative: 0, proficiencyBonus: 3, hitDice: '5d10', passivePerception: 11,
    abilities: { str: 16, dex: 10, con: 14, int: 8, wis: 12, cha: 15 },
    skills: {
      acrobatics: 0, animalHandling: 1, arcana: -1, athletics: 6, deception: 2,
      history: -1, insight: 1, intimidation: 5, investigation: -1, medicine: 1,
      nature: -1, perception: 1, performance: 2, persuasion: 5, religion: 2,
      sleightOfHand: 0, stealth: 0, survival: 1,
    },
    skillProficiencies: ['athletics', 'intimidation', 'persuasion', 'religion'],
    resources: [
      { name: 'Lay on Hands', current: 25, max: 25 },
      { name: 'Divine Sense', current: 3, max: 3 },
      { name: '1st Level Slots', current: 4, max: 4 },
      { name: '2nd Level Slots', current: 2, max: 2 },
    ],
    weapons: [
      { name: 'Longsword', attackBonus: 6, damage: '1d8+3', damageType: 'slashing', properties: ['versatile (1d10+3)'], equipped: true },
      { name: 'Javelin', attackBonus: 6, damage: '1d6+3', damageType: 'piercing', properties: ['thrown (30/120)'], equipped: false },
    ],
    armor: [
      { name: 'Chain Mail', armorClass: 16, type: 'heavy', equipped: true },
      { name: 'Shield', armorClass: 2, type: 'shield', equipped: true },
    ],
    inventory: [],
  },
  {
    id: 'p2', name: 'Player 2', characterName: 'Brynn', characterClass: 'Ranger', level: 5,
    tokenColor: '#3498db', position: { x: 0, y: 0 }, hp: 33, maxHp: 33,
    ac: 15, speed: 30, initiative: 3, proficiencyBonus: 3, hitDice: '5d10', passivePerception: 16,
    abilities: { str: 12, dex: 16, con: 12, int: 10, wis: 14, cha: 8 },
    skills: {
      acrobatics: 3, animalHandling: 5, arcana: 0, athletics: 1, deception: -1,
      history: 0, insight: 2, intimidation: -1, investigation: 3, medicine: 2,
      nature: 3, perception: 5, performance: -1, persuasion: -1, religion: 0,
      sleightOfHand: 3, stealth: 6, survival: 5,
    },
    skillProficiencies: ['animalHandling', 'investigation', 'nature', 'perception', 'stealth', 'survival'],
    resources: [
      { name: '1st Level Slots', current: 4, max: 4 },
      { name: '2nd Level Slots', current: 2, max: 2 },
    ],
    weapons: [
      { name: 'Longbow', attackBonus: 6, damage: '1d8+3', damageType: 'piercing', properties: ['ammunition (150/600)', 'two-handed'], equipped: true },
      { name: 'Shortsword', attackBonus: 6, damage: '1d6+3', damageType: 'piercing', properties: ['finesse', 'light'], equipped: false },
    ],
    armor: [
      { name: 'Studded Leather', armorClass: 15, type: 'light', equipped: true },
    ],
    inventory: [],
  },
  {
    id: 'p3', name: 'Player 3', characterName: 'Cael', characterClass: 'Wizard', level: 5,
    tokenColor: '#2ecc71', position: { x: 0, y: 0 }, hp: 28, maxHp: 28,
    ac: 12, speed: 30, initiative: 2, proficiencyBonus: 3, hitDice: '5d6', passivePerception: 12,
    abilities: { str: 8, dex: 14, con: 12, int: 18, wis: 13, cha: 10 },
    skills: {
      acrobatics: 2, animalHandling: 1, arcana: 7, athletics: -1, deception: 0,
      history: 7, insight: 1, intimidation: 0, investigation: 7, medicine: 1,
      nature: 4, perception: 1, performance: 0, persuasion: 0, religion: 4,
      sleightOfHand: 2, stealth: 2, survival: 1,
    },
    skillProficiencies: ['arcana', 'history', 'investigation'],
    resources: [
      { name: 'Arcane Recovery', current: 1, max: 1 },
      { name: '1st Level Slots', current: 4, max: 4 },
      { name: '2nd Level Slots', current: 3, max: 3 },
      { name: '3rd Level Slots', current: 2, max: 2 },
    ],
    weapons: [
      { name: 'Fire Bolt', attackBonus: 7, damage: '2d10', damageType: 'fire', properties: ['cantrip', 'range 120ft'], equipped: true },
      { name: 'Quarterstaff', attackBonus: 2, damage: '1d6-1', damageType: 'bludgeoning', properties: ['versatile (1d8-1)'], equipped: false },
      { name: 'Dagger', attackBonus: 5, damage: '1d4+2', damageType: 'piercing', properties: ['finesse', 'light', 'thrown (20/60)'], equipped: false },
    ],
    armor: [
      { name: 'No Armor (Robes)', armorClass: 12, type: 'light', equipped: true },
    ],
    inventory: [],
  },
  {
    id: 'p4', name: 'Player 4', characterName: 'Dara', characterClass: 'Cleric', level: 5,
    tokenColor: '#f39c12', position: { x: 0, y: 0 }, hp: 45, maxHp: 45,
    ac: 16, speed: 30, initiative: 1, proficiencyBonus: 3, hitDice: '5d8', passivePerception: 15,
    abilities: { str: 14, dex: 12, con: 16, int: 10, wis: 18, cha: 11 },
    skills: {
      acrobatics: 1, animalHandling: 4, arcana: 0, athletics: 2, deception: 0,
      history: 3, insight: 7, intimidation: 0, investigation: 0, medicine: 7,
      nature: 0, perception: 4, performance: 0, persuasion: 3, religion: 3,
      sleightOfHand: 1, stealth: 1, survival: 4,
    },
    skillProficiencies: ['history', 'insight', 'medicine', 'persuasion', 'religion'],
    resources: [
      { name: 'Channel Divinity', current: 1, max: 1 },
      { name: '1st Level Slots', current: 4, max: 4 },
      { name: '2nd Level Slots', current: 3, max: 3 },
      { name: '3rd Level Slots', current: 2, max: 2 },
    ],
    weapons: [
      { name: 'Mace', attackBonus: 5, damage: '1d6+2', damageType: 'bludgeoning', equipped: true },
      { name: 'Sacred Flame', attackBonus: 0, damage: '2d8', damageType: 'radiant', properties: ['cantrip', 'DEX save DC 15'], equipped: false },
    ],
    armor: [
      { name: 'Chain Shirt', armorClass: 14, type: 'medium', equipped: true },
      { name: 'Shield', armorClass: 2, type: 'shield', equipped: true },
    ],
    inventory: [],
  },
]
