import { useState } from 'react'
import type { Player, PlayerLogEntry, AbilityScores, Skills, Resource } from '../types/game'
import type { Room, Dungeon } from '../types/dungeon'

type Tab = 'attributes' | 'equipment' | 'inventory'

interface Props {
  currentRoom: Room | null
  isDM: boolean
  players: Player[]
  myPlayerId: string | null
  dmSelectedPlayerId: string | null
  playerLogs: Record<string, PlayerLogEntry[]>
  collectedLoot: Set<string>
  defeatedEnemies: Set<string>
  dungeon: Dungeon
  onRequestDmNotes: () => void
  onDefeatEnemy: (id: string, name: string) => void
  onCollectLoot: (id: string, name: string) => void
  onAdjustHp: (playerId: string, delta: number) => void
  onAdjustResource: (playerId: string, resourceIndex: number, delta: number) => void
  onUpdatePlayer: (playerId: string, updates: Record<string, unknown>) => void
  onEquipWeapon: (playerId: string, weaponIndex: number) => void
  onUnequipWeapon: (playerId: string, weaponIndex: number) => void
  onEquipArmor: (playerId: string, armorIndex: number) => void
  onUnequipArmor: (playerId: string, armorIndex: number) => void
  onEquipFromInventory: (playerId: string, inventoryItemId: string) => void
  onUnequipToInventory: (playerId: string, slot: 'weapon' | 'armor', index: number) => void
}

function fmtMod(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`
}

function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2)
}

const ABILITY_KEYS: [string, string][] = [
  ['str', 'STR'], ['dex', 'DEX'], ['con', 'CON'],
  ['int', 'INT'], ['wis', 'WIS'], ['cha', 'CHA'],
]

const SKILL_ENTRIES: [string, string, string][] = [
  ['acrobatics', 'Acrobatics', 'DEX'],
  ['animalHandling', 'Animal Handling', 'WIS'],
  ['arcana', 'Arcana', 'INT'],
  ['athletics', 'Athletics', 'STR'],
  ['deception', 'Deception', 'CHA'],
  ['history', 'History', 'INT'],
  ['insight', 'Insight', 'WIS'],
  ['intimidation', 'Intimidation', 'CHA'],
  ['investigation', 'Investigation', 'INT'],
  ['medicine', 'Medicine', 'WIS'],
  ['nature', 'Nature', 'INT'],
  ['perception', 'Perception', 'WIS'],
  ['performance', 'Performance', 'CHA'],
  ['persuasion', 'Persuasion', 'CHA'],
  ['religion', 'Religion', 'INT'],
  ['sleightOfHand', 'Sleight of Hand', 'DEX'],
  ['stealth', 'Stealth', 'DEX'],
  ['survival', 'Survival', 'WIS'],
]

const SKILL_ABILITY_KEY: Record<string, keyof AbilityScores> = {
  acrobatics: 'dex', animalHandling: 'wis', arcana: 'int', athletics: 'str',
  deception: 'cha', history: 'int', insight: 'wis', intimidation: 'cha',
  investigation: 'int', medicine: 'wis', nature: 'int', perception: 'wis',
  performance: 'cha', persuasion: 'cha', religion: 'int',
  sleightOfHand: 'dex', stealth: 'dex', survival: 'wis',
}

function computeSkills(
  abilities: AbilityScores,
  proficiencies: string[],
  profBonus: number
): Skills {
  const profSet = new Set(proficiencies)
  const result: Record<string, number> = {}
  for (const [skillKey, abilityKey] of Object.entries(SKILL_ABILITY_KEY)) {
    const mod = abilityMod(abilities[abilityKey])
    result[skillKey] = mod + (profSet.has(skillKey) ? profBonus : 0)
  }
  return result as unknown as Skills
}

export default function ContextPane({
  currentRoom, isDM, players, myPlayerId, dmSelectedPlayerId,
  playerLogs, collectedLoot, defeatedEnemies, dungeon,
  onRequestDmNotes, onDefeatEnemy, onCollectLoot, onAdjustHp, onAdjustResource, onUpdatePlayer,
  onEquipWeapon, onUnequipWeapon, onEquipArmor, onUnequipArmor, onEquipFromInventory, onUnequipToInventory
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('attributes')
  const [hpInput, setHpInput] = useState<Record<string, string>>({})
  const [resInput, setResInput] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [draft, setDraft] = useState<{
    characterName: string; characterClass: string; level: number;
    ac: number; speed: number; initiative: number; proficiencyBonus: number;
    hitDice: string; passivePerception: number; maxHp: number;
    abilities: AbilityScores; skillProficiencies: string[];
    resources: Resource[];
  } | null>(null)

  const myPlayer = myPlayerId ? players.find(p => p.id === myPlayerId) : null
  const viewingPlayer = isDM
    ? (dmSelectedPlayerId ? players.find(p => p.id === dmSelectedPlayerId) : players[0]) ?? players[0]
    : myPlayer
  const visiblePlayers = isDM ? players : players.filter(p => p.id === myPlayerId)

  const allCollectedItems = dungeon.rooms.flatMap(r =>
    r.loot.filter(l => collectedLoot.has(l.id))
  )

  function startEditing() {
    if (!viewingPlayer) return
    setDraft({
      characterName: viewingPlayer.characterName,
      characterClass: viewingPlayer.characterClass,
      level: viewingPlayer.level,
      ac: viewingPlayer.ac,
      speed: viewingPlayer.speed,
      initiative: viewingPlayer.initiative,
      proficiencyBonus: viewingPlayer.proficiencyBonus,
      hitDice: viewingPlayer.hitDice,
      passivePerception: viewingPlayer.passivePerception,
      maxHp: viewingPlayer.maxHp,
      abilities: { ...viewingPlayer.abilities },
      skillProficiencies: [...(viewingPlayer.skillProficiencies ?? [])],
      resources: (viewingPlayer.resources ?? []).map(r => ({ ...r })),
    })
    setEditing(true)
  }

  function saveEdits() {
    if (!viewingPlayer || !draft) return
    const skills = computeSkills(draft.abilities, draft.skillProficiencies, draft.proficiencyBonus)
    onUpdatePlayer(viewingPlayer.id, { ...draft, skills })
    setEditing(false)
    setDraft(null)
  }

  function cancelEdits() {
    setEditing(false)
    setDraft(null)
  }

  function setDraftField<K extends keyof NonNullable<typeof draft>>(key: K, value: NonNullable<typeof draft>[K]) {
    setDraft(prev => prev ? { ...prev, [key]: value } : prev)
  }

  function setDraftAbility(key: keyof AbilityScores, value: number) {
    setDraft(prev => prev ? { ...prev, abilities: { ...prev.abilities, [key]: value } } : prev)
  }

  function toggleDraftProficiency(skillKey: string) {
    setDraft(prev => {
      if (!prev) return prev
      const profs = new Set(prev.skillProficiencies)
      if (profs.has(skillKey)) profs.delete(skillKey)
      else profs.add(skillKey)
      return { ...prev, skillProficiencies: Array.from(profs) }
    })
  }

  function setDraftResource(index: number, field: keyof Resource, value: string | number) {
    setDraft(prev => {
      if (!prev) return prev
      const resources = prev.resources.map((r, i) =>
        i === index ? { ...r, [field]: value } : r
      )
      return { ...prev, resources }
    })
  }

  function addDraftResource() {
    setDraft(prev => {
      if (!prev) return prev
      return { ...prev, resources: [...prev.resources, { name: 'New Resource', current: 1, max: 1 }] }
    })
  }

  function removeDraftResource(index: number) {
    setDraft(prev => {
      if (!prev) return prev
      return { ...prev, resources: prev.resources.filter((_, i) => i !== index) }
    })
  }

  const draftSkills = draft ? computeSkills(draft.abilities, draft.skillProficiencies, draft.proficiencyBonus) : null
  const draftProfSet = draft ? new Set(draft.skillProficiencies) : null
  const liveProfSet = viewingPlayer ? new Set(viewingPlayer.skillProficiencies ?? []) : new Set<string>()

  const equippedWeapons = viewingPlayer?.weapons?.filter(w => w.equipped) ?? []
  const otherWeapons = viewingPlayer?.weapons?.filter(w => !w.equipped) ?? []
  const equippedArmor = viewingPlayer?.armor?.filter(a => a.equipped) ?? []
  const otherArmor = viewingPlayer?.armor?.filter(a => !a.equipped) ?? []
  const canEquip = isDM || (viewingPlayer?.id === myPlayerId)

  return (
    <div className="context-pane">
      {/* Persistent HP + Resources — always visible regardless of tab */}
      <div className="context-persistent">
        <div className="persistent-hp">
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
                    style={{ width: `${ratio * 100}%`, backgroundColor: barColor }}
                  />
                </div>
                {isDM && (
                  <div className="player-hp-quick-stats">
                    <span className="quick-stat"><span className="quick-stat-label">AC</span> {p.ac}</span>
                    <span className="quick-stat"><span className="quick-stat-label">P.Perc</span> {p.passivePerception}</span>
                  </div>
                )}
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

        {!isDM && visiblePlayers.some(p => p.resources && p.resources.length > 0) && (
          <div className="persistent-resources">
            {visiblePlayers.map(p => {
              if (!p.resources || p.resources.length === 0) return null
              return (
                <div key={`res-${p.id}`} className="persistent-resource-group">
                  {p.resources.map((res, ri) => {
                    const ratio = res.current / res.max
                    const inputKey = `${p.id}-${ri}`
                    return (
                      <div key={inputKey} className="player-hp-card" style={{ marginBottom: 3 }}>
                        <div className="player-hp-header">
                          <span className="resource-icon">&#9733;</span>
                          <strong>{res.name}</strong>
                          <span className="player-hp-text">{res.current}/{res.max}</span>
                        </div>
                        <div className="player-hp-bar-track">
                          <div
                            className="player-hp-bar-fill resource-bar-fill"
                            style={{ width: `${ratio * 100}%` }}
                          />
                        </div>
                        {p.id === myPlayerId && (
                          <div className="player-hp-controls">
                            <button className="hp-btn hp-btn--dmg" onClick={() => onAdjustResource(p.id, ri, -(parseInt(resInput[inputKey] || '1', 10) || 1))}>
                              -{resInput[inputKey] || '1'}
                            </button>
                            <input
                              type="number"
                              className="hp-input"
                              value={resInput[inputKey] ?? ''}
                              placeholder="1"
                              min="1"
                              onChange={e => setResInput(prev => ({ ...prev, [inputKey]: e.target.value }))}
                            />
                            <button className="hp-btn hp-btn--heal" onClick={() => onAdjustResource(p.id, ri, parseInt(resInput[inputKey] || '1', 10) || 1)}>
                              +{resInput[inputKey] || '1'}
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="context-tabs">
        <button
          className={`context-tab ${activeTab === 'attributes' ? 'active' : ''}`}
          onClick={() => setActiveTab('attributes')}
        >
          Attributes
        </button>
        <button
          className={`context-tab ${activeTab === 'equipment' ? 'active' : ''}`}
          onClick={() => setActiveTab('equipment')}
        >
          Equipment
        </button>
        <button
          className={`context-tab ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          Inventory
        </button>
      </div>

      <div className="context-body">
        {activeTab === 'attributes' && (
          <div className="context-attributes">
            {viewingPlayer && (
              <>
                <div className="attr-edit-bar">
                  <button className="help-ref-btn" onClick={() => setHelpOpen(true)} title="Quick reference">?</button>
                  {editing ? (
                    <>
                      <button className="attr-edit-btn attr-edit-btn--save" onClick={saveEdits}>Save</button>
                      <button className="attr-edit-btn attr-edit-btn--cancel" onClick={cancelEdits}>Cancel</button>
                    </>
                  ) : (
                    <button className="attr-edit-btn" onClick={startEditing}>Edit</button>
                  )}
                </div>

                <div className="attr-section">
                  <div className="char-section-title">
                    {editing && draft ? (
                      <span className="edit-inline-row">
                        Lv <input type="number" className="edit-inline-num" value={draft.level} onChange={e => setDraftField('level', parseInt(e.target.value) || 1)} />
                        <input type="text" className="edit-inline-text" value={draft.characterClass} onChange={e => setDraftField('characterClass', e.target.value)} />
                      </span>
                    ) : (
                      <>Lv {viewingPlayer.level} {viewingPlayer.characterClass}</>
                    )}
                  </div>
                  <div className="char-stats-grid">
                    {([
                      ['ac', 'AC', false],
                      ['speed', 'Speed', false],
                      ['initiative', 'Init', true],
                      ['proficiencyBonus', 'Prof', true],
                      ['hitDice', 'Hit Dice', false],
                      ['passivePerception', 'P.Perc', false],
                    ] as [string, string, boolean][]).map(([key, label, isMod]) => (
                      <div key={key} className="char-stat">
                        <span className="char-stat-label">{label}</span>
                        {editing && draft ? (
                          key === 'hitDice' ? (
                            <input type="text" className="edit-stat-input" value={draft[key as 'hitDice']} onChange={e => setDraftField('hitDice', e.target.value)} />
                          ) : (
                            <input type="number" className="edit-stat-input" value={draft[key as keyof typeof draft] as number} onChange={e => setDraftField(key as any, parseInt(e.target.value) || 0)} />
                          )
                        ) : (
                          <span className="char-stat-value">
                            {key === 'speed' ? `${viewingPlayer[key as keyof typeof viewingPlayer]}ft` :
                             isMod ? fmtMod(viewingPlayer[key as keyof typeof viewingPlayer] as number) :
                             String(viewingPlayer[key as keyof typeof viewingPlayer])}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="attr-section">
                  <div className="char-section-title">Ability Scores</div>
                  <div className="ability-scores-grid">
                    {ABILITY_KEYS.map(([key, label]) => {
                      const score = editing && draft
                        ? draft.abilities[key as keyof AbilityScores]
                        : viewingPlayer.abilities[key as keyof AbilityScores]
                      const mod = abilityMod(score)
                      return (
                        <div key={key} className="ability-score">
                          <div className="ability-label">{label}</div>
                          <div className="ability-mod">{fmtMod(mod)}</div>
                          {editing && draft ? (
                            <input type="number" className="edit-ability-input" value={score} onChange={e => setDraftAbility(key as keyof AbilityScores, parseInt(e.target.value) || 0)} />
                          ) : (
                            <div className="ability-value">{score}</div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="attr-section">
                  <div className="char-section-title">Skills</div>
                  <div className="skills-list">
                    {SKILL_ENTRIES.map(([key, label, ability]) => {
                      const isProficient = editing && draftProfSet
                        ? draftProfSet.has(key)
                        : liveProfSet.has(key)
                      const mod = editing && draftSkills
                        ? draftSkills[key as keyof Skills]
                        : viewingPlayer.skills[key as keyof Skills]
                      return (
                        <div key={key} className={`skill-row ${isProficient ? 'skill-row--proficient' : ''}`}>
                          {editing && (
                            <button
                              className={`prof-toggle ${isProficient ? 'prof-toggle--active' : ''}`}
                              onClick={() => toggleDraftProficiency(key)}
                              title={isProficient ? 'Remove proficiency' : 'Add proficiency'}
                            >
                              P
                            </button>
                          )}
                          <span className="skill-name">{label}</span>
                          <span className="skill-ability">{ability}</span>
                          <span className={`skill-mod ${mod > 0 ? 'skill-mod--pos' : mod < 0 ? 'skill-mod--neg' : ''}`}>
                            {fmtMod(mod)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {!editing && isDM && viewingPlayer.resources && viewingPlayer.resources.length > 0 && (
                  <div className="attr-section">
                    <div className="char-section-title">Resources</div>
                    {viewingPlayer.resources.map((res, ri) => {
                      const ratio = res.current / res.max
                      const inputKey = `${viewingPlayer.id}-${ri}`
                      return (
                        <div key={inputKey} className="player-hp-card" style={{ marginBottom: 3 }}>
                          <div className="player-hp-header">
                            <span className="resource-icon">&#9733;</span>
                            <strong>{res.name}</strong>
                            <span className="player-hp-text">{res.current}/{res.max}</span>
                          </div>
                          <div className="player-hp-bar-track">
                            <div
                              className="player-hp-bar-fill resource-bar-fill"
                              style={{ width: `${ratio * 100}%` }}
                            />
                          </div>
                          <div className="player-hp-controls">
                            <button className="hp-btn hp-btn--dmg" onClick={() => onAdjustResource(viewingPlayer.id, ri, -(parseInt(resInput[inputKey] || '1', 10) || 1))}>
                              -{resInput[inputKey] || '1'}
                            </button>
                            <input
                              type="number"
                              className="hp-input"
                              value={resInput[inputKey] ?? ''}
                              placeholder="1"
                              min="1"
                              onChange={e => setResInput(prev => ({ ...prev, [inputKey]: e.target.value }))}
                            />
                            <button className="hp-btn hp-btn--heal" onClick={() => onAdjustResource(viewingPlayer.id, ri, parseInt(resInput[inputKey] || '1', 10) || 1)}>
                              +{resInput[inputKey] || '1'}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {editing && draft && (
                  <div className="attr-section">
                    <div className="char-section-title">Resources</div>
                    {draft.resources.map((res, i) => (
                      <div key={i} className="edit-resource-row">
                        <input
                          type="text"
                          className="edit-inline-text"
                          value={res.name}
                          onChange={e => setDraftResource(i, 'name', e.target.value)}
                          placeholder="Name"
                        />
                        <label className="edit-resource-label">
                          Max
                          <input
                            type="number"
                            className="edit-inline-num"
                            value={res.max}
                            min={0}
                            onChange={e => {
                              const max = parseInt(e.target.value) || 0
                              setDraftResource(i, 'max', max)
                              if (res.current > max) setDraftResource(i, 'current', max)
                            }}
                          />
                        </label>
                        <button
                          className="hp-btn hp-btn--dmg"
                          style={{ padding: '2px 6px', fontSize: '11px' }}
                          onClick={() => removeDraftResource(i)}
                          title="Remove resource"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <button
                      className="attr-edit-btn"
                      style={{ marginTop: 4, fontSize: '11px' }}
                      onClick={addDraftResource}
                    >
                      + Add Resource
                    </button>
                  </div>
                )}
              </>
            )}

            {currentRoom && (
              <>

                {currentRoom.npcs.length > 0 && (
                  <div className="attr-section">
                    <div className="char-section-title">NPCs</div>
                    {currentRoom.npcs.map(npc => (
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
          </div>
        )}

        {activeTab === 'equipment' && (
          <div className="context-equipment">
            {viewingPlayer ? (
              <>
                {/* AC Banner */}
                <div className="equip-ac-banner">
                  <div className="equip-ac-value">{viewingPlayer.ac}</div>
                  <div className="equip-ac-label">Armor Class</div>
                  <div className="equip-ac-breakdown">
                    {equippedArmor.length > 0
                      ? equippedArmor.map(a => a.type === 'shield' ? `${a.name} (+${a.armorClass})` : `${a.name} (${a.armorClass})`).join(' + ')
                      : `Unarmored (10 + DEX)`
                    }
                  </div>
                </div>

                {/* Equipment Slots */}
                <div className="equip-slots">
                  {/* Main Hand Slot */}
                  <div className="equip-slot">
                    <div className="equip-slot-header">
                      <span className="equip-slot-icon">&#9876;</span>
                      <span className="equip-slot-label">Main Hand</span>
                    </div>
                    {equippedWeapons.length > 0 ? (
                      equippedWeapons.map((w, _wi) => {
                        const realIndex = viewingPlayer.weapons.indexOf(w)
                        return (
                          <div key={realIndex} className="equip-slot-item equip-slot-item--filled">
                            <div className="equip-slot-item-header">
                              <span className="equip-slot-item-name">{w.name}</span>
                              {canEquip && (
                                <button className="equip-toggle-btn equip-toggle-btn--unequip" onClick={() => onUnequipWeapon(viewingPlayer.id, realIndex)} title="Unequip">
                                  &#10005;
                                </button>
                              )}
                            </div>
                            <div className="equip-weapon-stats">
                              <div className="equip-stat-block">
                                <div className="equip-stat-number">{fmtMod(w.attackBonus)}</div>
                                <div className="equip-stat-label">To Hit</div>
                              </div>
                              <div className="equip-stat-divider" />
                              <div className="equip-stat-block">
                                <div className="equip-stat-number">{w.damage}</div>
                                <div className="equip-stat-label">{w.damageType}</div>
                              </div>
                            </div>
                            <div className="equip-attack-steps">
                              <div className="equip-step"><span className="equip-step-num">1</span> Roll <strong>d20</strong> + <strong>{fmtMod(w.attackBonus)}</strong></div>
                              <div className="equip-step"><span className="equip-step-num">2</span> Tell the DM your total</div>
                              <div className="equip-step"><span className="equip-step-num">3</span> On hit, roll <strong>{w.damage}</strong> {w.damageType}</div>
                            </div>
                            {w.properties && w.properties.length > 0 && (
                              <div className="equip-weapon-props">
                                {w.properties.map((prop, pi) => (
                                  <span key={pi} className="equip-prop-tag">{prop}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })
                    ) : (
                      <div className="equip-slot-empty">No weapon equipped</div>
                    )}
                  </div>

                  {/* Armor Slot */}
                  <div className="equip-slot">
                    <div className="equip-slot-header">
                      <span className="equip-slot-icon">&#128737;</span>
                      <span className="equip-slot-label">Armor</span>
                    </div>
                    {(() => {
                      const bodyArmor = equippedArmor.filter(a => a.type !== 'shield')
                      return bodyArmor.length > 0 ? bodyArmor.map(a => {
                        const realIndex = viewingPlayer.armor.indexOf(a)
                        return (
                          <div key={realIndex} className="equip-slot-item equip-slot-item--filled">
                            <div className="equip-slot-item-header">
                              <span className="equip-slot-item-name">{a.name}</span>
                              {canEquip && (
                                <button className="equip-toggle-btn equip-toggle-btn--unequip" onClick={() => onUnequipArmor(viewingPlayer.id, realIndex)} title="Unequip">
                                  &#10005;
                                </button>
                              )}
                            </div>
                            <div className="equip-slot-item-detail">
                              <span className="equip-armor-ac-badge">AC {a.armorClass}</span>
                              <span className="equip-armor-type-tag">{a.type}</span>
                            </div>
                          </div>
                        )
                      }) : (
                        <div className="equip-slot-empty">No armor worn</div>
                      )
                    })()}
                  </div>

                  {/* Shield / Off-Hand Slot */}
                  <div className="equip-slot">
                    <div className="equip-slot-header">
                      <span className="equip-slot-icon">&#9711;</span>
                      <span className="equip-slot-label">Off Hand / Shield</span>
                    </div>
                    {(() => {
                      const shield = equippedArmor.filter(a => a.type === 'shield')
                      return shield.length > 0 ? shield.map(a => {
                        const realIndex = viewingPlayer.armor.indexOf(a)
                        return (
                          <div key={realIndex} className="equip-slot-item equip-slot-item--filled">
                            <div className="equip-slot-item-header">
                              <span className="equip-slot-item-name">{a.name}</span>
                              {canEquip && (
                                <button className="equip-toggle-btn equip-toggle-btn--unequip" onClick={() => onUnequipArmor(viewingPlayer.id, realIndex)} title="Unequip">
                                  &#10005;
                                </button>
                              )}
                            </div>
                            <div className="equip-slot-item-detail">
                              <span className="equip-armor-ac-badge">+{a.armorClass} AC</span>
                            </div>
                          </div>
                        )
                      }) : (
                        <div className="equip-slot-empty">Nothing in off hand</div>
                      )
                    })()}
                  </div>
                </div>

                {/* Stowed weapons & armor (not equipped) */}
                {(otherWeapons.length > 0 || otherArmor.length > 0) && (
                  <div className="attr-section">
                    <div className="char-section-title">Available to Equip</div>
                    {otherWeapons.map(w => {
                      const realIndex = viewingPlayer.weapons.indexOf(w)
                      return (
                        <div key={`w-${realIndex}`} className="equip-stowed-row">
                          <span className="equip-stowed-icon">&#9876;</span>
                          <span className="equip-stowed-name">{w.name}</span>
                          <span className="equip-stowed-detail">{fmtMod(w.attackBonus)} | {w.damage}</span>
                          {canEquip && (
                            <button className="equip-toggle-btn equip-toggle-btn--equip" onClick={() => onEquipWeapon(viewingPlayer.id, realIndex)}>
                              Equip
                            </button>
                          )}
                        </div>
                      )
                    })}
                    {otherArmor.map(a => {
                      const realIndex = viewingPlayer.armor.indexOf(a)
                      return (
                        <div key={`a-${realIndex}`} className="equip-stowed-row">
                          <span className="equip-stowed-icon">{a.type === 'shield' ? '\u25CB' : '\u{1F6E1}'}</span>
                          <span className="equip-stowed-name">{a.name}</span>
                          <span className="equip-stowed-detail">{a.type === 'shield' ? `+${a.armorClass}` : `AC ${a.armorClass}`} {a.type}</span>
                          {canEquip && (
                            <button className="equip-toggle-btn equip-toggle-btn--equip" onClick={() => onEquipArmor(viewingPlayer.id, realIndex)}>
                              Equip
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="char-empty">Select a character to view equipment.</div>
            )}
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="context-inventory">
            {viewingPlayer && (
              <>
                <div className="inventory-header">
                  <div className="char-section-title">{viewingPlayer.characterName}'s Inventory</div>
                </div>

                {/* Weapons in backpack */}
                {viewingPlayer.weapons.length > 0 && (
                  <div className="inventory-category">
                    <div className="inventory-category-title">Weapons ({viewingPlayer.weapons.length})</div>
                    {viewingPlayer.weapons.map((w, wi) => (
                      <div key={`w-${wi}`} className={`inventory-item ${w.equipped ? 'inventory-item--equipped' : ''}`}>
                        <div className="inventory-item-icon">&#9876;</div>
                        <div className="inventory-item-info">
                          <div className="inventory-item-name">
                            {w.name}
                            {w.equipped && <span className="inventory-equipped-badge">EQUIPPED</span>}
                          </div>
                          <div className="inventory-item-desc">{fmtMod(w.attackBonus)} to hit, {w.damage} {w.damageType}</div>
                        </div>
                        {canEquip && (
                          w.equipped ? (
                            <button className="inventory-equip-btn inventory-equip-btn--unequip" onClick={() => onUnequipWeapon(viewingPlayer.id, wi)}>
                              Unequip
                            </button>
                          ) : (
                            <button className="inventory-equip-btn inventory-equip-btn--equip" onClick={() => onEquipWeapon(viewingPlayer.id, wi)}>
                              Equip
                            </button>
                          )
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Armor in backpack */}
                {viewingPlayer.armor.length > 0 && (
                  <div className="inventory-category">
                    <div className="inventory-category-title">Armor &amp; Shields ({viewingPlayer.armor.length})</div>
                    {viewingPlayer.armor.map((a, ai) => (
                      <div key={`a-${ai}`} className={`inventory-item ${a.equipped ? 'inventory-item--equipped' : ''}`}>
                        <div className="inventory-item-icon">{a.type === 'shield' ? '\u25CB' : '\u{1F6E1}'}</div>
                        <div className="inventory-item-info">
                          <div className="inventory-item-name">
                            {a.name}
                            {a.equipped && <span className="inventory-equipped-badge">EQUIPPED</span>}
                          </div>
                          <div className="inventory-item-desc">{a.type === 'shield' ? `+${a.armorClass} AC` : `AC ${a.armorClass}`} &middot; {a.type}</div>
                        </div>
                        {canEquip && (
                          a.equipped ? (
                            <button className="inventory-equip-btn inventory-equip-btn--unequip" onClick={() => onUnequipArmor(viewingPlayer.id, ai)}>
                              Unequip
                            </button>
                          ) : (
                            <button className="inventory-equip-btn inventory-equip-btn--equip" onClick={() => onEquipArmor(viewingPlayer.id, ai)}>
                              Equip
                            </button>
                          )
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* General items */}
                {(viewingPlayer.inventory ?? []).length > 0 && (
                  <div className="inventory-category">
                    <div className="inventory-category-title">Items ({(viewingPlayer.inventory ?? []).length})</div>
                    {(viewingPlayer.inventory ?? []).map(item => {
                      const isEquippable = item.category === 'weapon' || item.category === 'armor' || item.category === 'shield'
                      return (
                        <div key={item.id} className="inventory-item">
                          <div className="inventory-item-icon">
                            {item.category === 'weapon' ? '\u2694' :
                             item.category === 'armor' || item.category === 'shield' ? '\u{1F6E1}' :
                             item.category === 'consumable' ? '\u2728' :
                             item.category === 'treasure' ? '\u{1F4B0}' :
                             item.magical ? '\u2728' : '\u{1F4E6}'}
                          </div>
                          <div className="inventory-item-info">
                            <div className="inventory-item-name">
                              {item.name}
                              {item.magical && <span className="inventory-magical-badge">Magical</span>}
                            </div>
                            <div className="inventory-item-desc">{item.description}</div>
                          </div>
                          <div className="inventory-item-actions">
                            {item.value !== undefined && item.value > 0 && (
                              <span className="inventory-item-value">{item.value}gp</span>
                            )}
                            {isEquippable && canEquip && (
                              <button className="inventory-equip-btn inventory-equip-btn--equip" onClick={() => onEquipFromInventory(viewingPlayer.id, item.id)}>
                                Equip
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {viewingPlayer.weapons.length === 0 && viewingPlayer.armor.length === 0 && (viewingPlayer.inventory ?? []).length === 0 && (
                  <div className="char-empty">Inventory is empty. Collect loot to fill it!</div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {helpOpen && viewingPlayer && (() => {
        const prof = viewingPlayer.proficiencyBonus
        const profEntry = SKILL_ENTRIES.find(([key]) => liveProfSet.has(key))
        const nonProfEntry = SKILL_ENTRIES.find(([key]) => !liveProfSet.has(key))

        const breakdown = (entry: [string, string, string], proficient: boolean) => {
          const [sk, name, abLabel] = entry
          const abKey = SKILL_ABILITY_KEY[sk]
          const mod = abilityMod(viewingPlayer.abilities[abKey])
          const total = mod + (proficient ? prof : 0)
          return { name, abLabel, mod, total }
        }

        const pe = profEntry ? breakdown(profEntry, true) : null
        const ne = nonProfEntry ? breakdown(nonProfEntry, false) : null

        return (
          <div className="help-overlay" onClick={() => setHelpOpen(false)}>
            <div className="help-card" onClick={e => e.stopPropagation()}>
              <div className="help-card-header">
                <span>Quick Reference</span>
                <button className="help-card-close" onClick={() => setHelpOpen(false)}>×</button>
              </div>
              <div className="help-card-body">
                <div className="help-section">
                  <div className="help-section-title">Making a Check</div>
                  <div className="help-steps">
                    <div className="help-step"><span className="help-step-num">1</span> DM asks for a check <span className="help-dim">(e.g. &quot;Roll Athletics&quot;)</span></div>
                    <div className="help-step"><span className="help-step-num">2</span> Roll a <strong>d20</strong></div>
                    <div className="help-step"><span className="help-step-num">3</span> Add the modifier shown next to that skill</div>
                    <div className="help-step"><span className="help-step-num">4</span> Tell the DM your total</div>
                  </div>
                </div>

                <div className="help-section">
                  <div className="help-section-title">Ability Scores → Modifiers</div>
                  <div className="help-text">Each ability score produces a modifier added to d20 rolls:</div>
                  <div className="help-mod-grid">
                    {([[8, '-1'], [10, '+0'], [12, '+1'], [14, '+2'], [16, '+3'], [18, '+4'], [20, '+5']] as [number, string][]).map(([s, m]) => (
                      <div key={s} className="help-mod-cell">
                        <span className="help-mod-score">{s}</span>
                        <span className="help-mod-arrow">→</span>
                        <span className="help-mod-val">{m}</span>
                      </div>
                    ))}
                  </div>
                  <div className="help-text help-dim">Odd scores (9, 11, 13…) use the same modifier as the even number below.</div>
                </div>

                <div className="help-section">
                  <div className="help-section-title">Skills & Proficiency</div>
                  <div className="help-text">Each skill is tied to one ability (<span className="help-code">STR</span>, <span className="help-code">DEX</span>, etc.)</div>
                  <div className="help-text">Skill bonus = ability modifier + proficiency bonus if proficient</div>
                  <div className="help-text"><span className="help-prof-dot" /> <strong>Green skills</strong> = proficient → extra <strong>{fmtMod(prof)}</strong></div>
                </div>

                {(pe || ne) && (
                  <div className="help-section">
                    <div className="help-section-title">Your Breakdown</div>
                    {pe && (
                      <div className="help-example help-example--prof">
                        <div className="help-example-name">{pe.name} <span className="help-prof-tag">PROF</span></div>
                        <div className="help-example-math">{fmtMod(pe.total)} = {pe.abLabel} mod ({fmtMod(pe.mod)}) + proficiency ({fmtMod(prof)})</div>
                      </div>
                    )}
                    {ne && (
                      <div className="help-example">
                        <div className="help-example-name">{ne.name}</div>
                        <div className="help-example-math">{fmtMod(ne.total)} = {ne.abLabel} mod ({fmtMod(ne.mod)}) only</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
