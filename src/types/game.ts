export interface TravelState {
  fromId: string
  toId: string
  totalDays: number
  currentDay: number
  activeEventId: string | null
}

export interface InitiativeEntry {
  id: string
  type: 'player' | 'enemy'
  name: string
  roll: number
}

export interface InitiativeState {
  entries: InitiativeEntry[]
  currentIndex: number
  movementRemaining: number
  round: number
}

export interface GameState {
  phase: 'setup' | 'playing' | 'paused' | 'traveling'
  dungeonId: string
  revealedRooms: Set<string>
  currentRoomId: string | null
  players: Player[]
  chatLog: ChatMessage[]
  combatActive: boolean
  defeatedEnemies: Set<string>
  collectedLoot: Set<string>
  playerLogs: Record<string, PlayerLogEntry[]>
  enemyPositions: Record<string, { x: number; y: number }>
  enemyHp: Record<string, number>
  lootPositions: Record<string, { x: number; y: number }>
  currentLocationId: string | null
  discoveredLocationIds: Set<string>
  travel: TravelState | null
  initiative: InitiativeState | null
  visionDistanceFt: number
  exploredCells: Set<string>
  diceRolls: DiceRollResult[]
}

export interface AbilityScores {
  str: number
  dex: number
  con: number
  int: number
  wis: number
  cha: number
}

export interface Skills {
  acrobatics: number
  animalHandling: number
  arcana: number
  athletics: number
  deception: number
  history: number
  insight: number
  intimidation: number
  investigation: number
  medicine: number
  nature: number
  perception: number
  performance: number
  persuasion: number
  religion: number
  sleightOfHand: number
  stealth: number
  survival: number
}

export interface Resource {
  name: string
  current: number
  max: number
}

export interface Weapon {
  name: string
  attackBonus: number
  damage: string
  damageType: string
  properties?: string[]
  equipped: boolean
}

export interface ArmorItem {
  name: string
  armorClass: number
  type: 'light' | 'medium' | 'heavy' | 'shield'
  equipped: boolean
  stealthDisadvantage?: boolean
  strRequirement?: number
}

export type ItemCategory = 'weapon' | 'armor' | 'shield' | 'consumable' | 'gear' | 'treasure'

export interface InventoryItem {
  id: string
  name: string
  description: string
  category: ItemCategory
  value?: number
  magical?: boolean
  attackBonus?: number
  damage?: string
  damageType?: string
  weaponProperties?: string[]
  armorClass?: number
  armorType?: 'light' | 'medium' | 'heavy'
}

export interface Player {
  id: string
  name: string
  characterName: string
  characterClass: string
  level: number
  tokenColor: string
  position: { x: number; y: number }
  hp: number
  maxHp: number
  ac: number
  speed: number
  initiative: number
  proficiencyBonus: number
  hitDice: string
  passivePerception: number
  abilities: AbilityScores
  skills: Skills
  skillProficiencies: string[]
  resources: Resource[]
  weapons: Weapon[]
  armor: ArmorItem[]
  inventory: InventoryItem[]
}

export type ChatMessageType = 'narration' | 'golden' | 'dm_note' | 'player' | 'system' | 'combat' | 'dice'

export interface ChatMessage {
  id: string
  type: ChatMessageType
  sender: string
  text: string
  timestamp: number
  roomId?: string
}

export interface PlayerLogEntry {
  id: string
  type: 'loot' | 'damage' | 'heal' | 'event'
  text: string
  timestamp: number
}

export interface DiceRollResult {
  id: string
  playerId: string
  playerName: string
  characterName: string
  tokenColor: string
  formula: string
  rolls: { sides: number; value: number }[]
  modifier: number
  modifierLabel: string
  total: number
  timestamp: number
}
