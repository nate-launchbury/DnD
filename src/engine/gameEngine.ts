import type { Dungeon, Room, Item } from '../types/dungeon'
import type { GameState, ChatMessage, Player, PlayerLogEntry, InitiativeEntry, InitiativeState, InventoryItem, Weapon, ArmorItem, DiceRollResult } from '../types/game'
import type { Campaign, CampaignRoute } from '../types/campaign'

let counter = 0
function nextId(): string {
  return `msg-${Date.now()}-${++counter}`
}

function nextLogId(): string {
  return `log-${Date.now()}-${++counter}`
}

function initPlayerLogs(players: Player[]): Record<string, PlayerLogEntry[]> {
  const logs: Record<string, PlayerLogEntry[]> = {}
  for (const p of players) {
    logs[p.id] = []
  }
  return logs
}

function addToPlayerLog(
  logs: Record<string, PlayerLogEntry[]>,
  playerId: string,
  type: PlayerLogEntry['type'],
  text: string
): Record<string, PlayerLogEntry[]> {
  const entry: PlayerLogEntry = { id: nextLogId(), type, text, timestamp: Date.now() }
  return {
    ...logs,
    [playerId]: [...(logs[playerId] || []), entry]
  }
}

function addToAllPlayerLogs(
  logs: Record<string, PlayerLogEntry[]>,
  playerIds: string[],
  type: PlayerLogEntry['type'],
  text: string
): Record<string, PlayerLogEntry[]> {
  let result = { ...logs }
  for (const id of playerIds) {
    result = addToPlayerLog(result, id, type, text)
  }
  return result
}

export function createInitialState(dungeon: Dungeon, players: Player[]): GameState {
  const entrance = dungeon.rooms[0]
  const centerX = entrance.position.x + Math.floor(entrance.size.width / 2)
  const centerY = entrance.position.y + Math.floor(entrance.size.height / 2)

  const positionedPlayers = players.map((p, i) => ({
    ...p,
    position: { x: centerX + (i % 2), y: centerY + Math.floor(i / 2) }
  }))

  const playerIds = positionedPlayers.map(p => p.id)
  let logs = initPlayerLogs(positionedPlayers)
  logs = addToAllPlayerLogs(logs, playerIds, 'event', `Entered: ${entrance.name}`)

  const enemyPositions = seedEnemyPositions(dungeon)
  const enemyHp = seedEnemyHp(dungeon)
  const lootPositions = seedLootPositions(dungeon)

  const state: GameState = {
    phase: 'playing',
    dungeonId: dungeon.id,
    revealedRooms: new Set([entrance.id]),
    currentRoomId: entrance.id,
    players: positionedPlayers,
    chatLog: [],
    combatActive: false,
    defeatedEnemies: new Set(),
    collectedLoot: new Set(),
    playerLogs: logs,
    enemyPositions,
    enemyHp,
    lootPositions,
    currentLocationId: null,
    discoveredLocationIds: new Set(),
    travel: null,
    initiative: null,
    visionDistanceFt: 30,
    exploredCells: new Set<string>(),
    diceRolls: [],
  }

  const initialVisible = computeVisibleCells(
    dungeon, state.revealedRooms, positionedPlayers, state.visionDistanceFt / 5
  )
  for (const key of initialVisible) state.exploredCells.add(key)

  state.chatLog.push(
    systemMessage(`Entering: ${dungeon.name}`),
    systemMessage(dungeon.description),
    goldenMessage(entrance.readAloud, entrance.id)
  )

  if (entrance.enemies.length > 0) {
    state.chatLog.push(combatMessage(entrance))
  }

  return state
}

export function movePlayer(
  state: GameState,
  dungeon: Dungeon,
  playerId: string,
  x: number,
  y: number
): { state: GameState; messages: ChatMessage[] } {
  if (state.initiative) {
    const current = state.initiative.entries[state.initiative.currentIndex]
    if (current.type !== 'player' || current.id !== playerId) {
      return { state, messages: [] }
    }
    if (state.initiative.movementRemaining <= 0) {
      return { state, messages: [] }
    }
  }

  const cell = dungeon.map.grid[y]?.[x]
  if (!cell || cell.type === 'wall' || cell.type === 'empty') {
    return { state, messages: [] }
  }

  if (state.players.some(p => p.id !== playerId && p.position.x === x && p.position.y === y)) {
    return { state, messages: [] }
  }

  const hasEnemy = Object.entries(state.enemyPositions).some(
    ([id, pos]) => pos.x === x && pos.y === y && !state.defeatedEnemies.has(id)
  )
  if (hasEnemy) return { state, messages: [] }

  const newMessages: ChatMessage[] = []
  const player = state.players.find(p => p.id === playerId)
  const charName = player?.characterName ?? 'Unknown'
  const newPlayers = state.players.map(p =>
    p.id === playerId ? { ...p, position: { x, y } } : p
  )

  let newInitiative = state.initiative
  if (newInitiative) {
    newInitiative = {
      ...newInitiative,
      movementRemaining: newInitiative.movementRemaining - 1,
    }
  }

  let newRevealedRooms = state.revealedRooms
  let newCurrentRoomId = state.currentRoomId
  let newLogs = state.playerLogs
  let autoInitiativeState: GameState | null = null

  if (cell.roomId && !state.revealedRooms.has(cell.roomId)) {
    const room = dungeon.rooms.find(r => r.id === cell.roomId)
    if (room) {
      newRevealedRooms = new Set(state.revealedRooms)
      newRevealedRooms.add(room.id)
      newCurrentRoomId = room.id

      newMessages.push(
        systemMessage(`${charName} enters: ${room.name}`),
        goldenMessage(room.readAloud, room.id)
      )

      newLogs = addToPlayerLog(newLogs, playerId, 'event', `Entered: ${room.name}`)

      const activeEnemies = room.enemies.filter(e => !state.defeatedEnemies.has(e.id))
      if (activeEnemies.length > 0) {
        newMessages.push(combatMessage(room))

        if (!state.initiative) {
          const entries = buildInitiativeEntries(
            { ...state, defeatedEnemies: state.defeatedEnemies },
            dungeon,
            room.id
          )
          if (entries.length > 0) {
            const baseState: GameState = {
              ...state,
              players: newPlayers,
              revealedRooms: newRevealedRooms,
              currentRoomId: newCurrentRoomId,
              chatLog: [...state.chatLog, ...newMessages],
              playerLogs: newLogs,
              initiative: null,
            }
            autoInitiativeState = startInitiative(baseState, dungeon, entries)
          }
        }
      }

      const availableLoot = room.loot.filter(l => !state.collectedLoot.has(l.id))
      if (availableLoot.length > 0 && activeEnemies.length === 0) {
        newMessages.push({
          id: nextId(), type: 'system', sender: 'System',
          text: `Loot available: ${availableLoot.map(l => l.name).join(', ')}`,
          timestamp: Date.now(), roomId: room.id
        })
      }
    }
  } else if (cell.roomId) {
    newCurrentRoomId = cell.roomId
  }

  if (autoInitiativeState) {
    const nowVisible = computeVisibleCells(
      dungeon, autoInitiativeState.revealedRooms, autoInitiativeState.players,
      autoInitiativeState.visionDistanceFt / 5
    )
    const newExplored = new Set(autoInitiativeState.exploredCells)
    for (const key of nowVisible) newExplored.add(key)
    return {
      state: { ...autoInitiativeState, exploredCells: newExplored },
      messages: autoInitiativeState.chatLog.slice(state.chatLog.length),
    }
  }

  const resultState: GameState = {
    ...state,
    players: newPlayers,
    revealedRooms: newRevealedRooms,
    currentRoomId: newCurrentRoomId,
    chatLog: [...state.chatLog, ...newMessages],
    playerLogs: newLogs,
    initiative: newInitiative,
  }

  const nowVisible = computeVisibleCells(
    dungeon, resultState.revealedRooms, newPlayers, resultState.visionDistanceFt / 5
  )
  const newExplored = new Set(state.exploredCells)
  for (const key of nowVisible) newExplored.add(key)
  resultState.exploredCells = newExplored

  return { state: resultState, messages: newMessages }
}

export function defeatEnemy(state: GameState, enemyId: string, enemyName: string): GameState {
  const newDefeated = new Set(state.defeatedEnemies)
  newDefeated.add(enemyId)
  return {
    ...state,
    defeatedEnemies: newDefeated,
    chatLog: [...state.chatLog, systemMessage(`${enemyName} defeated!`)]
  }
}

export function collectLoot(
  state: GameState,
  dungeon: Dungeon,
  lootId: string,
  lootName: string,
  playerId: string,
  characterName: string
): GameState {
  const newCollected = new Set(state.collectedLoot)
  newCollected.add(lootId)
  const newLogs = addToPlayerLog(state.playerLogs, playerId, 'loot', `Collected: ${lootName}`)

  let lootItem: Item | null = null
  for (const room of dungeon.rooms) {
    const found = room.loot.find(l => l.id === lootId)
    if (found) { lootItem = found; break }
  }

  let newPlayers = state.players
  if (lootItem) {
    const player = state.players.find(p => p.id === playerId)
    if (player) {
      if (lootItem.category === 'weapon' && lootItem.damage) {
        const newWeapon: Weapon = {
          name: lootItem.name,
          attackBonus: lootItem.attackBonus ?? 0,
          damage: lootItem.damage,
          damageType: lootItem.damageType ?? 'piercing',
          properties: lootItem.weaponProperties,
          equipped: false,
        }
        newPlayers = state.players.map(p =>
          p.id === playerId ? { ...p, weapons: [...p.weapons, newWeapon] } : p
        )
      } else if (lootItem.category === 'armor' || lootItem.category === 'shield') {
        const isShield = lootItem.category === 'shield'
        const newArmor: ArmorItem = {
          name: lootItem.name,
          armorClass: lootItem.armorClass ?? (isShield ? 2 : 10),
          type: isShield ? 'shield' : (lootItem.armorType ?? 'light'),
          equipped: false,
        }
        newPlayers = state.players.map(p =>
          p.id === playerId ? { ...p, armor: [...p.armor, newArmor] } : p
        )
      } else {
        const invItem: InventoryItem = {
          id: lootItem.id,
          name: lootItem.name,
          description: lootItem.description,
          category: lootItem.category ?? 'gear',
          value: lootItem.value,
          magical: lootItem.magical,
        }
        newPlayers = state.players.map(p =>
          p.id === playerId ? { ...p, inventory: [...(p.inventory ?? []), invItem] } : p
        )
      }
    }
  }

  return {
    ...state,
    players: newPlayers,
    collectedLoot: newCollected,
    chatLog: [...state.chatLog, systemMessage(`${characterName} collected: ${lootName}`)],
    playerLogs: newLogs
  }
}

export function computeAC(player: Player): number {
  const dexMod = Math.floor((player.abilities.dex - 10) / 2)
  const bodyArmor = player.armor.find(a => a.equipped && a.type !== 'shield')
  const shield = player.armor.find(a => a.equipped && a.type === 'shield')

  let ac: number
  if (!bodyArmor) {
    ac = 10 + dexMod
  } else {
    switch (bodyArmor.type) {
      case 'light':
        ac = bodyArmor.armorClass
        break
      case 'medium':
        ac = bodyArmor.armorClass
        break
      case 'heavy':
        ac = bodyArmor.armorClass
        break
      default:
        ac = bodyArmor.armorClass
    }
  }

  if (shield) {
    ac += shield.armorClass
  }

  return ac
}

function updatePlayerAC(state: GameState, playerId: string): GameState {
  const player = state.players.find(p => p.id === playerId)
  if (!player) return state
  const newAC = computeAC(player)
  if (newAC === player.ac) return state
  return {
    ...state,
    players: state.players.map(p =>
      p.id === playerId ? { ...p, ac: newAC } : p
    ),
  }
}

export function equipWeapon(state: GameState, playerId: string, weaponIndex: number): GameState {
  const player = state.players.find(p => p.id === playerId)
  if (!player || !player.weapons[weaponIndex]) return state

  const weapon = player.weapons[weaponIndex]
  if (weapon.equipped) return state

  const newWeapons = player.weapons.map((w, i) =>
    i === weaponIndex ? { ...w, equipped: true } : w
  )

  return {
    ...state,
    players: state.players.map(p =>
      p.id === playerId ? { ...p, weapons: newWeapons } : p
    ),
    chatLog: [...state.chatLog, systemMessage(`${player.characterName} equipped ${weapon.name}.`)],
  }
}

export function unequipWeapon(state: GameState, playerId: string, weaponIndex: number): GameState {
  const player = state.players.find(p => p.id === playerId)
  if (!player || !player.weapons[weaponIndex]) return state

  const weapon = player.weapons[weaponIndex]
  if (!weapon.equipped) return state

  const newWeapons = player.weapons.map((w, i) =>
    i === weaponIndex ? { ...w, equipped: false } : w
  )

  return {
    ...state,
    players: state.players.map(p =>
      p.id === playerId ? { ...p, weapons: newWeapons } : p
    ),
    chatLog: [...state.chatLog, systemMessage(`${player.characterName} unequipped ${weapon.name}.`)],
  }
}

export function equipArmor(state: GameState, playerId: string, armorIndex: number): GameState {
  const player = state.players.find(p => p.id === playerId)
  if (!player || !player.armor[armorIndex]) return state

  const armorPiece = player.armor[armorIndex]
  if (armorPiece.equipped) return state

  const isShield = armorPiece.type === 'shield'
  const newArmor = player.armor.map((a, i) => {
    if (i === armorIndex) return { ...a, equipped: true }
    if (isShield && a.type === 'shield' && a.equipped) return { ...a, equipped: false }
    if (!isShield && a.type !== 'shield' && a.equipped) return { ...a, equipped: false }
    return a
  })

  const updatedPlayer = { ...player, armor: newArmor }
  const newAC = computeAC(updatedPlayer)

  return {
    ...state,
    players: state.players.map(p =>
      p.id === playerId ? { ...updatedPlayer, ac: newAC } : p
    ),
    chatLog: [...state.chatLog, systemMessage(`${player.characterName} equipped ${armorPiece.name}. AC is now ${newAC}.`)],
  }
}

export function unequipArmor(state: GameState, playerId: string, armorIndex: number): GameState {
  const player = state.players.find(p => p.id === playerId)
  if (!player || !player.armor[armorIndex]) return state

  const armorPiece = player.armor[armorIndex]
  if (!armorPiece.equipped) return state

  const newArmor = player.armor.map((a, i) =>
    i === armorIndex ? { ...a, equipped: false } : a
  )

  const updatedPlayer = { ...player, armor: newArmor }
  const newAC = computeAC(updatedPlayer)

  return {
    ...state,
    players: state.players.map(p =>
      p.id === playerId ? { ...updatedPlayer, ac: newAC } : p
    ),
    chatLog: [...state.chatLog, systemMessage(`${player.characterName} removed ${armorPiece.name}. AC is now ${newAC}.`)],
  }
}

export function equipFromInventory(state: GameState, playerId: string, inventoryItemId: string): GameState {
  const player = state.players.find(p => p.id === playerId)
  if (!player) return state

  const inv = player.inventory ?? []
  const itemIndex = inv.findIndex(i => i.id === inventoryItemId)
  if (itemIndex < 0) return state

  const item = inv[itemIndex]
  const newInventory = inv.filter((_, i) => i !== itemIndex)

  if (item.category === 'weapon') {
    const newWeapon: Weapon = {
      name: item.name,
      attackBonus: item.attackBonus ?? 0,
      damage: item.damage ?? '1d4',
      damageType: item.damageType ?? 'bludgeoning',
      properties: item.weaponProperties,
      equipped: true,
    }
    const updatedPlayer = { ...player, weapons: [...player.weapons, newWeapon], inventory: newInventory }
    return {
      ...state,
      players: state.players.map(p => p.id === playerId ? updatedPlayer : p),
      chatLog: [...state.chatLog, systemMessage(`${player.characterName} equipped ${item.name}.`)],
    }
  }

  if (item.category === 'armor' || item.category === 'shield') {
    const isShield = item.category === 'shield'
    const armorType = isShield ? 'shield' as const : (item.armorType ?? 'light' as const)
    const newArmorPiece: ArmorItem = {
      name: item.name,
      armorClass: item.armorClass ?? (isShield ? 2 : 10),
      type: armorType,
      equipped: true,
    }
    const newArmor = player.armor.map(a => {
      if (isShield && a.type === 'shield' && a.equipped) return { ...a, equipped: false }
      if (!isShield && a.type !== 'shield' && a.equipped) return { ...a, equipped: false }
      return a
    })
    const updatedPlayer = { ...player, armor: [...newArmor, newArmorPiece], inventory: newInventory }
    const newAC = computeAC(updatedPlayer)

    return {
      ...state,
      players: state.players.map(p => p.id === playerId ? { ...updatedPlayer, ac: newAC } : p),
      chatLog: [...state.chatLog, systemMessage(`${player.characterName} equipped ${item.name}. AC is now ${newAC}.`)],
    }
  }

  return state
}

export function unequipToInventory(state: GameState, playerId: string, slot: 'weapon' | 'armor', index: number): GameState {
  const player = state.players.find(p => p.id === playerId)
  if (!player) return state

  if (slot === 'weapon') {
    const weapon = player.weapons[index]
    if (!weapon) return state

    const invItem: InventoryItem = {
      id: `inv-${Date.now()}-${++counter}`,
      name: weapon.name,
      description: `${weapon.damage} ${weapon.damageType}`,
      category: 'weapon',
      attackBonus: weapon.attackBonus,
      damage: weapon.damage,
      damageType: weapon.damageType,
      weaponProperties: weapon.properties,
    }
    const newWeapons = player.weapons.filter((_, i) => i !== index)
    const newInventory = [...(player.inventory ?? []), invItem]

    return {
      ...state,
      players: state.players.map(p =>
        p.id === playerId ? { ...p, weapons: newWeapons, inventory: newInventory } : p
      ),
      chatLog: [...state.chatLog, systemMessage(`${player.characterName} stowed ${weapon.name}.`)],
    }
  }

  if (slot === 'armor') {
    const armorPiece = player.armor[index]
    if (!armorPiece) return state

    const isShield = armorPiece.type === 'shield'
    const invItem: InventoryItem = {
      id: `inv-${Date.now()}-${++counter}`,
      name: armorPiece.name,
      description: isShield ? `Shield (+${armorPiece.armorClass} AC)` : `${armorPiece.type} armor (AC ${armorPiece.armorClass})`,
      category: isShield ? 'shield' : 'armor',
      armorClass: armorPiece.armorClass,
      armorType: isShield ? undefined : armorPiece.type as 'light' | 'medium' | 'heavy',
    }
    const newArmor = player.armor.filter((_, i) => i !== index)
    const newInventory = [...(player.inventory ?? []), invItem]
    const updatedPlayer = { ...player, armor: newArmor, inventory: newInventory }
    const newAC = computeAC(updatedPlayer)

    return {
      ...state,
      players: state.players.map(p =>
        p.id === playerId ? { ...updatedPlayer, ac: newAC } : p
      ),
      chatLog: [...state.chatLog, systemMessage(`${player.characterName} stowed ${armorPiece.name}. AC is now ${newAC}.`)],
    }
  }

  return state
}

export function adjustHp(
  state: GameState,
  playerId: string,
  delta: number
): GameState {
  const player = state.players.find(p => p.id === playerId)
  if (!player) return state

  const newHp = Math.max(0, Math.min(player.maxHp, player.hp + delta))
  const actualDelta = newHp - player.hp
  if (actualDelta === 0) return state

  const newPlayers = state.players.map(p =>
    p.id === playerId ? { ...p, hp: newHp } : p
  )

  const logType: PlayerLogEntry['type'] = actualDelta < 0 ? 'damage' : 'heal'
  const logText = actualDelta < 0
    ? `Took ${Math.abs(actualDelta)} damage (HP: ${newHp}/${player.maxHp})`
    : `Healed ${actualDelta} HP (HP: ${newHp}/${player.maxHp})`

  const chatText = actualDelta < 0
    ? `${player.characterName} took ${Math.abs(actualDelta)} damage (HP: ${newHp}/${player.maxHp})`
    : `${player.characterName} healed ${actualDelta} HP (HP: ${newHp}/${player.maxHp})`

  const newLogs = addToPlayerLog(state.playerLogs, playerId, logType, logText)

  return {
    ...state,
    players: newPlayers,
    chatLog: [...state.chatLog, systemMessage(chatText)],
    playerLogs: newLogs
  }
}

export function adjustResource(
  state: GameState,
  playerId: string,
  resourceIndex: number,
  delta: number
): GameState {
  const player = state.players.find(p => p.id === playerId)
  if (!player) return state

  const res = player.resources[resourceIndex]
  if (!res) return state

  const newVal = Math.max(0, Math.min(res.max, res.current + delta))
  if (newVal === res.current) return state

  const newResources = player.resources.map((r, i) =>
    i === resourceIndex ? { ...r, current: newVal } : r
  )

  return {
    ...state,
    players: state.players.map(p =>
      p.id === playerId ? { ...p, resources: newResources } : p
    ),
  }
}

export function addPlayerMessage(state: GameState, playerName: string, text: string): GameState {
  return {
    ...state,
    chatLog: [...state.chatLog, {
      id: nextId(), type: 'player', sender: playerName,
      text, timestamp: Date.now()
    }]
  }
}

export function addDmNote(state: GameState, room: Room): ChatMessage {
  return {
    id: nextId(), type: 'dm_note', sender: 'DM Notes',
    text: room.dmNotes, timestamp: Date.now(), roomId: room.id
  }
}

function systemMessage(text: string): ChatMessage {
  return { id: nextId(), type: 'system', sender: 'System', text, timestamp: Date.now() }
}

function goldenMessage(text: string, roomId: string): ChatMessage {
  return { id: nextId(), type: 'golden', sender: 'Narrator', text, timestamp: Date.now(), roomId }
}

function combatMessage(room: Room): ChatMessage {
  const enemies = room.enemies
  const lines = ['COMBAT ENCOUNTER', '']
  for (const e of enemies) {
    lines.push(`**${e.name}** — AC ${e.ac} | HP ${e.hp} | CR ${e.cr}`)
    for (const a of e.attacks) {
      lines.push(`  • ${a.name}: +${a.toHit} to hit, ${a.damage}${a.reach ? ` (${a.reach})` : ''}`)
    }
    if (e.abilities) {
      for (const ab of e.abilities) {
        lines.push(`  ◦ ${ab}`)
      }
    }
    lines.push('')
  }
  return {
    id: nextId(), type: 'combat', sender: 'Combat',
    text: lines.join('\n'), timestamp: Date.now(), roomId: room.id
  }
}

function seedEnemyPositions(dungeon: Dungeon): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {}

  for (const room of dungeon.rooms) {
    if (room.enemies.length === 0) continue

    const cx = room.position.x + Math.floor(room.size.width / 2)
    const cy = room.position.y + Math.floor(room.size.height / 2)

    room.enemies.forEach((enemy, i) => {
      const offsetX = (i % room.size.width) - Math.floor(room.size.width / 2) + 1
      const offsetY = Math.floor(i / room.size.width) - Math.floor(room.size.height / 2) + 1
      const ex = Math.min(Math.max(cx + offsetX, room.position.x), room.position.x + room.size.width - 1)
      const ey = Math.min(Math.max(cy + offsetY, room.position.y), room.position.y + room.size.height - 1)
      positions[enemy.id] = { x: ex, y: ey }
    })
  }

  return positions
}

function seedEnemyHp(dungeon: Dungeon): Record<string, number> {
  const hp: Record<string, number> = {}
  for (const room of dungeon.rooms) {
    for (const enemy of room.enemies) {
      hp[enemy.id] = enemy.hp
    }
  }
  return hp
}

export function adjustEnemyHp(
  state: GameState,
  dungeon: Dungeon,
  enemyId: string,
  delta: number
): GameState {
  let enemy: import('../types/dungeon').Enemy | null = null
  for (const room of dungeon.rooms) {
    const e = room.enemies.find(en => en.id === enemyId)
    if (e) { enemy = e; break }
  }
  if (!enemy) return state

  const currentHp = state.enemyHp[enemyId] ?? enemy.hp
  const newHp = Math.max(0, Math.min(enemy.maxHp, currentHp + delta))
  if (newHp === currentHp) return state

  return {
    ...state,
    enemyHp: { ...state.enemyHp, [enemyId]: newHp },
  }
}

export function moveEnemy(
  state: GameState,
  dungeon: Dungeon,
  enemyId: string,
  x: number,
  y: number
): GameState {
  if (state.initiative) {
    const current = state.initiative.entries[state.initiative.currentIndex]
    if (current.type !== 'enemy' || current.id !== enemyId) {
      return state
    }
    if (state.initiative.movementRemaining <= 0) {
      return state
    }
  }

  const cell = dungeon.map.grid[y]?.[x]
  if (!cell || cell.type === 'wall' || cell.type === 'empty') return state
  if (state.defeatedEnemies.has(enemyId)) return state

  if (state.players.some(p => p.position.x === x && p.position.y === y)) return state

  const hasOtherEnemy = Object.entries(state.enemyPositions).some(
    ([id, pos]) => id !== enemyId && pos.x === x && pos.y === y && !state.defeatedEnemies.has(id)
  )
  if (hasOtherEnemy) return state

  let newInitiative = state.initiative
  if (newInitiative) {
    newInitiative = {
      ...newInitiative,
      movementRemaining: newInitiative.movementRemaining - 1,
    }
  }

  return {
    ...state,
    enemyPositions: {
      ...state.enemyPositions,
      [enemyId]: { x, y }
    },
    initiative: newInitiative,
  }
}

export function getRoomAt(dungeon: Dungeon, x: number, y: number): Room | null {
  const cell = dungeon.map.grid[y]?.[x]
  if (!cell?.roomId) return null
  return dungeon.rooms.find(r => r.id === cell.roomId) ?? null
}

export function updatePlayer(state: GameState, playerId: string, updates: Record<string, unknown>): GameState {
  return {
    ...state,
    players: state.players.map(p => {
      if (p.id !== playerId) return p
      const merged: Record<string, unknown> = { ...p }
      for (const [k, v] of Object.entries(updates)) {
        if (v !== undefined) merged[k] = v
      }
      return merged as unknown as Player
    }),
  }
}

export function togglePause(state: GameState): GameState {
  const pausing = state.phase !== 'paused'
  return {
    ...state,
    phase: pausing ? 'paused' : 'playing',
    chatLog: [...state.chatLog, systemMessage(pausing ? 'Game paused by DM.' : 'Game resumed.')]
  }
}

function rollD20(): number {
  return Math.floor(Math.random() * 20) + 1
}

function getMovementCells(speed: number): number {
  return Math.floor(speed / 5)
}

function getEntrySpeed(state: GameState, dungeon: Dungeon, entry: InitiativeEntry): number {
  if (entry.type === 'player') {
    const player = state.players.find(p => p.id === entry.id)
    return player?.speed ?? 30
  }
  for (const room of dungeon.rooms) {
    const enemy = room.enemies.find(e => e.id === entry.id)
    if (enemy) return parseInt(enemy.speed) || 30
  }
  return 30
}

export function buildInitiativeEntries(
  state: GameState,
  dungeon: Dungeon,
  roomId: string
): InitiativeEntry[] {
  const room = dungeon.rooms.find(r => r.id === roomId)
  if (!room) return []

  const entries: InitiativeEntry[] = []

  for (const player of state.players) {
    entries.push({
      id: player.id,
      type: 'player',
      name: player.characterName,
      roll: rollD20() + player.initiative,
    })
  }

  for (const enemy of room.enemies) {
    if (state.defeatedEnemies.has(enemy.id)) continue
    entries.push({
      id: enemy.id,
      type: 'enemy',
      name: enemy.name,
      roll: rollD20(),
    })
  }

  entries.sort((a, b) => b.roll - a.roll)
  return entries
}

export function startInitiative(
  state: GameState,
  dungeon: Dungeon,
  entries: InitiativeEntry[]
): GameState {
  if (entries.length === 0) return state

  const first = entries[0]
  const speed = getEntrySpeed(state, dungeon, first)

  const initiative: InitiativeState = {
    entries,
    currentIndex: 0,
    movementRemaining: getMovementCells(speed),
    round: 1,
  }

  return {
    ...state,
    combatActive: true,
    initiative,
    chatLog: [
      ...state.chatLog,
      systemMessage('⚔️ Roll Initiative!'),
      systemMessage(`Round 1 — ${first.name}'s turn`),
    ],
  }
}

export function endInitiative(state: GameState): GameState {
  return {
    ...state,
    combatActive: false,
    initiative: null,
    chatLog: [...state.chatLog, systemMessage('Initiative ended — free movement restored.')],
  }
}

export function endTurn(state: GameState, dungeon: Dungeon): GameState {
  if (!state.initiative) return state

  const { entries, currentIndex, round } = state.initiative
  const nextIndex = (currentIndex + 1) % entries.length
  const newRound = nextIndex === 0 ? round + 1 : round
  const next = entries[nextIndex]
  const speed = getEntrySpeed(state, dungeon, next)

  return {
    ...state,
    initiative: {
      ...state.initiative,
      currentIndex: nextIndex,
      movementRemaining: getMovementCells(speed),
      round: newRound,
    },
    chatLog: [
      ...state.chatLog,
      ...(nextIndex === 0 ? [systemMessage(`--- Round ${newRound} ---`)] : []),
      systemMessage(`${next.name}'s turn`),
    ],
  }
}

export function updateInitiativeEntry(
  state: GameState,
  dungeon: Dungeon,
  entryId: string,
  roll: number
): GameState {
  if (!state.initiative) return state

  const newEntries = state.initiative.entries
    .map(e => e.id === entryId ? { ...e, roll } : e)
    .sort((a, b) => b.roll - a.roll)

  const currentEntry = state.initiative.entries[state.initiative.currentIndex]
  const newIndex = newEntries.findIndex(e => e.id === currentEntry.id)
  const resolvedIndex = newIndex >= 0 ? newIndex : 0

  const entry = newEntries[resolvedIndex]
  const speed = getEntrySpeed(state, dungeon, entry)

  return {
    ...state,
    initiative: {
      ...state.initiative,
      entries: newEntries,
      currentIndex: resolvedIndex,
      movementRemaining: getMovementCells(speed),
    },
  }
}

function seedLootPositions(dungeon: Dungeon): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {}

  for (const room of dungeon.rooms) {
    if (room.loot.length === 0) continue

    const rx = room.position.x
    const ry = room.position.y
    const rw = room.size.width
    const rh = room.size.height

    room.loot.forEach((item, i) => {
      const edge = i % 4
      let lx: number, ly: number
      if (edge === 0) {
        lx = rx + 1 + (i % Math.max(1, rw - 2))
        ly = ry
      } else if (edge === 1) {
        lx = rx + rw - 1
        ly = ry + 1 + (i % Math.max(1, rh - 2))
      } else if (edge === 2) {
        lx = rx + rw - 2 - (i % Math.max(1, rw - 2))
        ly = ry + rh - 1
      } else {
        lx = rx
        ly = ry + rh - 2 - (i % Math.max(1, rh - 2))
      }
      lx = Math.min(Math.max(lx, rx), rx + rw - 1)
      ly = Math.min(Math.max(ly, ry), ry + rh - 1)
      positions[item.id] = { x: lx, y: ly }
    })
  }

  return positions
}

export function startTravel(
  state: GameState,
  campaign: Campaign,
  fromId: string,
  toId: string
): GameState {
  const route = findRoute(campaign, fromId, toId)
  if (!route) return state

  const from = campaign.locations.find(l => l.id === fromId)
  const to = campaign.locations.find(l => l.id === toId)

  return {
    ...state,
    phase: 'traveling',
    travel: {
      fromId,
      toId,
      totalDays: route.travelDays,
      currentDay: 0,
      activeEventId: null,
    },
    chatLog: [...state.chatLog, systemMessage(
      `The party sets out from ${from?.name ?? 'here'} toward ${to?.name ?? 'unknown'}. Estimated travel: ${route.travelDays} day${route.travelDays > 1 ? 's' : ''}.`
    )],
  }
}

export function advanceTravel(state: GameState): GameState {
  if (!state.travel || state.phase !== 'traveling') return state
  const nextDay = state.travel.currentDay + 1
  if (nextDay >= state.travel.totalDays) {
    return state
  }
  return {
    ...state,
    travel: { ...state.travel, currentDay: nextDay },
    chatLog: [...state.chatLog, systemMessage(`Day ${nextDay + 1} of travel.`)],
  }
}

export function triggerTravelEvent(
  state: GameState,
  campaign: Campaign,
  eventId: string
): GameState {
  if (!state.travel) return state
  const route = findRoute(campaign, state.travel.fromId, state.travel.toId)
  const event = route?.events?.find(e => e.id === eventId)
  if (!event) return state

  return {
    ...state,
    travel: { ...state.travel, activeEventId: eventId },
    chatLog: [...state.chatLog, systemMessage(`Travel event: ${event.name} — ${event.description}`)],
  }
}

export function resolveTravelEvent(state: GameState): GameState {
  if (!state.travel) return state
  return {
    ...state,
    travel: { ...state.travel, activeEventId: null },
    chatLog: [...state.chatLog, systemMessage('The event has been resolved. The party continues onward.')],
  }
}

export function arriveAtDestination(
  state: GameState,
  campaign: Campaign
): GameState {
  if (!state.travel) return state
  const dest = campaign.locations.find(l => l.id === state.travel!.toId)
  const newDiscovered = new Set(state.discoveredLocationIds)
  newDiscovered.add(state.travel.toId)

  return {
    ...state,
    phase: 'playing',
    currentLocationId: state.travel.toId,
    discoveredLocationIds: newDiscovered,
    travel: null,
    chatLog: [...state.chatLog, systemMessage(`The party arrives at ${dest?.name ?? 'their destination'}.`)],
  }
}

const MAX_DICE_ROLLS = 30

export function addDiceRoll(state: GameState, roll: DiceRollResult): GameState {
  const newRolls = [...state.diceRolls, roll].slice(-MAX_DICE_ROLLS)
  const rollValues = roll.rolls.map(r => `${r.value}`).join(', ')
  const modStr = roll.modifier !== 0
    ? ` ${roll.modifier > 0 ? '+' : ''}${roll.modifier}`
    : ''
  const skillLine = roll.modifierLabel ? `  for ${roll.modifierLabel}` : ''
  const label = `${roll.formula}${skillLine}\n[ ${rollValues} ]${modStr} = ${roll.total}`
  return {
    ...state,
    diceRolls: newRolls,
    chatLog: [...state.chatLog, {
      id: `dice-${roll.id}`,
      type: 'dice' as const,
      sender: roll.characterName,
      text: label,
      timestamp: roll.timestamp,
    }],
  }
}

export function discoverLocation(state: GameState, locationId: string): GameState {
  const newDiscovered = new Set(state.discoveredLocationIds)
  newDiscovered.add(locationId)
  return {
    ...state,
    discoveredLocationIds: newDiscovered,
  }
}

function findRoute(campaign: Campaign, fromId: string, toId: string): CampaignRoute | undefined {
  return campaign.routes.find(
    r => (r.fromId === fromId && r.toId === toId) || (r.fromId === toId && r.toId === fromId)
  )
}

function hasLineOfSight(
  grid: import('../types/dungeon').Cell[][],
  x0: number, y0: number,
  x1: number, y1: number
): boolean {
  let dx = Math.abs(x1 - x0)
  let dy = Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx - dy
  let cx = x0, cy = y0

  while (cx !== x1 || cy !== y1) {
    const e2 = 2 * err
    if (e2 > -dy) { err -= dy; cx += sx }
    if (e2 < dx) { err += dx; cy += sy }
    if (cx === x1 && cy === y1) break
    const c = grid[cy]?.[cx]
    if (!c || c.type === 'wall') return false
  }
  return true
}

export function isCellVisible(
  dungeon: Dungeon,
  revealedRooms: Set<string>,
  players: Player[],
  x: number,
  y: number,
  visionRadius: number = 3
): boolean {
  const cell = dungeon.map.grid[y]?.[x]
  if (!cell) return false

  if (cell.roomId && revealedRooms.has(cell.roomId)) return true

  const { grid } = dungeon.map

  for (const player of players) {
    const dx = player.position.x - x
    const dy = player.position.y - y
    if (dx * dx + dy * dy <= visionRadius * visionRadius) {
      if (hasLineOfSight(grid, player.position.x, player.position.y, x, y)) {
        return true
      }
    }
  }

  return false
}

export function computeVisibleCells(
  dungeon: Dungeon,
  revealedRooms: Set<string>,
  players: Player[],
  visionRadius: number
): Set<string> {
  const visible = new Set<string>()
  const { grid } = dungeon.map

  for (const room of dungeon.rooms) {
    if (!revealedRooms.has(room.id)) continue
    for (let ry = room.position.y; ry < room.position.y + room.size.height; ry++) {
      for (let rx = room.position.x; rx < room.position.x + room.size.width; rx++) {
        const c = grid[ry]?.[rx]
        if (c && c.roomId === room.id) visible.add(`${rx},${ry}`)
      }
    }
  }

  for (const player of players) {
    const px = player.position.x
    const py = player.position.y
    const r = Math.ceil(visionRadius)
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > visionRadius * visionRadius) continue
        const tx = px + dx
        const ty = py + dy
        const c = grid[ty]?.[tx]
        if (!c) continue
        if (visible.has(`${tx},${ty}`)) continue
        if (hasLineOfSight(grid, px, py, tx, ty)) {
          visible.add(`${tx},${ty}`)
        }
      }
    }
  }

  return visible
}
