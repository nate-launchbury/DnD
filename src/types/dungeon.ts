export interface Dungeon {
  id: string
  name: string
  theme: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard' | 'deadly'
  playerLevel: number
  partySize: number
  rooms: Room[]
  map: DungeonMap
}

export interface DungeonMap {
  width: number
  height: number
  grid: Cell[][]
}

export type CellType = 'empty' | 'wall' | 'floor' | 'door' | 'water' | 'stairs'

export interface Cell {
  type: CellType
  roomId: string | null
}

export interface Room {
  id: string
  name: string
  readAloud: string
  dmNotes: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  enemies: Enemy[]
  npcs: NPC[]
  loot: Item[]
  connections: string[]
}

export interface Enemy {
  id: string
  name: string
  hp: number
  maxHp: number
  ac: number
  speed: string
  attacks: Attack[]
  abilities?: string[]
  cr: string
}

export interface Attack {
  name: string
  toHit: number
  damage: string
  reach?: string
  description?: string
}

export interface NPC {
  id: string
  name: string
  occupation: string
  description: string
  dmNotes: string
  voice?: string
  demeanor?: string
  goals?: string
}

export interface Item {
  id: string
  name: string
  description: string
  value?: number
  magical?: boolean
  category?: 'weapon' | 'armor' | 'shield' | 'consumable' | 'gear' | 'treasure'
  attackBonus?: number
  damage?: string
  damageType?: string
  weaponProperties?: string[]
  armorClass?: number
  armorType?: 'light' | 'medium' | 'heavy'
}
