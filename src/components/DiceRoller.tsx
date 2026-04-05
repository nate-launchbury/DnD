import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import type { Player, DiceRollResult, Skills, AbilityScores } from '../types/game'
import type { GameAction } from '../types/actions'

const DICE_TYPES = [4, 6, 8, 10, 12, 20, 100] as const
type DiceType = typeof DICE_TYPES[number]
type DicePool = Partial<Record<DiceType, number>>

const SKILL_ENTRIES: [keyof Skills, string, keyof AbilityScores][] = [
  ['acrobatics', 'Acrobatics', 'dex'],
  ['animalHandling', 'Animal Handling', 'wis'],
  ['arcana', 'Arcana', 'int'],
  ['athletics', 'Athletics', 'str'],
  ['deception', 'Deception', 'cha'],
  ['history', 'History', 'int'],
  ['insight', 'Insight', 'wis'],
  ['intimidation', 'Intimidation', 'cha'],
  ['investigation', 'Investigation', 'int'],
  ['medicine', 'Medicine', 'wis'],
  ['nature', 'Nature', 'int'],
  ['perception', 'Perception', 'wis'],
  ['performance', 'Performance', 'cha'],
  ['persuasion', 'Persuasion', 'cha'],
  ['religion', 'Religion', 'int'],
  ['sleightOfHand', 'Sleight of Hand', 'dex'],
  ['stealth', 'Stealth', 'dex'],
  ['survival', 'Survival', 'wis'],
]

const ABILITY_LABELS: Record<keyof AbilityScores, string> = {
  str: 'Strength', dex: 'Dexterity', con: 'Constitution',
  int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma',
}

function fmtMod(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`
}

function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2)
}

function rollDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1
}

function poolToFormula(pool: DicePool): string {
  return DICE_TYPES
    .filter(d => (pool[d] ?? 0) > 0)
    .map(d => `${pool[d]}d${d}`)
    .join(' + ')
}

function poolTotalDice(pool: DicePool): number {
  return DICE_TYPES.reduce((sum, d) => sum + (pool[d] ?? 0), 0)
}

function poolToFlatList(pool: DicePool): { sides: number; index: number }[] {
  const list: { sides: number; index: number }[] = []
  let idx = 0
  for (const d of DICE_TYPES) {
    const count = pool[d] ?? 0
    for (let i = 0; i < count; i++) {
      list.push({ sides: d, index: idx++ })
    }
  }
  return list
}

interface DiceRollerProps {
  open: boolean
  onClose: () => void
  player: Player | null
  isDM: boolean
  sendAction: (action: GameAction) => void
  recentRolls: DiceRollResult[]
}

interface RollingState {
  animating: boolean
  currentFaces: { sides: number; value: number }[]
  finalResult: DiceRollResult | null
  tickCount: number
}

export default function DiceRoller({ open, onClose, player, isDM, sendAction, recentRolls }: DiceRollerProps) {
  const [pool, setPool] = useState<DicePool>({ 20: 1 })
  const [selectedSkill, setSelectedSkill] = useState<keyof Skills | null>(null)
  const [selectedAbility, setSelectedAbility] = useState<keyof AbilityScores | null>(null)
  const [rolling, setRolling] = useState<RollingState>({
    animating: false,
    currentFaces: [],
    finalResult: null,
    tickCount: 0,
  })
  const [showHistory, setShowHistory] = useState(false)
  const rollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (rollTimeoutRef.current) clearTimeout(rollTimeoutRef.current)
    }
  }, [])

  const addDie = useCallback((d: DiceType) => {
    setPool(prev => {
      const current = prev[d] ?? 0
      if (current >= 12) return prev
      return { ...prev, [d]: current + 1 }
    })
    clearResult()
  }, [])

  const removeDie = useCallback((d: DiceType) => {
    setPool(prev => {
      const current = prev[d] ?? 0
      if (current <= 0) return prev
      const next = { ...prev }
      if (current === 1) {
        delete next[d]
      } else {
        next[d] = current - 1
      }
      return next
    })
    clearResult()
  }, [])

  const clearPool = useCallback(() => {
    setPool({})
    clearResult()
  }, [])

  useEffect(() => {
    if (selectedSkill) {
      setPool({ 20: 1 })
      setSelectedAbility(null)
      clearResult()
    }
  }, [selectedSkill])

  useEffect(() => {
    if (selectedAbility) {
      setPool({ 20: 1 })
      setSelectedSkill(null)
      clearResult()
    }
  }, [selectedAbility])

  const getModifier = useCallback((): { value: number; label: string } => {
    if (!player) return { value: 0, label: '' }

    if (selectedSkill) {
      const mod = player.skills[selectedSkill]
      const entry = SKILL_ENTRIES.find(([k]) => k === selectedSkill)
      return { value: mod, label: `${entry?.[1] ?? selectedSkill} (${fmtMod(mod)})` }
    }

    if (selectedAbility) {
      const mod = abilityMod(player.abilities[selectedAbility])
      return { value: mod, label: `${ABILITY_LABELS[selectedAbility]} (${fmtMod(mod)})` }
    }

    return { value: 0, label: '' }
  }, [player, selectedSkill, selectedAbility])

  const flatList = useMemo(() => poolToFlatList(pool), [pool])
  const totalDice = poolTotalDice(pool)
  const formula = poolToFormula(pool)

  const handleRoll = useCallback(() => {
    if (!player || rolling.animating || totalDice === 0) return

    const modifier = getModifier()
    const finalRolls = flatList.map(d => ({ sides: d.sides, value: rollDie(d.sides) }))
    const rawTotal = finalRolls.reduce((s, r) => s + r.value, 0)
    const total = rawTotal + modifier.value

    const result: DiceRollResult = {
      id: `roll-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      playerId: player.id,
      playerName: player.name,
      characterName: player.characterName,
      tokenColor: player.tokenColor,
      formula,
      rolls: finalRolls,
      modifier: modifier.value,
      modifierLabel: modifier.label,
      total,
      timestamp: Date.now(),
    }

    let tickCount = 0
    const totalTicks = 18
    const tickIntervals = Array.from({ length: totalTicks }, (_, i) => {
      const progress = i / totalTicks
      return 40 + Math.pow(progress, 2.5) * 200
    })

    setRolling({
      animating: true,
      currentFaces: flatList.map(d => ({ sides: d.sides, value: rollDie(d.sides) })),
      finalResult: null,
      tickCount: 0,
    })

    function tick() {
      tickCount++
      if (tickCount >= totalTicks) {
        setRolling({
          animating: false,
          currentFaces: finalRolls,
          finalResult: result,
          tickCount: totalTicks,
        })
        sendAction({ type: 'diceRoll', roll: result })
        return
      }

      setRolling(prev => ({
        ...prev,
        currentFaces: flatList.map(d => ({ sides: d.sides, value: rollDie(d.sides) })),
        tickCount,
      }))

      rollTimeoutRef.current = setTimeout(tick, tickIntervals[tickCount])
    }

    rollTimeoutRef.current = setTimeout(tick, tickIntervals[0])
  }, [player, rolling.animating, flatList, totalDice, formula, getModifier, sendAction])

  const clearResult = useCallback(() => {
    setRolling({ animating: false, currentFaces: [], finalResult: null, tickCount: 0 })
  }, [])

  if (!open) return null

  const modifier = getModifier()
  const isSingleD20 = totalDice === 1 && (pool[20] ?? 0) === 1
  const isNat20 = rolling.finalResult && isSingleD20 && rolling.finalResult.rolls[0]?.value === 20
  const isNat1 = rolling.finalResult && isSingleD20 && rolling.finalResult.rolls[0]?.value === 1

  return (
    <div className="dice-roller-backdrop" onClick={onClose}>
      <div className="dice-roller" onClick={(e) => e.stopPropagation()}>
        <div className="dice-roller-header">
          <h2>Dice Roller</h2>
          {player && (
            <span className="dice-roller-player" style={{ borderColor: player.tokenColor }}>
              <span className="dice-roller-player-dot" style={{ backgroundColor: player.tokenColor }} />
              {player.characterName}
            </span>
          )}
          <button className="dice-roller-close" onClick={onClose}>&times;</button>
        </div>

        <div className="dice-roller-body">
          {/* Dice Pool Builder */}
          <div className="dice-type-row">
            {DICE_TYPES.map(d => {
              const count = pool[d] ?? 0
              return (
                <button
                  key={d}
                  className={`dice-type-btn ${count > 0 ? 'dice-type-btn--active' : ''}`}
                  onClick={() => addDie(d)}
                  onContextMenu={(e) => { e.preventDefault(); removeDie(d) }}
                  disabled={rolling.animating}
                >
                  <DiceIcon sides={d} active={count > 0} />
                  <span className="dice-type-label">d{d}</span>
                  {count > 0 && (
                    <span className="dice-pool-badge">{count}</span>
                  )}
                  {count > 0 && (
                    <button
                      className="dice-pool-remove"
                      onClick={(e) => { e.stopPropagation(); removeDie(d) }}
                      disabled={rolling.animating}
                    >
                      &minus;
                    </button>
                  )}
                </button>
              )
            })}
          </div>

          {/* Pool Summary */}
          <div className="dice-pool-summary">
            <span className="dice-pool-formula">
              {formula || 'Click a die to add'}
              {modifier.label && formula && <span className="dice-pool-mod"> {fmtMod(modifier.value)}</span>}
            </span>
            {totalDice > 0 && (
              <button
                className="dice-pool-clear-btn"
                onClick={() => { clearPool(); setSelectedSkill(null); setSelectedAbility(null) }}
                disabled={rolling.animating}
              >
                Clear
              </button>
            )}
          </div>

          {/* Skill / Ability Picker */}
          {player && (
            <div className="dice-modifier-section">
              <div className="dice-modifier-header">
                <span className="dice-modifier-title">Roll for...</span>
                {(selectedSkill || selectedAbility) && (
                  <button
                    className="dice-modifier-clear"
                    onClick={() => { setSelectedSkill(null); setSelectedAbility(null); clearResult() }}
                    disabled={rolling.animating}
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="dice-skill-grid">
                {SKILL_ENTRIES.map(([key, label]) => {
                  const mod = player.skills[key]
                  const isProficient = player.skillProficiencies?.includes(key)
                  return (
                    <button
                      key={key}
                      className={`dice-skill-btn ${selectedSkill === key ? 'dice-skill-btn--active' : ''} ${isProficient ? 'dice-skill-btn--prof' : ''}`}
                      onClick={() => { setSelectedSkill(selectedSkill === key ? null : key); clearResult() }}
                      disabled={rolling.animating}
                    >
                      <span className="dice-skill-name">{label}</span>
                      <span className="dice-skill-mod">{fmtMod(mod)}</span>
                    </button>
                  )
                })}
              </div>

              <div className="dice-ability-row">
                {(Object.keys(ABILITY_LABELS) as (keyof AbilityScores)[]).map(key => {
                  const mod = abilityMod(player.abilities[key])
                  return (
                    <button
                      key={key}
                      className={`dice-ability-btn ${selectedAbility === key ? 'dice-ability-btn--active' : ''}`}
                      onClick={() => { setSelectedAbility(selectedAbility === key ? null : key); clearResult() }}
                      disabled={rolling.animating}
                    >
                      <span className="dice-ability-key">{key.toUpperCase()}</span>
                      <span className="dice-ability-mod">{fmtMod(mod)}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Roll Display Area */}
          <div className={`dice-result-area ${rolling.animating ? 'dice-result-area--rolling' : ''} ${isNat20 ? 'dice-result-area--crit' : ''} ${isNat1 ? 'dice-result-area--fumble' : ''}`}>
            {rolling.currentFaces.length > 0 ? (
              <>
                <div className="dice-faces-row">
                  {rolling.currentFaces.map((face, i) => (
                    <div
                      key={i}
                      className={`dice-face ${rolling.animating ? 'dice-face--spinning' : 'dice-face--landed'}`}
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      <span className="dice-face-value">{face.value}</span>
                      <span className="dice-face-type">d{face.sides}</span>
                    </div>
                  ))}
                </div>
                {rolling.finalResult && (
                  <div className="dice-total-display">
                    {isNat20 && <div className="dice-crit-label">NATURAL 20!</div>}
                    {isNat1 && <div className="dice-fumble-label">NATURAL 1</div>}
                    <div className="dice-total-breakdown">
                      {rolling.finalResult.rolls.map(r => r.value).join(' + ')}
                      {modifier.value !== 0 && (
                        <span className="dice-total-mod"> {fmtMod(modifier.value)}</span>
                      )}
                      <span className="dice-total-equals"> = </span>
                      <span className="dice-total-number">{rolling.finalResult.total}</span>
                    </div>
                    {modifier.label && (
                      <div className="dice-total-skill">{modifier.label}</div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="dice-placeholder">
                {totalDice > 0 ? (
                  <>
                    <div className="dice-placeholder-icons">
                      {flatList.slice(0, 8).map((d, i) => (
                        <DiceIcon key={i} sides={d.sides} active={false} />
                      ))}
                      {flatList.length > 8 && <span className="dice-placeholder-more">+{flatList.length - 8}</span>}
                    </div>
                    <span className="dice-placeholder-text">
                      {formula}
                      {modifier.label && ` + ${modifier.label}`}
                    </span>
                  </>
                ) : (
                  <span className="dice-placeholder-text dice-placeholder-text--empty">
                    Click a die above to build your roll
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Roll Button */}
          <button
            className={`dice-roll-btn ${rolling.animating ? 'dice-roll-btn--rolling' : ''}`}
            onClick={rolling.finalResult ? clearResult : handleRoll}
            disabled={rolling.animating || !player || totalDice === 0}
          >
            {rolling.animating ? 'Rolling...' : rolling.finalResult ? 'Roll Again' : 'Roll'}
          </button>
        </div>

        {/* Recent Rolls */}
        <div className="dice-history-section">
          <button
            className="dice-history-toggle"
            onClick={() => setShowHistory(v => !v)}
          >
            {showHistory ? 'Hide' : 'Show'} Recent Rolls ({recentRolls.length})
          </button>
          {showHistory && (
            <div className="dice-history-list">
              {recentRolls.slice().reverse().map(roll => {
                const isCrit = roll.formula === '1d20' && roll.rolls.length === 1 && roll.rolls[0]?.value === 20
                const isFumble = roll.formula === '1d20' && roll.rolls.length === 1 && roll.rolls[0]?.value === 1
                return (
                  <div key={roll.id} className="dice-history-entry">
                    <span className="dice-history-dot" style={{ backgroundColor: roll.tokenColor }} />
                    <span className="dice-history-name">{roll.characterName}</span>
                    <span className="dice-history-dice">{roll.formula}</span>
                    {roll.modifierLabel && (
                      <span className="dice-history-skill">{roll.modifierLabel}</span>
                    )}
                    <span className={`dice-history-total ${isCrit ? 'dice-history-total--crit' : ''} ${isFumble ? 'dice-history-total--fumble' : ''}`}>
                      {roll.total}
                    </span>
                  </div>
                )
              })}
              {recentRolls.length === 0 && (
                <div className="dice-history-empty">No rolls yet</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DiceIcon({ sides, active, large }: { sides: number; active: boolean; large?: boolean }) {
  const size = large ? 48 : 28
  const color = active ? '#c9a227' : '#8a8780'
  const bg = active ? 'rgba(201,162,39,0.15)' : 'transparent'

  if (sides === 4) {
    return (
      <svg width={size} height={size} viewBox="0 0 28 28">
        <polygon points="14,3 25,24 3,24" fill={bg} stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
        <text x="14" y="20" textAnchor="middle" fill={color} fontSize="8" fontWeight="bold">4</text>
      </svg>
    )
  }
  if (sides === 6) {
    return (
      <svg width={size} height={size} viewBox="0 0 28 28">
        <rect x="4" y="4" width="20" height="20" rx="3" fill={bg} stroke={color} strokeWidth="1.5" />
        <text x="14" y="18" textAnchor="middle" fill={color} fontSize="9" fontWeight="bold">6</text>
      </svg>
    )
  }
  if (sides === 8) {
    return (
      <svg width={size} height={size} viewBox="0 0 28 28">
        <polygon points="14,2 26,10 26,18 14,26 2,18 2,10" fill={bg} stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
        <text x="14" y="18" textAnchor="middle" fill={color} fontSize="8" fontWeight="bold">8</text>
      </svg>
    )
  }
  if (sides === 10) {
    return (
      <svg width={size} height={size} viewBox="0 0 28 28">
        <polygon points="14,1 27,11 22,27 6,27 1,11" fill={bg} stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
        <text x="14" y="19" textAnchor="middle" fill={color} fontSize="7" fontWeight="bold">10</text>
      </svg>
    )
  }
  if (sides === 12) {
    return (
      <svg width={size} height={size} viewBox="0 0 28 28">
        <polygon points="14,1 24,5 27,15 22,25 6,25 1,15 4,5" fill={bg} stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
        <text x="14" y="18" textAnchor="middle" fill={color} fontSize="7" fontWeight="bold">12</text>
      </svg>
    )
  }
  if (sides === 100) {
    return (
      <svg width={size} height={size} viewBox="0 0 28 28">
        <circle cx="14" cy="14" r="12" fill={bg} stroke={color} strokeWidth="1.5" />
        <text x="14" y="17" textAnchor="middle" fill={color} fontSize="6" fontWeight="bold">100</text>
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 28 28">
      <polygon points="14,1 26,8 26,20 14,27 2,20 2,8" fill={bg} stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <text x="14" y="18" textAnchor="middle" fill={color} fontSize="7" fontWeight="bold">20</text>
    </svg>
  )
}
