import type { GameState, TravelState, InitiativeState, DiceRollResult } from '../types/game'

const STORAGE_KEY = 'dnd-game-state'

export interface SerializedGameState {
  phase: GameState['phase']
  dungeonId: string
  revealedRooms: string[]
  currentRoomId: string | null
  players: GameState['players']
  chatLog: GameState['chatLog']
  combatActive: boolean
  defeatedEnemies: string[]
  collectedLoot: string[]
  playerLogs: GameState['playerLogs']
  enemyPositions: GameState['enemyPositions']
  enemyHp: GameState['enemyHp']
  lootPositions: GameState['lootPositions']
  currentLocationId: string | null
  discoveredLocationIds: string[]
  travel: TravelState | null
  visionDistanceFt: number
  initiative: InitiativeState | null
  exploredCells: string[]
  diceRolls: DiceRollResult[]
}

export function serializeGameState(state: GameState): SerializedGameState {
  return {
    phase: state.phase,
    dungeonId: state.dungeonId,
    revealedRooms: Array.from(state.revealedRooms),
    currentRoomId: state.currentRoomId,
    players: state.players,
    chatLog: state.chatLog,
    combatActive: state.combatActive,
    defeatedEnemies: Array.from(state.defeatedEnemies),
    collectedLoot: Array.from(state.collectedLoot),
    playerLogs: state.playerLogs,
    enemyPositions: state.enemyPositions,
    enemyHp: state.enemyHp,
    lootPositions: state.lootPositions,
    currentLocationId: state.currentLocationId,
    discoveredLocationIds: Array.from(state.discoveredLocationIds),
    travel: state.travel,
    visionDistanceFt: state.visionDistanceFt,
    initiative: state.initiative,
    exploredCells: Array.from(state.exploredCells),
    diceRolls: state.diceRolls ?? [],
  }
}

export function deserializeGameState(data: SerializedGameState): GameState {
  return {
    phase: data.phase,
    dungeonId: data.dungeonId,
    revealedRooms: new Set(data.revealedRooms),
    currentRoomId: data.currentRoomId,
    players: data.players.map(p => ({
      ...p,
      inventory: p.inventory ?? [],
    })),
    chatLog: data.chatLog,
    combatActive: data.combatActive,
    defeatedEnemies: new Set(data.defeatedEnemies),
    collectedLoot: new Set(data.collectedLoot),
    playerLogs: data.playerLogs,
    enemyPositions: data.enemyPositions,
    enemyHp: data.enemyHp ?? {},
    lootPositions: data.lootPositions ?? {},
    currentLocationId: data.currentLocationId ?? null,
    discoveredLocationIds: new Set(data.discoveredLocationIds ?? []),
    travel: data.travel ?? null,
    visionDistanceFt: data.visionDistanceFt ?? 30,
    initiative: data.initiative ?? null,
    exploredCells: new Set(data.exploredCells ?? []),
    diceRolls: data.diceRolls ?? [],
  }
}

interface PersistedSession {
  gameState: SerializedGameState
  role: 'dm' | 'player'
  playerId: string | null
}

export function saveSession(
  role: 'dm' | 'player',
  playerId: string | null
): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ role, playerId }))
  } catch { /* silently fail */ }
}

export function loadSession(): { role: 'dm' | 'player'; playerId: string | null } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (data.role) return { role: data.role, playerId: data.playerId ?? null }
    // Legacy format had gameState embedded -- just extract role
    if ((data as PersistedSession).gameState) return { role: data.role, playerId: data.playerId ?? null }
    return null
  } catch {
    return null
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch { /* silently fail */ }
}
