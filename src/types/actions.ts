export type GameAction =
  | { type: 'movePlayer'; playerId: string; x: number; y: number }
  | { type: 'moveEnemy'; enemyId: string; x: number; y: number }
  | { type: 'defeatEnemy'; enemyId: string; enemyName: string }
  | { type: 'adjustEnemyHp'; enemyId: string; delta: number }
  | { type: 'collectLoot'; lootId: string; lootName: string; playerId: string; characterName: string }
  | { type: 'adjustHp'; playerId: string; delta: number }
  | { type: 'adjustResource'; playerId: string; resourceIndex: number; delta: number }
  | { type: 'sendMessage'; sender: string; text: string }
  | { type: 'addDmNote'; roomId: string }
  | { type: 'setCurrentRoom'; roomId: string }
  | { type: 'togglePause' }
  | { type: 'startTravel'; fromId: string; toId: string }
  | { type: 'advanceTravel' }
  | { type: 'triggerTravelEvent'; eventId: string }
  | { type: 'resolveTravelEvent' }
  | { type: 'arriveAtDestination' }
  | { type: 'discoverLocation'; locationId: string }
  | { type: 'updatePlayer'; playerId: string; updates: {
      characterName?: string; characterClass?: string; level?: number;
      ac?: number; speed?: number; initiative?: number; proficiencyBonus?: number;
      hitDice?: string; passivePerception?: number; maxHp?: number;
      abilities?: import('../types/game').AbilityScores;
      skills?: import('../types/game').Skills;
      skillProficiencies?: string[];
      resources?: import('../types/game').Resource[];
    }}
  | { type: 'startInitiative'; entries: import('../types/game').InitiativeEntry[] }
  | { type: 'endInitiative' }
  | { type: 'endTurn' }
  | { type: 'updateInitiativeEntry'; entryId: string; roll: number }
  | { type: 'equipWeapon'; playerId: string; weaponIndex: number }
  | { type: 'unequipWeapon'; playerId: string; weaponIndex: number }
  | { type: 'equipArmor'; playerId: string; armorIndex: number }
  | { type: 'unequipArmor'; playerId: string; armorIndex: number }
  | { type: 'equipFromInventory'; playerId: string; inventoryItemId: string }
  | { type: 'unequipToInventory'; playerId: string; slot: 'weapon' | 'armor'; index: number }
  | { type: 'setVisionDistance'; feet: number }
  | { type: 'diceRoll'; roll: import('../types/game').DiceRollResult }
  | { type: 'resetGame' }
