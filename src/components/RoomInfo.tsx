import { useState } from 'react'
import type { Room } from '../types/dungeon'
import type { Player, PlayerLogEntry } from '../types/game'

interface Props {
  room: Room | null
  isDM: boolean
  defeatedEnemies: Set<string>
  collectedLoot: Set<string>
  players: Player[]
  myPlayerId: string | null
  playerLogs: Record<string, PlayerLogEntry[]>
  onDefeatEnemy: (id: string, name: string) => void
  onCollectLoot: (id: string, name: string) => void
  onAdjustHp: (playerId: string, delta: number) => void
}

export default function RoomInfo({
  room, isDM, defeatedEnemies, collectedLoot,
  players, myPlayerId, playerLogs,
  onDefeatEnemy, onCollectLoot, onAdjustHp
}: Props) {
  const [hpInput, setHpInput] = useState<Record<string, string>>({})
  const [logPlayerId, setLogPlayerId] = useState<string | null>(null)
  const [logOpen, setLogOpen] = useState(false)

  const viewingLogId = isDM ? (logPlayerId ?? players[0]?.id) : myPlayerId
  const viewingLog = viewingLogId ? playerLogs[viewingLogId] ?? [] : []
  const viewingPlayer = players.find(p => p.id === viewingLogId)

  const visiblePlayers = isDM ? players : players.filter(p => p.id === myPlayerId)

  return (
    <div className="room-info">
      {/* HP controls */}
      <div className="room-info-section">
        <h4>Characters</h4>
        {visiblePlayers.map(p => {
          const ratio = p.hp / p.maxHp
          const barColor = ratio > 0.6 ? '#2ecc71' : ratio > 0.3 ? '#f1c40f' : '#e74c3c'
          return (
            <div key={p.id} className="player-hp-card">
              <div className="player-hp-header">
                <span className="player-hp-dot" style={{ backgroundColor: p.tokenColor }} />
                <strong>{p.characterName}</strong>
                <span className="player-hp-text">{p.hp}/{p.maxHp}</span>
              </div>
              <div className="player-hp-bar-track">
                <div
                  className="player-hp-bar-fill"
                  style={{ width: `${(ratio) * 100}%`, backgroundColor: barColor }}
                />
              </div>
              {(isDM || p.id === myPlayerId) && (
                <div className="player-hp-controls">
                  <button className="hp-btn hp-btn--dmg" onClick={() => onAdjustHp(p.id, -(parseInt(hpInput[p.id] || '1', 10) || 1))}>
                    -{hpInput[p.id] || '1'}
                  </button>
                  <input
                    type="number"
                    className="hp-input"
                    value={hpInput[p.id] ?? ''}
                    placeholder="1"
                    min="1"
                    onChange={e => setHpInput(prev => ({ ...prev, [p.id]: e.target.value }))}
                  />
                  <button className="hp-btn hp-btn--heal" onClick={() => onAdjustHp(p.id, parseInt(hpInput[p.id] || '1', 10) || 1)}>
                    +{hpInput[p.id] || '1'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Room details */}
      {room && (
        <>
          <h3>{room.name}</h3>

          {room.enemies.filter(e => !defeatedEnemies.has(e.id)).length > 0 && (
            <div className="room-info-section">
              <h4>Enemies</h4>
              {room.enemies.filter(e => !defeatedEnemies.has(e.id)).map(e => (
                <div key={e.id} className="enemy-card">
                  <div className="enemy-header">
                    <strong>{e.name}</strong>
                    {isDM && (
                      <button className="defeat-btn" onClick={() => onDefeatEnemy(e.id, e.name)}>
                        Defeat
                      </button>
                    )}
                  </div>
                  {isDM && (
                    <>
                      <div className="enemy-stats">
                        AC {e.ac} | HP {e.hp}/{e.maxHp} | CR {e.cr}
                      </div>
                      <div className="enemy-attacks">
                        {e.attacks.map((a, i) => (
                          <div key={i} className="attack-line">
                            {a.name}: +{a.toHit}, {a.damage}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {room.loot.filter(l => !collectedLoot.has(l.id)).length > 0 && (
            <div className="room-info-section">
              <h4>Loot</h4>
              {room.loot.filter(l => !collectedLoot.has(l.id)).map(l => (
                <div key={l.id} className="loot-card">
                  <div className="loot-header">
                    <strong>{l.name}</strong>
                    {l.magical && <span className="magical-badge">Magical</span>}
                    <button className="collect-btn" onClick={() => onCollectLoot(l.id, l.name)}>
                      Take
                    </button>
                  </div>
                  <div className="loot-desc">{l.description}</div>
                </div>
              ))}
            </div>
          )}

          {room.npcs.length > 0 && (
            <div className="room-info-section">
              <h4>NPCs</h4>
              {room.npcs.map(npc => (
                <div key={npc.id} className="npc-card">
                  <strong>{npc.name}</strong> — {npc.occupation}
                  <div className="npc-desc">{npc.description}</div>
                  {isDM && npc.dmNotes && (
                    <div className="npc-dm-notes">{npc.dmNotes}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!room && (
        <p className="room-info-empty">Move into a room to see details.</p>
      )}

      {/* Player log */}
      <div className="player-log-section">
        <button className="player-log-toggle" onClick={() => setLogOpen(!logOpen)}>
          {logOpen ? '▾' : '▸'} Adventure Log
          {isDM && viewingPlayer && ` (${viewingPlayer.characterName})`}
        </button>

        {logOpen && (
          <>
            {isDM && (
              <div className="player-log-select">
                {players.map(p => (
                  <button
                    key={p.id}
                    className={`player-log-tab ${viewingLogId === p.id ? 'active' : ''}`}
                    style={{ borderColor: p.tokenColor, color: viewingLogId === p.id ? '#fff' : p.tokenColor, backgroundColor: viewingLogId === p.id ? p.tokenColor : 'transparent' }}
                    onClick={() => setLogPlayerId(p.id)}
                  >
                    {p.characterName[0]}
                  </button>
                ))}
              </div>
            )}
            <div className="player-log-entries">
              {viewingLog.length === 0 && (
                <div className="player-log-empty">No events yet.</div>
              )}
              {viewingLog.map(entry => (
                <div key={entry.id} className={`player-log-entry player-log-entry--${entry.type}`}>
                  {entry.type === 'loot' && '📦 '}
                  {entry.type === 'damage' && '💔 '}
                  {entry.type === 'heal' && '💚 '}
                  {entry.type === 'event' && '📍 '}
                  {entry.text}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
