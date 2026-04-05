import React, { useCallback, useMemo, useState } from 'react'
import type { Dungeon } from '../types/dungeon'
import type { Player } from '../types/game'
import { isCellVisible } from '../engine/gameEngine'

export type MapTheme = 'classic' | 'cave' | 'crypt' | 'forest' | 'infernal'

interface ThemeDef {
  label: string
  bg: [string, string]
  fog: string
  shadow: string
  ambientTint: string
  swatch: [string, string]
}

const THEMES: Record<MapTheme, ThemeDef> = {
  classic: {
    label: 'Dungeon',
    bg: ['#16162e', '#0a0a18'], fog: '#08081a',
    shadow: 'rgba(0,0,10,0.55)', ambientTint: 'rgba(100,100,180,0.04)',
    swatch: ['#22223a', '#3e3e5e'],
  },
  cave: {
    label: 'Cave',
    bg: ['#1a1408', '#0c0804'], fog: '#0e0a04',
    shadow: 'rgba(10,5,0,0.55)', ambientTint: 'rgba(180,140,80,0.05)',
    swatch: ['#4a3828', '#7a6850'],
  },
  crypt: {
    label: 'Crypt',
    bg: ['#101418', '#080a0e'], fog: '#060810',
    shadow: 'rgba(0,0,8,0.6)', ambientTint: 'rgba(120,140,180,0.05)',
    swatch: ['#2a2e36', '#404852'],
  },
  forest: {
    label: 'Forest',
    bg: ['#0c1a0c', '#040e04'], fog: '#040c04',
    shadow: 'rgba(0,8,0,0.5)', ambientTint: 'rgba(80,160,60,0.05)',
    swatch: ['#1e3e22', '#3e5e3c'],
  },
  infernal: {
    label: 'Infernal',
    bg: ['#200c08', '#100404'], fog: '#0c0404',
    shadow: 'rgba(10,0,0,0.55)', ambientTint: 'rgba(255,60,20,0.06)',
    swatch: ['#382020', '#603838'],
  },
}

// feColorMatrix values per theme — transforms the base Kenney tiles
const THEME_FILTERS: Record<MapTheme, string> = {
  classic: '0.6 0.1 0.1 0 0.05  0.1 0.5 0.2 0 0.05  0.2 0.2 0.7 0 0.1  0 0 0 1 0',
  cave:    '0.9 0.2 0.0 0 0.0   0.3 0.7 0.1 0 -0.05  0.0 0.1 0.4 0 -0.05  0 0 0 1 0',
  crypt:   '0.5 0.2 0.2 0 -0.05  0.2 0.5 0.2 0 -0.05  0.2 0.2 0.6 0 0.05  0 0 0 1 0',
  forest:  '0.3 0.2 0.0 0 0.0   0.2 0.8 0.1 0 0.05  0.1 0.3 0.5 0 -0.02  0 0 0 1 0',
  infernal:'1.0 0.1 0.0 0 0.05  0.2 0.3 0.0 0 -0.05  0.0 0.05 0.3 0 -0.05  0 0 0 1 0',
}

const FLOOR_TILES = ['/tilesets/floor_0.png', '/tilesets/floor_1.png', '/tilesets/floor_2.png', '/tilesets/floor_3.png']
const WALL_TILES = ['/tilesets/wall_0.png', '/tilesets/wall_1.png', '/tilesets/wall_2.png', '/tilesets/wall_3.png']
const DOOR_TILE = '/tilesets/door.png'
const STAIRS_TILE = '/tilesets/stairs.png'
const WATER_TILE = '/tilesets/water.png'
const VOID_TILE = '/tilesets/void.png'

interface Props {
  dungeon: Dungeon
  revealedRooms: Set<string>
  players: Player[]
  selectedPlayerId: string | null
  isDM: boolean
  defeatedEnemies: Set<string>
  enemyPositions: Record<string, { x: number; y: number }>
  enemyHp: Record<string, number>
  selectedEnemyId: string | null
  lootPositions: Record<string, { x: number; y: number }>
  collectedLoot: Set<string>
  visionDistanceFt: number
  exploredCells: Set<string>
  onCellClick: (x: number, y: number) => void
  onEnemyClick: (enemyId: string, screenPos: { x: number; y: number }) => void
  onLootClick: (lootId: string) => void
}

const S = 32

function hpColor(ratio: number): string {
  if (ratio > 0.6) return '#2ecc71'
  if (ratio > 0.3) return '#f1c40f'
  return '#e74c3c'
}

function h(x: number, y: number, seed = 0): number {
  let v = (x * 374761 + y * 668265 + seed * 982451) ^ (x * y * 1234 + seed)
  v = ((v >> 16) ^ v) * 0x45d9f3b
  v = ((v >> 16) ^ v) * 0x45d9f3b
  return (((v >> 16) ^ v) >>> 0) / 4294967295
}

function tileForCell(type: string, x: number, y: number): string {
  switch (type) {
    case 'wall': return WALL_TILES[Math.floor(h(x, y, 99) * WALL_TILES.length)]
    case 'floor': return FLOOR_TILES[Math.floor(h(x, y, 77) * FLOOR_TILES.length)]
    case 'door': return DOOR_TILE
    case 'water': return WATER_TILE
    case 'stairs': return STAIRS_TILE
    default: return VOID_TILE
  }
}

function cellDecor(theme: MapTheme, type: string, px: number, py: number, x: number, y: number): React.ReactNode {
  const r1 = h(x, y, 0), r2 = h(x, y, 1), r3 = h(x, y, 2), r4 = h(x, y, 3)
  const np = { pointerEvents: 'none' as const }

  if (type === 'floor') {
    if (theme === 'cave') {
      return <g style={np}>
        {r3 > 0.82 && <>
          <ellipse cx={px - 4 + r1 * 8} cy={py + 2 - r2 * 4} rx="2.5" ry="1.8" fill="#70a050" opacity="0.5" />
          <line x1={px - 4 + r1 * 8} y1={py + 2 - r2 * 4 + 1.5} x2={px - 4 + r1 * 8} y2={py + 2 - r2 * 4 + 4} stroke="#506030" strokeWidth="0.8" opacity="0.4" />
          <ellipse cx={px - 4 + r1 * 8} cy={py + 2 - r2 * 4} rx="3.5" ry="2.5" fill="#80c060" opacity="0.08" />
        </>}
        {r4 > 0.75 && <circle cx={px + 3 - r1 * 6} cy={py - 3 + r2 * 6} r={1 + r3 * 0.5} fill="#3a5858" opacity="0.25" />}
      </g>
    }
    if (theme === 'crypt') {
      return <g style={np}>
        {r1 > 0.6 && <line x1={px - 5 + r2 * 10} y1={py + 2 - r3 * 4} x2={px - 1 + r2 * 10} y2={py - 1 - r3 * 4} stroke="#8a8878" strokeWidth="1" opacity="0.3" strokeLinecap="round" />}
        {r3 > 0.88 && <>
          <circle cx={px - 2 + r1 * 4} cy={py - 1 + r2 * 2} r="3" fill="#7a7868" opacity="0.3" />
          <circle cx={px - 3.2 + r1 * 4} cy={py - 1.5 + r2 * 2} r="0.7" fill="#060810" opacity="0.5" />
          <circle cx={px - 0.8 + r1 * 4} cy={py - 1.5 + r2 * 2} r="0.7" fill="#060810" opacity="0.5" />
        </>}
        {r4 > 0.8 && <>
          <rect x={px + 5 - r1 * 10 - 0.8} y={py - 2 + r2 * 4} width="1.6" height="4" rx="0.3" fill="#c8b870" opacity="0.4" />
          <circle cx={px + 5 - r1 * 10} cy={py - 3 + r2 * 4} r="1.5" fill="#ffaa30" opacity="0.15" />
          <circle cx={px + 5 - r1 * 10} cy={py - 3 + r2 * 4} r="0.6" fill="#ffe080" opacity="0.5" />
        </>}
      </g>
    }
    if (theme === 'forest') {
      return <g style={np}>
        {r1 > 0.25 && <g opacity="0.45">
          <line x1={px - 6 + r2 * 12} y1={py + 4} x2={px - 7 + r2 * 12} y2={py - 1} stroke="#4a8a30" strokeWidth="0.7" strokeLinecap="round" />
          <line x1={px - 6 + r2 * 12} y1={py + 4} x2={px - 5 + r2 * 12} y2={py - 2} stroke="#5a9a40" strokeWidth="0.6" strokeLinecap="round" />
          <line x1={px - 6 + r2 * 12} y1={py + 4} x2={px - 6 + r2 * 12} y2={py - 2.5} stroke="#408020" strokeWidth="0.7" strokeLinecap="round" />
        </g>}
        {r3 > 0.85 && <>
          <line x1={px + 2 - r1 * 4} y1={py + 3} x2={px + 2 - r1 * 4} y2={py - 1} stroke="#408020" strokeWidth="0.5" opacity="0.5" />
          <circle cx={px + 2 - r1 * 4} cy={py - 2} r="1.5" fill={r4 > 0.5 ? '#d8a0d0' : '#d0d050'} opacity="0.4" />
          <circle cx={px + 2 - r1 * 4} cy={py - 2} r="0.5" fill="#e8e080" opacity="0.5" />
        </>}
        {r4 > 0.7 && <ellipse cx={px - 3 + r1 * 6} cy={py - 4 + r2 * 8} rx="2" ry="1" fill="#8a6020" opacity="0.25" transform={`rotate(${r3 * 180},${px - 3 + r1 * 6},${py - 4 + r2 * 8})`} />}
        {r1 > 0.9 && <circle cx={px + 6 - r2 * 12} cy={py - 5 + r3 * 10} r="0.8" fill="#c0ff60" opacity="0.3" />}
      </g>
    }
    if (theme === 'infernal') {
      return <g style={np}>
        {r1 > 0.3 && <path d={`M${px - 8 + r2 * 16},${py - 4 + r3 * 4} l${4 + r4 * 4},${2 + r1 * 3} l${-2 + r2 * 3},${2 + r3 * 2}`} stroke="#ff6020" strokeWidth="0.8" fill="none" opacity="0.3" />}
        {r2 > 0.6 && <circle cx={px + 5 - r3 * 10} cy={py - 6 + r4 * 12} r={0.6 + r1 * 0.4} fill="#ff8020" opacity={0.3 + r2 * 0.2} />}
        {r4 > 0.7 && <circle cx={px - 3 + r1 * 6} cy={py - 4 + r2 * 8} r={0.4 + r3 * 0.3} fill="#ffaa40" opacity={0.2 + r4 * 0.15} />}
        {r3 > 0.5 && <circle cx={px + 4 - r1 * 8} cy={py + 3 - r2 * 6} r={1.5 + r4} fill="rgba(20,10,10,0.2)" />}
      </g>
    }
    return null
  }

  if (type === 'water' && theme === 'infernal') {
    return <g style={np}>
      <circle cx={px - 4 + r1 * 8} cy={py - 2 + r2 * 4} r={1.5 + r3 * 1.5} fill="#d86000" opacity="0.25" />
      <circle cx={px + 5 - r2 * 10} cy={py + 4 - r3 * 8} r={1 + r4} fill="#ff9030" opacity="0.2" />
      {r1 > 0.6 && <circle cx={px - 1 + r3 * 2} cy={py + r4 * 2} r="0.8" fill="#ffe060" opacity="0.35" />}
      {r4 > 0.5 && <path d={`M${px - 6 + r1 * 12},${py - 3 + r2 * 6} q${3},${-1} ${6},${0}`} stroke="#401000" strokeWidth="0.8" fill="none" opacity="0.3" />}
    </g>
  }

  return null
}

export default function DungeonMap({
  dungeon, revealedRooms, players, selectedPlayerId, isDM,
  defeatedEnemies, enemyPositions, enemyHp, selectedEnemyId,
  lootPositions, collectedLoot, visionDistanceFt, exploredCells,
  onCellClick, onEnemyClick, onLootClick
}: Props) {
  const { grid } = dungeon.map
  const height = grid.length
  const width = grid[0]?.length ?? 0

  const getPlayerAt = useCallback((x: number, y: number) => {
    return players.find(p => p.position.x === x && p.position.y === y)
  }, [players])

  const enemyByCell = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>()
    for (const [id, pos] of Object.entries(enemyPositions)) {
      if (defeatedEnemies.has(id)) continue
      map.set(`${pos.x},${pos.y}`, { id, name: findEnemyName(dungeon, id) })
    }
    return map
  }, [enemyPositions, defeatedEnemies, dungeon])

  const lootByCell = useMemo(() => {
    const map = new Map<string, { id: string; name: string; magical: boolean; category: string }>()
    for (const [id, pos] of Object.entries(lootPositions)) {
      if (collectedLoot.has(id)) continue
      const item = findLootItem(dungeon, id)
      map.set(`${pos.x},${pos.y}`, {
        id, name: item?.name ?? 'Item', magical: !!item?.magical, category: item?.category ?? 'gear',
      })
    }
    return map
  }, [lootPositions, collectedLoot, dungeon])

  const [theme, setTheme] = useState<MapTheme>('classic')
  const t = THEMES[theme]

  const HP_R = S / 2 - 1
  const HP_C = 2 * Math.PI * HP_R

  const isWallAt = useCallback((gx: number, gy: number) => {
    if (gy < 0 || gy >= height || gx < 0 || gx >= width) return true
    return grid[gy][gx].type === 'wall' || grid[gy][gx].type === 'empty'
  }, [grid, height, width])

  const sh = 10 // shadow depth in pixels

  return (
    <div className="dungeon-map-container" style={{ background: `radial-gradient(ellipse at center, ${t.bg[0]} 0%, ${t.bg[1]} 100%)` }}>
      <svg
        width={width * S} height={height * S}
        viewBox={`0 0 ${width * S} ${height * S}`}
        className="dungeon-map"
      >
        <defs>
          <linearGradient id="swordBlade" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#c0dff8" /><stop offset="50%" stopColor="#8bb8e0" /><stop offset="100%" stopColor="#6a9ec4" />
          </linearGradient>

          <linearGradient id="shN" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={t.shadow} /><stop offset="100%" stopColor="transparent" /></linearGradient>
          <linearGradient id="shS" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stopColor={t.shadow} /><stop offset="100%" stopColor="transparent" /></linearGradient>
          <linearGradient id="shW" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor={t.shadow} /><stop offset="100%" stopColor="transparent" /></linearGradient>
          <linearGradient id="shE" x1="1" y1="0" x2="0" y2="0"><stop offset="0%" stopColor={t.shadow} /><stop offset="100%" stopColor="transparent" /></linearGradient>

          <filter id="theme-color" colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values={THEME_FILTERS[theme]} />
          </filter>
        </defs>

        {grid.map((row, y) =>
          row.map((cell, x) => {
            const vc = visionDistanceFt / 5
            const vis = isCellVisible(dungeon, revealedRooms, players, x, y, vc)
            const exp = exploredCells.has(`${x},${y}`)
            const inRoom = cell.roomId && revealedRooms.has(cell.roomId)
            const pHere = getPlayerAt(x, y)
            const eHere = (vis || (isDM && inRoom)) ? enemyByCell.get(`${x},${y}`) : null
            const lHere = (vis || (isDM && inRoom)) ? lootByCell.get(`${x},${y}`) : null
            const isSel = pHere?.id === selectedPlayerId
            const isESel = eHere?.id === selectedEnemyId

            const walkable = cell.type !== 'wall' && cell.type !== 'empty'
            const isWall = cell.type === 'wall'
            const lit = vis && walkable
            const fog = !vis && exp && walkable
            const dm = isDM && walkable && !vis && !exp
            const vWall = isWall && (vis || isDM)
            const show = lit || fog || dm || vWall

            let op = 0
            if (lit) op = 1
            else if (fog) op = 0.35
            else if (dm) op = 0.15
            else if (vWall) op = isDM ? 0.5 : 0.3

            const cx = x * S + S / 2, cy = y * S + S / 2

            return (
              <g key={`${x}-${y}`}>
                {/* Base fog fill */}
                <rect x={x * S} y={y * S} width={S} height={S} fill={t.fog} />

                {/* Tile image */}
                {show && (
                  <image
                    href={tileForCell(cell.type, x, y)}
                    x={x * S} y={y * S} width={S} height={S}
                    opacity={op}
                    filter="url(#theme-color)"
                    onClick={() => onCellClick(x, y)}
                    style={{ cursor: lit ? 'pointer' : 'default', imageRendering: 'pixelated' }}
                  />
                )}

                {/* Ambient tint overlay */}
                {lit && <rect x={x * S} y={y * S} width={S} height={S} fill={t.ambientTint} style={np} />}

                {/* Wall-edge shadows */}
                {lit && isWallAt(x, y - 1) && <rect x={x * S} y={y * S} width={S} height={sh} fill="url(#shN)" style={np} />}
                {lit && isWallAt(x, y + 1) && <rect x={x * S} y={y * S + S - sh} width={S} height={sh} fill="url(#shS)" style={np} />}
                {lit && isWallAt(x - 1, y) && <rect x={x * S} y={y * S} width={sh} height={S} fill="url(#shW)" style={np} />}
                {lit && isWallAt(x + 1, y) && <rect x={x * S + S - sh} y={y * S} width={sh} height={S} fill="url(#shE)" style={np} />}

                {/* Per-cell decorations */}
                {show && op > 0.3 && cellDecor(theme, cell.type, cx, cy, x, y)}

                {/* Door frame highlight */}
                {lit && cell.type === 'door' && (
                  <rect x={x * S + 1} y={y * S + 1} width={S - 2} height={S - 2} rx="2"
                    fill="none" stroke="#d4a830" strokeWidth="1.2" opacity="0.4" style={np} />
                )}

                {/* Loot */}
                {(vis || isDM) && lHere && !pHere && !eHere && (
                  <g onClick={(e) => { e.stopPropagation(); onLootClick(lHere.id) }} style={{ cursor: 'pointer' }}>
                    <circle cx={cx} cy={cy} r={S / 2 - 1} fill="transparent" />
                    {lHere.category === 'weapon' && lHere.magical ? (
                      <g style={np}>
                        <circle cx={cx} cy={cy} r={S / 2 - 2} fill="none" stroke="rgba(100,200,255,0.6)" strokeWidth={1.5} className="magic-sword-aura" />
                        <circle cx={cx} cy={cy} r={S / 2 + 2} fill="none" stroke="rgba(100,200,255,0.25)" strokeWidth={1} className="magic-sword-aura-outer" />
                        <g transform={`translate(${cx},${cy}) rotate(-45) scale(0.65)`}>
                          <path d="M 0,-16 L 3,-12 2.5,-2 0,2 -2.5,-2 -3,-12 Z" fill="url(#swordBlade)" stroke="#a0d4ff" strokeWidth={0.6} className="magic-sword-blade" />
                          <line x1="0" y1="-14" x2="0" y2="-2" stroke="rgba(150,220,255,0.5)" strokeWidth={0.8} />
                          <path d="M 0,-16 L 1.5,-13 -1.5,-13 Z" fill="rgba(200,240,255,0.8)" />
                          <rect x="-6" y="1" width="12" height="2.5" rx="0.8" fill="#8b7535" stroke="#c9a227" strokeWidth={0.4} />
                          <circle cx="-5" cy="2.25" r="0.8" fill="#c9a227" /><circle cx="5" cy="2.25" r="0.8" fill="#c9a227" />
                          <rect x="-1.5" y="3.5" width="3" height="7" rx="0.6" fill="#5a3a1a" stroke="#3a2510" strokeWidth={0.3} />
                          <circle cx="0" cy="11.5" r="2" fill="#8b7535" stroke="#c9a227" strokeWidth={0.4} />
                          <circle cx="0" cy="11.5" r="0.8" fill="#64c8ff" className="magic-sword-gem" />
                        </g>
                      </g>
                    ) : (
                      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="central" fontSize={lHere.magical ? 16 : 14} style={np}>
                        {lHere.magical ? '✨' : '📦'}
                      </text>
                    )}
                  </g>
                )}

                {/* Enemies */}
                {(vis || isDM) && eHere && !pHere && (
                  <g onClick={(e) => { e.stopPropagation(); onEnemyClick(eHere.id, { x: e.clientX, y: e.clientY }) }} style={{ cursor: 'pointer' }}>
                    <circle cx={cx} cy={cy} r={S / 2 - 1} fill="transparent" />
                    {isESel && <circle cx={cx} cy={cy} r={S / 2 - 2} fill="none" stroke="#e74c3c" strokeWidth={2} style={np} />}
                    <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="central" fontSize={18} style={np}>🦎</text>
                    {isDM && (() => {
                      const ed = findEnemyData(dungeon, eHere.id)
                      if (!ed) return null
                      const hp = enemyHp[eHere.id] ?? ed.hp
                      const r = hp / ed.maxHp
                      const bx = x * S + 3, by = y * S + S - 5, bw = S - 6
                      return <>
                        <rect x={bx} y={by} width={bw} height={3} rx={1} fill="#333" style={np} />
                        <rect x={bx} y={by} width={bw * r} height={3} rx={1} fill={hpColor(r)} style={{ ...np, transition: 'width 0.3s, fill 0.3s' }} />
                      </>
                    })()}
                  </g>
                )}

                {/* Players */}
                {pHere && <>
                  <circle cx={cx} cy={cy} r={HP_R} fill="none" stroke="#333" strokeWidth={3} style={np} />
                  <circle cx={cx} cy={cy} r={HP_R} fill="none"
                    stroke={hpColor(pHere.hp / pHere.maxHp)} strokeWidth={3}
                    strokeDasharray={HP_C} strokeDashoffset={HP_C * (1 - pHere.hp / pHere.maxHp)}
                    transform={`rotate(-90 ${cx} ${cy})`}
                    style={{ ...np, transition: 'stroke-dashoffset 0.3s, stroke 0.3s' }}
                  />
                  <circle cx={cx} cy={cy} r={S / 2 - 5}
                    fill={pHere.tokenColor} stroke={isSel ? '#fff' : 'transparent'} strokeWidth={isSel ? 2 : 0}
                    onClick={() => onCellClick(x, y)} style={{ cursor: 'pointer' }}
                  />
                  <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight="bold" fill="#fff" style={np}>
                    {pHere.characterName[0]}
                  </text>
                </>}
              </g>
            )
          })
        )}
      </svg>
      {isDM && (
        <div className="map-theme-bar">
          {(Object.keys(THEMES) as MapTheme[]).map(k => (
            <button key={k}
              className={`map-theme-btn ${theme === k ? 'map-theme-btn--active' : ''}`}
              onClick={() => setTheme(k)}
              style={{ '--swatch-a': THEMES[k].swatch[0], '--swatch-b': THEMES[k].swatch[1] } as React.CSSProperties}
            >
              <span className="map-theme-swatch" />{THEMES[k].label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const np = { pointerEvents: 'none' as const }

function findEnemyData(dungeon: Dungeon, enemyId: string): import('../types/dungeon').Enemy | null {
  for (const room of dungeon.rooms) { const e = room.enemies.find(e => e.id === enemyId); if (e) return e }
  return null
}
function findEnemyName(dungeon: Dungeon, enemyId: string): string {
  for (const room of dungeon.rooms) { const e = room.enemies.find(e => e.id === enemyId); if (e) return e.name }
  return 'Enemy'
}
function findLootItem(dungeon: Dungeon, lootId: string): import('../types/dungeon').Item | null {
  for (const room of dungeon.rooms) { const i = room.loot.find(l => l.id === lootId); if (i) return i }
  return null
}
