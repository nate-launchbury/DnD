import { WebSocketServer, WebSocket } from 'ws'
import { sampleDungeon } from '../src/data/sampleDungeon.js'
import { sampleCampaign } from '../src/data/sampleCampaign.js'
import { DEFAULT_PLAYERS } from '../src/data/players.js'
import {
  createInitialState,
  movePlayer,
  moveEnemy,
  defeatEnemy,
  adjustEnemyHp,
  collectLoot,
  adjustHp,
  adjustResource,
  addPlayerMessage,
  addDmNote,
  togglePause,
  startTravel,
  advanceTravel,
  triggerTravelEvent,
  resolveTravelEvent,
  arriveAtDestination,
  discoverLocation,
  updatePlayer,
  startInitiative,
  endInitiative,
  endTurn,
  updateInitiativeEntry,
  equipWeapon,
  unequipWeapon,
  equipArmor,
  unequipArmor,
  equipFromInventory,
  unequipToInventory,
  addDiceRoll,
} from '../src/engine/gameEngine.js'
import { serializeGameState } from '../src/engine/persistence.js'
import type { GameState } from '../src/types/game.js'
import type { GameAction } from '../src/types/actions.js'

const PORT = 4000

const dungeon = sampleDungeon
const campaign = sampleCampaign
let gameState: GameState = createInitialState(dungeon, DEFAULT_PLAYERS)

// Seed discovered locations from campaign
for (const loc of campaign.locations) {
  if (loc.discovered) {
    gameState.discoveredLocationIds.add(loc.id)
  }
}
gameState.currentLocationId = campaign.locations.find(l => l.dungeonId === dungeon.id)?.id ?? null

const wss = new WebSocketServer({ port: PORT })

function broadcast() {
  const payload = JSON.stringify({ type: 'state', data: serializeGameState(gameState) })
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload)
    }
  }
}

function applyAction(action: GameAction): void {
  const paused = gameState.phase === 'paused'

  switch (action.type) {
    case 'movePlayer': {
      if (paused) break
      const result = movePlayer(gameState, dungeon, action.playerId, action.x, action.y)
      gameState = result.state
      break
    }
    case 'moveEnemy': {
      gameState = moveEnemy(gameState, dungeon, action.enemyId, action.x, action.y)
      break
    }
    case 'defeatEnemy': {
      gameState = defeatEnemy(gameState, action.enemyId, action.enemyName)
      break
    }
    case 'adjustEnemyHp': {
      gameState = adjustEnemyHp(gameState, dungeon, action.enemyId, action.delta)
      break
    }
    case 'collectLoot': {
      if (paused) break
      gameState = collectLoot(gameState, dungeon, action.lootId, action.lootName, action.playerId, action.characterName)
      break
    }
    case 'adjustHp': {
      gameState = adjustHp(gameState, action.playerId, action.delta)
      break
    }
    case 'adjustResource': {
      gameState = adjustResource(gameState, action.playerId, action.resourceIndex, action.delta)
      break
    }
    case 'sendMessage': {
      gameState = addPlayerMessage(gameState, action.sender, action.text)
      break
    }
    case 'addDmNote': {
      const room = dungeon.rooms.find(r => r.id === action.roomId)
      if (room) {
        const note = addDmNote(gameState, room)
        gameState = { ...gameState, chatLog: [...gameState.chatLog, note] }
      }
      break
    }
    case 'setCurrentRoom': {
      gameState = { ...gameState, currentRoomId: action.roomId }
      break
    }
    case 'togglePause': {
      gameState = togglePause(gameState)
      break
    }
    case 'startTravel': {
      gameState = startTravel(gameState, campaign, action.fromId, action.toId)
      break
    }
    case 'advanceTravel': {
      gameState = advanceTravel(gameState)
      break
    }
    case 'triggerTravelEvent': {
      gameState = triggerTravelEvent(gameState, campaign, action.eventId)
      break
    }
    case 'resolveTravelEvent': {
      gameState = resolveTravelEvent(gameState)
      break
    }
    case 'arriveAtDestination': {
      gameState = arriveAtDestination(gameState, campaign)
      break
    }
    case 'discoverLocation': {
      gameState = discoverLocation(gameState, action.locationId)
      break
    }
    case 'updatePlayer': {
      gameState = updatePlayer(gameState, action.playerId, action.updates)
      break
    }
    case 'startInitiative': {
      gameState = startInitiative(gameState, dungeon, action.entries)
      break
    }
    case 'endInitiative': {
      gameState = endInitiative(gameState)
      break
    }
    case 'endTurn': {
      gameState = endTurn(gameState, dungeon)
      break
    }
    case 'updateInitiativeEntry': {
      gameState = updateInitiativeEntry(gameState, dungeon, action.entryId, action.roll)
      break
    }
    case 'equipWeapon': {
      gameState = equipWeapon(gameState, action.playerId, action.weaponIndex)
      break
    }
    case 'unequipWeapon': {
      gameState = unequipWeapon(gameState, action.playerId, action.weaponIndex)
      break
    }
    case 'equipArmor': {
      gameState = equipArmor(gameState, action.playerId, action.armorIndex)
      break
    }
    case 'unequipArmor': {
      gameState = unequipArmor(gameState, action.playerId, action.armorIndex)
      break
    }
    case 'equipFromInventory': {
      gameState = equipFromInventory(gameState, action.playerId, action.inventoryItemId)
      break
    }
    case 'unequipToInventory': {
      gameState = unequipToInventory(gameState, action.playerId, action.slot, action.index)
      break
    }
    case 'diceRoll': {
      gameState = addDiceRoll(gameState, action.roll)
      break
    }
    case 'setVisionDistance': {
      const feet = Math.max(5, Math.min(300, action.feet))
      gameState = { ...gameState, visionDistanceFt: feet }
      break
    }
    case 'resetGame': {
      gameState = createInitialState(dungeon, DEFAULT_PLAYERS)
      break
    }
  }
}

wss.on('connection', (ws) => {
  console.log(`Client connected (${wss.clients.size} total)`)

  ws.send(JSON.stringify({ type: 'state', data: serializeGameState(gameState) }))

  ws.on('message', (raw) => {
    try {
      const action: GameAction = JSON.parse(raw.toString())
      applyAction(action)
      broadcast()
    } catch (err) {
      console.error('Bad message:', err)
    }
  })

  ws.on('close', () => {
    console.log(`Client disconnected (${wss.clients.size} total)`)
  })
})

console.log(`DnD WebSocket server running on ws://localhost:${PORT}`)
