import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import CharacterSelect from './CharacterSelect'
import DungeonMap from './DungeonMap'
import ContextPane from './ContextPane'
import WorldMap from './WorldMap'
import TravelView from './TravelView'
import FloatingPanel from './FloatingPanel'
import DiceRoller from './DiceRoller'
import { sampleDungeon } from '../data/sampleDungeon'
import { sampleCampaign } from '../data/sampleCampaign'
import { DEFAULT_PLAYERS } from '../data/players'
import { createInitialState, buildInitiativeEntries } from '../engine/gameEngine'
import { useSync } from '../engine/useSync'
import { saveSession, loadSession, clearSession } from '../engine/persistence'
import type { Enemy, Item, Dungeon } from '../types/dungeon'

type InspectTarget =
  | { kind: 'loot'; item: Item; lootId: string; canTake: boolean }

type EnemyPopup = {
  enemyId: string
  enemy: Enemy
  screenX: number
  screenY: number
}

const LOG_MESSAGE_STYLES: Record<string, { bg: string; border: string; label: string }> = {
  golden:  { bg: '#2a2010', border: '#c9a227', label: 'Read Aloud' },
  narration: { bg: '#1a1a2e', border: '#555', label: 'Narration' },
  dm_note: { bg: '#1a0a1e', border: '#9b59b6', label: 'DM Notes' },
  combat:  { bg: '#2a1010', border: '#c0392b', label: 'Combat' },
  dice:    { bg: '#1a1520', border: '#8e44ad', label: '' },
  system:  { bg: '#0d1a0d', border: '#444', label: '' },
  player:  { bg: '#0d1a2e', border: '#2980b9', label: '' },
}

function filterCombatForPlayer(text: string): string {
  const lines = text.split('\n')
  const filtered: string[] = []
  for (const line of lines) {
    if (line.startsWith('COMBAT ENCOUNTER')) {
      filtered.push(line)
    } else if (line.startsWith('**')) {
      const name = line.match(/\*\*(.+?)\*\*/)?.[1]
      if (name) filtered.push(name)
    }
  }
  return filtered.join('\n')
}

function findEnemyInDungeon(d: Dungeon, enemyId: string): Enemy | null {
  for (const room of d.rooms) {
    const e = room.enemies.find(en => en.id === enemyId)
    if (e) return e
  }
  return null
}

function findItemInDungeon(d: Dungeon, lootId: string): Item | null {
  for (const room of d.rooms) {
    const it = room.loot.find(l => l.id === lootId)
    if (it) return it
  }
  return null
}

export default function App() {
  const [myRole, setMyRole] = useState<'dm' | 'player' | null>(null)
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null)
  const [gameState, setGameState] = useState(() =>
    createInitialState(sampleDungeon, DEFAULT_PLAYERS)
  )
  const [dmSelectedPlayer, setDmSelectedPlayer] = useState<string>('p1')
  const [selectedEnemyId, setSelectedEnemyId] = useState<string | null>(null)
  const [enemyPopup, setEnemyPopup] = useState<EnemyPopup | null>(null)
  const [inspectTarget, setInspectTarget] = useState<InspectTarget | null>(null)
  const [enemyHpInput, setEnemyHpInput] = useState('')
  const [mapOpen, setMapOpen] = useState(false)
  const [diceOpen, setDiceOpen] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const mapBtnRef = useRef<HTMLButtonElement>(null)
  const logBtnRef = useRef<HTMLButtonElement>(null)
  const logBottomRef = useRef<HTMLDivElement>(null)

  const { connected, sendAction } = useSync({ onStateUpdate: setGameState })

  const dungeon = sampleDungeon
  const campaign = sampleCampaign
  const isDM = myRole === 'dm'

  const activePlayerId = isDM ? dmSelectedPlayer : myPlayerId
  const myPlayer = myPlayerId ? gameState.players.find(p => p.id === myPlayerId) : null

  useEffect(() => {
    if (logOpen) {
      logBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [gameState.chatLog.length, logOpen])

  useEffect(() => {
    const saved = loadSession()
    if (saved) {
      setMyRole(saved.role)
      setMyPlayerId(saved.playerId)
    }
  }, [])

  useEffect(() => {
    if (myRole !== null) {
      saveSession(myRole, myPlayerId)
    }
  }, [myRole, myPlayerId])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activePlayerId) return
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return

      const player = gameState.players.find(p => p.id === activePlayerId)
      if (!player) return

      let dx = 0, dy = 0
      switch (e.key) {
        case 'ArrowUp': dy = -1; break
        case 'ArrowDown': dy = 1; break
        case 'ArrowLeft': dx = -1; break
        case 'ArrowRight': dx = 1; break
        default: return
      }

      e.preventDefault()
      sendAction({ type: 'movePlayer', playerId: activePlayerId, x: player.position.x + dx, y: player.position.y + dy })
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activePlayerId, gameState.players, sendAction])

  const currentRoom = useMemo(() => {
    if (!gameState.currentRoomId) return null
    return dungeon.rooms.find(r => r.id === gameState.currentRoomId) ?? null
  }, [gameState.currentRoomId, dungeon.rooms])

  const handleSelect = useCallback((role: 'dm' | 'player', playerId: string | null) => {
    setMyRole(role)
    setMyPlayerId(playerId)
    if (role === 'dm') setDmSelectedPlayer('p1')
  }, [])

  const handleLeave = useCallback(() => {
    clearSession()
    setMyRole(null)
    setMyPlayerId(null)
    setSelectedEnemyId(null)
    setEnemyPopup(null)
  }, [])

  const handleTogglePause = useCallback(() => {
    sendAction({ type: 'togglePause' })
  }, [sendAction])

  const handleSetVisionDistance = useCallback((feet: number) => {
    const clamped = Math.max(5, Math.min(300, feet))
    sendAction({ type: 'setVisionDistance', feet: clamped })
  }, [sendAction])

  const isPaused = gameState.phase === 'paused'

  const handleCellClick = useCallback((x: number, y: number) => {
    if (isDM && selectedEnemyId) {
      sendAction({ type: 'moveEnemy', enemyId: selectedEnemyId, x, y })
      setSelectedEnemyId(null)
      setEnemyPopup(null)
      return
    }

    if (enemyPopup) {
      setEnemyPopup(null)
      return
    }

    if (!activePlayerId) return
    const player = gameState.players.find(p => p.id === activePlayerId)
    if (!player) return

    if (isDM) {
      const playerAtCell = gameState.players.find(p => p.position.x === x && p.position.y === y)
      if (playerAtCell) {
        setDmSelectedPlayer(playerAtCell.id)
        setSelectedEnemyId(null)
        return
      }
    }

    if (!isDM) {
      const playerAtCell = gameState.players.find(p => p.position.x === x && p.position.y === y)
      if (playerAtCell && playerAtCell.id !== myPlayerId) return
    }

    const dx = Math.abs(player.position.x - x)
    const dy = Math.abs(player.position.y - y)
    if (dx > 1 || dy > 1) return

    sendAction({ type: 'movePlayer', playerId: activePlayerId, x, y })
  }, [gameState, activePlayerId, isDM, myPlayerId, selectedEnemyId, enemyPopup, sendAction])

  const handleEnemyClick = useCallback((enemyId: string, screenPos: { x: number; y: number }) => {
    const enemy = findEnemyInDungeon(dungeon, enemyId)
    if (!enemy) return

    if (enemyPopup?.enemyId === enemyId) {
      setEnemyPopup(null)
      if (isDM) setSelectedEnemyId(null)
      return
    }

    setEnemyPopup({ enemyId, enemy, screenX: screenPos.x, screenY: screenPos.y })
    setEnemyHpInput('')

    if (isDM) {
      setSelectedEnemyId(enemyId)
      setDmSelectedPlayer('')
    }
  }, [isDM, dungeon, enemyPopup])

  const handleLootClick = useCallback((lootId: string) => {
    if (gameState.collectedLoot.has(lootId)) return
    const item = findItemInDungeon(dungeon, lootId)
    if (!item) return

    const lootPos = gameState.lootPositions[lootId]
    if (!lootPos) return

    const player = gameState.players.find(p => p.id === activePlayerId)
    const canTake = !!player
      && Math.abs(player.position.x - lootPos.x) <= 1
      && Math.abs(player.position.y - lootPos.y) <= 1

    setInspectTarget({ kind: 'loot', item, lootId, canTake })
  }, [dungeon, gameState.lootPositions, gameState.players, gameState.collectedLoot, activePlayerId])

  const handleRequestDmNotes = useCallback(() => {
    if (!currentRoom) return
    sendAction({ type: 'addDmNote', roomId: currentRoom.id })
  }, [currentRoom, sendAction])

  const handleDefeatEnemy = useCallback((enemyId: string, enemyName: string) => {
    sendAction({ type: 'defeatEnemy', enemyId, enemyName })
    if (selectedEnemyId === enemyId) setSelectedEnemyId(null)
    if (enemyPopup?.enemyId === enemyId) setEnemyPopup(null)
  }, [selectedEnemyId, enemyPopup, sendAction])

  const handleAdjustEnemyHp = useCallback((enemyId: string, delta: number) => {
    sendAction({ type: 'adjustEnemyHp', enemyId, delta })
  }, [sendAction])

  const handleCollectLoot = useCallback((lootId: string, lootName: string) => {
    const collectorId = activePlayerId ?? 'p1'
    const collector = gameState.players.find(p => p.id === collectorId)
    const charName = collector?.characterName ?? 'Someone'
    sendAction({ type: 'collectLoot', lootId, lootName, playerId: collectorId, characterName: charName })
  }, [activePlayerId, gameState.players, sendAction])

  const handleAdjustHp = useCallback((playerId: string, delta: number) => {
    if (!isDM && playerId !== myPlayerId) return
    sendAction({ type: 'adjustHp', playerId, delta })
  }, [isDM, myPlayerId, sendAction])

  const handleAdjustResource = useCallback((playerId: string, resourceIndex: number, delta: number) => {
    if (!isDM && playerId !== myPlayerId) return
    sendAction({ type: 'adjustResource', playerId, resourceIndex, delta })
  }, [isDM, myPlayerId, sendAction])

  const handleUpdatePlayer = useCallback((playerId: string, updates: Record<string, unknown>) => {
    sendAction({ type: 'updatePlayer', playerId, updates } as any)
  }, [sendAction])

  const handleEquipWeapon = useCallback((playerId: string, weaponIndex: number) => {
    sendAction({ type: 'equipWeapon', playerId, weaponIndex } as any)
  }, [sendAction])

  const handleUnequipWeapon = useCallback((playerId: string, weaponIndex: number) => {
    sendAction({ type: 'unequipWeapon', playerId, weaponIndex } as any)
  }, [sendAction])

  const handleEquipArmor = useCallback((playerId: string, armorIndex: number) => {
    sendAction({ type: 'equipArmor', playerId, armorIndex } as any)
  }, [sendAction])

  const handleUnequipArmor = useCallback((playerId: string, armorIndex: number) => {
    sendAction({ type: 'unequipArmor', playerId, armorIndex } as any)
  }, [sendAction])

  const handleEquipFromInventory = useCallback((playerId: string, inventoryItemId: string) => {
    sendAction({ type: 'equipFromInventory', playerId, inventoryItemId } as any)
  }, [sendAction])

  const handleUnequipToInventory = useCallback((playerId: string, slot: 'weapon' | 'armor', index: number) => {
    sendAction({ type: 'unequipToInventory', playerId, slot, index } as any)
  }, [sendAction])

  const handleRoomClick = useCallback((roomId: string) => {
    sendAction({ type: 'setCurrentRoom', roomId })
  }, [sendAction])

  const isTraveling = gameState.phase === 'traveling'

  const handleStartTravel = useCallback((toId: string) => {
    const fromId = gameState.currentLocationId
    if (!fromId) return
    sendAction({ type: 'startTravel', fromId, toId })
  }, [gameState.currentLocationId, sendAction])

  const handleAdvanceTravel = useCallback(() => {
    sendAction({ type: 'advanceTravel' })
  }, [sendAction])

  const handleTriggerEvent = useCallback((eventId: string) => {
    sendAction({ type: 'triggerTravelEvent', eventId })
  }, [sendAction])

  const handleResolveEvent = useCallback(() => {
    sendAction({ type: 'resolveTravelEvent' })
  }, [sendAction])

  const handleArriveAtDestination = useCallback(() => {
    sendAction({ type: 'arriveAtDestination' })
  }, [sendAction])

  const initiativeActive = gameState.initiative !== null
  const currentTurnEntry = gameState.initiative
    ? gameState.initiative.entries[gameState.initiative.currentIndex]
    : null

  const isMyTurn = useMemo(() => {
    if (!currentTurnEntry) return false
    if (isDM) return true
    if (currentTurnEntry.type === 'player' && currentTurnEntry.id === myPlayerId) return true
    return false
  }, [currentTurnEntry, isDM, myPlayerId])

  const handleStartInitiative = useCallback(() => {
    if (!isDM) return
    const roomId = gameState.currentRoomId
    if (!roomId) return
    const entries = buildInitiativeEntries(gameState, dungeon, roomId)
    if (entries.length === 0) return
    sendAction({ type: 'startInitiative', entries })
  }, [isDM, gameState, dungeon, sendAction])

  const handleEndInitiative = useCallback(() => {
    if (!isDM) return
    sendAction({ type: 'endInitiative' })
  }, [isDM, sendAction])

  const handleEndTurn = useCallback(() => {
    sendAction({ type: 'endTurn' })
  }, [sendAction])

  const handleUpdateInitiativeRoll = useCallback((entryId: string, roll: number) => {
    sendAction({ type: 'updateInitiativeEntry', entryId, roll })
  }, [sendAction])

  if (myRole === null) {
    return <CharacterSelect players={DEFAULT_PLAYERS} onSelect={handleSelect} />
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <button className="leave-btn" onClick={handleLeave}>
            &larr; Leave
          </button>
          <h1>{dungeon.name}</h1>
          <span className={`connection-dot ${connected ? 'connected' : 'disconnected'}`}
                title={connected ? 'Connected' : 'Disconnected'} />
        </div>
        <div className="header-controls">
          {isDM ? (
            <div className="player-select">
              {gameState.players.map(p => (
                <button
                  key={p.id}
                  className={`player-token-btn ${dmSelectedPlayer === p.id && !selectedEnemyId ? 'active' : ''}`}
                  style={{
                    borderColor: p.tokenColor,
                    backgroundColor: dmSelectedPlayer === p.id && !selectedEnemyId ? p.tokenColor : 'transparent',
                    color: dmSelectedPlayer === p.id && !selectedEnemyId ? '#fff' : p.tokenColor,
                  }}
                  onClick={() => { setDmSelectedPlayer(p.id); setSelectedEnemyId(null) }}
                >
                  {p.characterName}
                </button>
              ))}
              {initiativeActive ? (
                <button className="initiative-btn initiative-btn--end" onClick={handleEndInitiative}>
                  End Initiative
                </button>
              ) : (
                <button className="initiative-btn initiative-btn--start" onClick={handleStartInitiative}>
                  Start Initiative
                </button>
              )}
              <button
                className={`pause-btn ${isPaused ? 'pause-btn--active' : ''}`}
                onClick={handleTogglePause}
              >
                {isPaused ? '▶ Resume' : '⏸ Pause'}
              </button>
              <span className="role-badge role-badge--dm">DM</span>
              <button
                className={`dice-btn ${diceOpen ? 'dice-btn--active' : ''}`}
                onClick={() => setDiceOpen(v => !v)}
              >
                <svg width="16" height="16" viewBox="0 0 28 28"><polygon points="14,1 26,8 26,20 14,27 2,20 2,8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><text x="14" y="18" textAnchor="middle" fill="currentColor" fontSize="8" fontWeight="bold">20</text></svg>
                Dice
              </button>
              <button
                ref={logBtnRef}
                className={`dice-btn ${logOpen ? 'dice-btn--active' : ''}`}
                onClick={() => setLogOpen(v => !v)}
              >
                <svg width="16" height="16" viewBox="0 0 28 28"><rect x="4" y="2" width="20" height="24" rx="2" fill="none" stroke="currentColor" strokeWidth="2" /><line x1="9" y1="8" x2="19" y2="8" stroke="currentColor" strokeWidth="1.5" /><line x1="9" y1="13" x2="19" y2="13" stroke="currentColor" strokeWidth="1.5" /><line x1="9" y1="18" x2="15" y2="18" stroke="currentColor" strokeWidth="1.5" /></svg>
                Log
              </button>
            </div>
          ) : (
            <div className="player-select">
              <span
                className="player-token-btn active"
                style={{
                  borderColor: myPlayer?.tokenColor,
                  backgroundColor: myPlayer?.tokenColor,
                  color: '#fff',
                }}
              >
                {myPlayer?.characterName}
              </span>
              <button
                className={`dice-btn ${diceOpen ? 'dice-btn--active' : ''}`}
                onClick={() => setDiceOpen(v => !v)}
              >
                <svg width="16" height="16" viewBox="0 0 28 28"><polygon points="14,1 26,8 26,20 14,27 2,20 2,8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><text x="14" y="18" textAnchor="middle" fill="currentColor" fontSize="8" fontWeight="bold">20</text></svg>
                Dice
              </button>
              <button
                className={`dice-btn ${logOpen ? 'dice-btn--active' : ''}`}
                onClick={() => setLogOpen(v => !v)}
              >
                <svg width="16" height="16" viewBox="0 0 28 28"><rect x="4" y="2" width="20" height="24" rx="2" fill="none" stroke="currentColor" strokeWidth="2" /><line x1="9" y1="8" x2="19" y2="8" stroke="currentColor" strokeWidth="1.5" /><line x1="9" y1="13" x2="19" y2="13" stroke="currentColor" strokeWidth="1.5" /><line x1="9" y1="18" x2="15" y2="18" stroke="currentColor" strokeWidth="1.5" /></svg>
                Log
              </button>
            </div>
          )}
        </div>
      </header>

      {isPaused && (
        <div className="pause-banner">
          ⏸ Time is paused
        </div>
      )}

      {gameState.initiative && (
        <div className="initiative-tracker">
          <div className="initiative-tracker-label">
            <span className="initiative-round">Round {gameState.initiative.round}</span>
          </div>
          <div className="initiative-entries">
            {gameState.initiative.entries.map((entry, i) => {
              const isCurrent = i === gameState.initiative!.currentIndex
              const player = entry.type === 'player'
                ? gameState.players.find(p => p.id === entry.id)
                : null
              return (
                <div
                  key={entry.id}
                  className={`initiative-entry ${isCurrent ? 'initiative-entry--active' : ''} initiative-entry--${entry.type}`}
                  style={player ? { borderColor: player.tokenColor } : undefined}
                >
                  <span className="initiative-entry-name">{entry.name}</span>
                  <span className="initiative-entry-roll">{entry.roll}</span>
                  {isDM && (
                    <input
                      className="initiative-roll-input"
                      type="number"
                      defaultValue={entry.roll}
                      onBlur={(e) => {
                        const val = parseInt(e.target.value)
                        if (!isNaN(val) && val !== entry.roll) {
                          handleUpdateInitiativeRoll(entry.id, val)
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          (e.target as HTMLInputElement).blur()
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                </div>
              )
            })}
          </div>
          <div className="initiative-status">
            <span className="initiative-movement">
              Move: {gameState.initiative.movementRemaining} cells
            </span>
            {(isMyTurn || isDM) && (
              <button className="end-turn-btn" onClick={handleEndTurn}>
                End Turn
              </button>
            )}
          </div>
        </div>
      )}

      <div className="app-body">
        {isTraveling && gameState.travel ? (
          <div className="travel-column">
            <TravelView
              campaign={campaign}
              travel={gameState.travel}
              discoveredLocationIds={gameState.discoveredLocationIds}
              isDM={isDM}
              onAdvance={handleAdvanceTravel}
              onTriggerEvent={handleTriggerEvent}
              onResolveEvent={handleResolveEvent}
              onArrive={handleArriveAtDestination}
            />
          </div>
        ) : (
          <div className="map-column">
            <DungeonMap
              dungeon={dungeon}
              revealedRooms={gameState.revealedRooms}
              players={gameState.players}
              selectedPlayerId={activePlayerId}
              isDM={isDM}
              defeatedEnemies={gameState.defeatedEnemies}
              enemyPositions={gameState.enemyPositions}
              enemyHp={gameState.enemyHp}
              selectedEnemyId={selectedEnemyId}
              lootPositions={gameState.lootPositions}
              collectedLoot={gameState.collectedLoot}
              visionDistanceFt={gameState.visionDistanceFt}
              exploredCells={gameState.exploredCells}
              onCellClick={handleCellClick}
              onEnemyClick={handleEnemyClick}
              onLootClick={handleLootClick}
            />
            <div className="map-toggle-row">
              {isDM && (
                <div className="vision-control">
                  <span className="vision-label">Vision</span>
                  <button className="vision-btn" onClick={() => handleSetVisionDistance(gameState.visionDistanceFt - 5)}>-</button>
                  <input
                    type="number"
                    className="vision-input"
                    value={gameState.visionDistanceFt}
                    min={5}
                    max={300}
                    step={5}
                    onChange={(e) => {
                      const v = parseInt(e.target.value)
                      if (!isNaN(v)) handleSetVisionDistance(v)
                    }}
                  />
                  <span className="vision-unit">ft</span>
                  <button className="vision-btn" onClick={() => handleSetVisionDistance(gameState.visionDistanceFt + 5)}>+</button>
                </div>
              )}
              <button
                ref={mapBtnRef}
                className={`map-toggle-btn ${mapOpen ? 'map-toggle-btn--active' : ''}`}
                onClick={() => setMapOpen(v => !v)}
              >
                {mapOpen ? 'Close World Map' : 'World Map'}
              </button>
            </div>
            <FloatingPanel
              title={campaign.name}
              open={mapOpen}
              onClose={() => setMapOpen(false)}
              anchorRef={mapBtnRef}
              defaultWidth={600}
              defaultHeight={500}
              minWidth={320}
              minHeight={260}
            >
              <WorldMap
                campaign={campaign}
                discoveredLocationIds={gameState.discoveredLocationIds}
                currentLocationId={gameState.currentLocationId}
                isDM={isDM}
                isTraveling={isTraveling}
                onStartTravel={isDM ? handleStartTravel : undefined}
              />
            </FloatingPanel>
            <div className="room-list">
              {dungeon.rooms
                .filter(r => isDM || gameState.revealedRooms.has(r.id))
                .map(r => (
                  <button
                    key={r.id}
                    className={`room-btn ${gameState.currentRoomId === r.id ? 'active' : ''}`}
                    onClick={() => handleRoomClick(r.id)}
                  >
                    {r.name}
                    {r.enemies.length > 0 && !r.enemies.every(e => gameState.defeatedEnemies.has(e.id)) && ' ⚔️'}
                    {!gameState.revealedRooms.has(r.id) && isDM && ' 🌫️'}
                  </button>
                ))}
            </div>
          </div>
        )}

        <div className="context-column">
          <ContextPane
            currentRoom={currentRoom}
            isDM={isDM}
            players={gameState.players}
            myPlayerId={myPlayerId}
            dmSelectedPlayerId={isDM ? dmSelectedPlayer : null}
            playerLogs={gameState.playerLogs}
            collectedLoot={gameState.collectedLoot}
            defeatedEnemies={gameState.defeatedEnemies}
            dungeon={dungeon}
            onRequestDmNotes={handleRequestDmNotes}
            onDefeatEnemy={handleDefeatEnemy}
            onCollectLoot={handleCollectLoot}
            onAdjustHp={handleAdjustHp}
            onAdjustResource={handleAdjustResource}
            onUpdatePlayer={handleUpdatePlayer}
            onEquipWeapon={handleEquipWeapon}
            onUnequipWeapon={handleUnequipWeapon}
            onEquipArmor={handleEquipArmor}
            onUnequipArmor={handleUnequipArmor}
            onEquipFromInventory={handleEquipFromInventory}
            onUnequipToInventory={handleUnequipToInventory}
          />
        </div>
      </div>

      {enemyPopup && createPortal(
        <div
          className="enemy-popover"
          style={{
            left: Math.min(enemyPopup.screenX + 12, window.innerWidth - 300),
            top: Math.min(enemyPopup.screenY - 20, window.innerHeight - 400),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="enemy-popover-header">
            <span className="enemy-popover-icon">🦎</span>
            <h3>{enemyPopup.enemy.name}</h3>
            <button className="enemy-popover-close" onClick={() => { setEnemyPopup(null); if (isDM) setSelectedEnemyId(null) }}>×</button>
          </div>

          {isDM ? (
            <>
              {/* DM: HP bar */}
              {(() => {
                const currentHp = gameState.enemyHp[enemyPopup.enemyId] ?? enemyPopup.enemy.hp
                const ratio = currentHp / enemyPopup.enemy.maxHp
                const hpCol = ratio > 0.6 ? '#2ecc71' : ratio > 0.3 ? '#f1c40f' : '#e74c3c'
                return (
                  <div className="enemy-popover-hp-section">
                    <div className="enemy-popover-hp-label">
                      <span>HP</span>
                      <span className="enemy-popover-hp-text">{currentHp}/{enemyPopup.enemy.maxHp}</span>
                    </div>
                    <div className="enemy-popover-hp-track">
                      <div className="enemy-popover-hp-fill" style={{ width: `${ratio * 100}%`, backgroundColor: hpCol }} />
                    </div>
                    <div className="enemy-popover-hp-controls">
                      <button className="hp-btn hp-btn--dmg" onClick={() => handleAdjustEnemyHp(enemyPopup.enemyId, -1)}>-1</button>
                      <button className="hp-btn hp-btn--dmg" onClick={() => handleAdjustEnemyHp(enemyPopup.enemyId, -5)}>-5</button>
                      <input
                        className="hp-input"
                        type="number"
                        placeholder="±"
                        value={enemyHpInput}
                        onChange={(e) => setEnemyHpInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = parseInt(enemyHpInput)
                            if (!isNaN(val)) { handleAdjustEnemyHp(enemyPopup.enemyId, val); setEnemyHpInput('') }
                          }
                        }}
                      />
                      <button className="hp-btn hp-btn--heal" onClick={() => handleAdjustEnemyHp(enemyPopup.enemyId, 5)}>+5</button>
                      <button className="hp-btn hp-btn--heal" onClick={() => handleAdjustEnemyHp(enemyPopup.enemyId, 1)}>+1</button>
                    </div>
                  </div>
                )
              })()}

              {/* DM: stat grid */}
              <div className="enemy-popover-stats">
                <div className="enemy-popover-stat">
                  <span className="enemy-popover-stat-label">AC</span>
                  <span className="enemy-popover-stat-value">{enemyPopup.enemy.ac}</span>
                </div>
                <div className="enemy-popover-stat">
                  <span className="enemy-popover-stat-label">CR</span>
                  <span className="enemy-popover-stat-value">{enemyPopup.enemy.cr}</span>
                </div>
                <div className="enemy-popover-stat">
                  <span className="enemy-popover-stat-label">Speed</span>
                  <span className="enemy-popover-stat-value">{enemyPopup.enemy.speed}</span>
                </div>
              </div>

              {/* DM: attacks */}
              <div className="enemy-popover-section">
                <h4>Attacks</h4>
                {enemyPopup.enemy.attacks.map((a, i) => (
                  <div key={i} className="enemy-popover-attack">
                    <strong>{a.name}</strong>
                    <span className="enemy-popover-attack-info">+{a.toHit} to hit, {a.damage}</span>
                    {a.reach && <span className="enemy-popover-attack-reach">{a.reach}</span>}
                  </div>
                ))}
              </div>

              {/* DM: abilities */}
              {enemyPopup.enemy.abilities && enemyPopup.enemy.abilities.length > 0 && (
                <div className="enemy-popover-section">
                  <h4>Abilities</h4>
                  {enemyPopup.enemy.abilities.map((ab, i) => (
                    <div key={i} className="enemy-popover-ability">{ab}</div>
                  ))}
                </div>
              )}

              {/* DM: defeat button */}
              <div className="enemy-popover-actions">
                <button className="defeat-btn" onClick={() => handleDefeatEnemy(enemyPopup.enemyId, enemyPopup.enemy.name)}>
                  Defeat
                </button>
              </div>
            </>
          ) : (
            /* Player: minimal info */
            <div className="enemy-popover-player-view">
              <div className="enemy-popover-stat-row">
                <span className="enemy-popover-stat-label">CR</span>
                <span className="enemy-popover-stat-value">{enemyPopup.enemy.cr}</span>
              </div>
              <div className="enemy-popover-stat-row">
                <span className="enemy-popover-stat-label">Attacks</span>
                <span className="enemy-popover-stat-value">{enemyPopup.enemy.attacks.length}</span>
              </div>
            </div>
          )}
        </div>,
        document.body
      )}

      {inspectTarget && createPortal(
        <>
          <div className="inspect-backdrop" onClick={() => setInspectTarget(null)} />
          <div className={`inspect-popup ${inspectTarget.item.category === 'weapon' && inspectTarget.item.magical ? 'inspect-popup--magic-weapon' : ''}`}>
            <div className="inspect-header">
              <span className="inspect-icon">
                {inspectTarget.item.category === 'weapon' && inspectTarget.item.magical ? (
                  <svg width="28" height="28" viewBox="-18 -20 36 40" style={{ filter: 'drop-shadow(0 0 4px rgba(100,200,255,0.6))' }}>
                    <defs>
                      <linearGradient id="inspectBlade" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#c0dff8" />
                        <stop offset="40%" stopColor="#8bb8e0" />
                        <stop offset="100%" stopColor="#6a9ec4" />
                      </linearGradient>
                    </defs>
                    <g transform="rotate(-45)">
                      <path d="M 0,-16 L 3,-12 2.5,-2 0,2 -2.5,-2 -3,-12 Z" fill="url(#inspectBlade)" stroke="#a0d4ff" strokeWidth={0.6} />
                      <line x1="0" y1="-14" x2="0" y2="-2" stroke="rgba(150,220,255,0.5)" strokeWidth={0.8} />
                      <path d="M 0,-16 L 1.5,-13 -1.5,-13 Z" fill="rgba(200,240,255,0.8)" />
                      <rect x="-6" y="1" width="12" height="2.5" rx="0.8" fill="#8b7535" stroke="#c9a227" strokeWidth={0.4} />
                      <rect x="-1.5" y="3.5" width="3" height="7" rx="0.6" fill="#5a3a1a" stroke="#3a2510" strokeWidth={0.3} />
                      <circle cx="0" cy="11.5" r="2" fill="#8b7535" stroke="#c9a227" strokeWidth={0.4} />
                      <circle cx="0" cy="11.5" r="0.8" fill="#64c8ff" />
                    </g>
                  </svg>
                ) : inspectTarget.item.magical ? '✨' : '📦'}
              </span>
              <h3>
                {inspectTarget.item.name}
                {inspectTarget.item.magical && <span className="inspect-magical-badge">Magical</span>}
              </h3>
              <button className="inspect-close" onClick={() => setInspectTarget(null)}>×</button>
            </div>
            <p className="inspect-description">{inspectTarget.item.description}</p>
            {inspectTarget.item.category === 'weapon' && inspectTarget.item.damage && (
              <div className="inspect-weapon-stats">
                <div className="inspect-weapon-stat">
                  <span className="inspect-weapon-stat-value">+{inspectTarget.item.attackBonus ?? 0}</span>
                  <span className="inspect-weapon-stat-label">To Hit</span>
                </div>
                <div className="inspect-weapon-stat-divider" />
                <div className="inspect-weapon-stat">
                  <span className="inspect-weapon-stat-value">{inspectTarget.item.damage}</span>
                  <span className="inspect-weapon-stat-label">{inspectTarget.item.damageType}</span>
                </div>
                {inspectTarget.item.weaponProperties && inspectTarget.item.weaponProperties.length > 0 && (
                  <>
                    <div className="inspect-weapon-stat-divider" />
                    <div className="inspect-weapon-props">
                      {inspectTarget.item.weaponProperties.map((prop, i) => (
                        <span key={i} className="inspect-weapon-prop-tag">{prop}</span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            {inspectTarget.item.value !== undefined && inspectTarget.item.value > 0 && (
              <div className="inspect-value">{inspectTarget.item.value} gp</div>
            )}
            <div className="inspect-actions">
              {inspectTarget.canTake ? (
                <>
                  <button
                    className="inspect-take-btn"
                    onClick={() => {
                      if (inspectTarget.kind === 'loot') {
                        handleCollectLoot(inspectTarget.lootId, inspectTarget.item.name)
                      }
                      setInspectTarget(null)
                    }}
                  >
                    Take
                  </button>
                  <button className="inspect-leave-btn" onClick={() => setInspectTarget(null)}>Leave</button>
                </>
              ) : (
                <>
                  <button className="inspect-leave-btn" onClick={() => setInspectTarget(null)}>Close</button>
                  <span className="inspect-too-far">Move closer to pick up</span>
                </>
              )}
            </div>
          </div>
        </>,
        document.body
      )}

      <FloatingPanel
        title="Encounter Log"
        open={logOpen}
        onClose={() => setLogOpen(false)}
        anchorRef={logBtnRef}
        defaultWidth={420}
        defaultHeight={360}
        minWidth={260}
        minHeight={180}
      >
        <div className="log-overlay-body">
          {gameState.chatLog.map(msg => {
            const style = LOG_MESSAGE_STYLES[msg.type] || LOG_MESSAGE_STYLES.system
            if (msg.type === 'dm_note' && !isDM) return null
            if (msg.type === 'golden' && !isDM) return null

            const displayText = (msg.type === 'combat' && !isDM)
              ? filterCombatForPlayer(msg.text)
              : msg.text

            if (msg.type === 'dice') {
              const rollData = gameState.diceRolls.find(r => `dice-${r.id}` === msg.id)
              const player = gameState.players.find(p => p.characterName === msg.sender)
              const tokenColor = rollData?.tokenColor ?? player?.tokenColor ?? '#8e44ad'
              return (
                <div
                  key={msg.id}
                  className="chat-message chat-message--dice"
                  style={{
                    backgroundColor: style.bg,
                    borderLeft: `3px solid ${tokenColor}`,
                  }}
                >
                  <div className="dice-log-header">
                    <span className="dice-log-dot" style={{ backgroundColor: tokenColor }} />
                    <span className="dice-log-name">{msg.sender}</span>
                  </div>
                  <div className="chat-message-text">
                    {displayText.split('\n').map((line, i) => (
                      <div key={i}>{line || '\u00A0'}</div>
                    ))}
                  </div>
                </div>
              )
            }

            return (
              <div
                key={msg.id}
                className={`chat-message chat-message--${msg.type}`}
                style={{
                  backgroundColor: style.bg,
                  borderLeft: `3px solid ${style.border}`,
                }}
              >
                {style.label && (
                  <div className="chat-message-label">{style.label}</div>
                )}
                {msg.type === 'player' && (
                  <div className="chat-message-sender">{msg.sender}</div>
                )}
                <div className="chat-message-text">
                  {displayText.split('\n').map((line, i) => (
                    <div key={i}>{line || '\u00A0'}</div>
                  ))}
                </div>
              </div>
            )
          })}
          <div ref={logBottomRef} />
        </div>
      </FloatingPanel>

      <DiceRoller
        open={diceOpen}
        onClose={() => setDiceOpen(false)}
        player={isDM
          ? gameState.players.find(p => p.id === dmSelectedPlayer) ?? gameState.players[0] ?? null
          : myPlayer ?? null
        }
        isDM={isDM}
        sendAction={sendAction}
        recentRolls={gameState.diceRolls}
      />
    </div>
  )
}
