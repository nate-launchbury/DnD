import type { Dungeon, Cell } from '../types/dungeon'

function makeGrid(width: number, height: number, rooms: Dungeon['rooms']): Cell[][] {
  const grid: Cell[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, (): Cell => ({ type: 'wall', roomId: null }))
  )

  for (const room of rooms) {
    const { x, y } = room.position
    const { width: w, height: h } = room.size
    for (let row = y; row < y + h; row++) {
      for (let col = x; col < x + w; col++) {
        if (row >= 0 && row < height && col >= 0 && col < width) {
          grid[row][col] = { type: 'floor', roomId: room.id }
        }
      }
    }
  }

  // Carve corridors between connected rooms
  const roomCenters = new Map(rooms.map(r => [
    r.id,
    { x: r.position.x + Math.floor(r.size.width / 2), y: r.position.y + Math.floor(r.size.height / 2) }
  ]))

  const carved = new Set<string>()
  for (const room of rooms) {
    for (const connId of room.connections) {
      const key = [room.id, connId].sort().join('-')
      if (carved.has(key)) continue
      carved.add(key)

      const from = roomCenters.get(room.id)!
      const to = roomCenters.get(connId)!

      let cx = from.x, cy = from.y
      while (cx !== to.x) {
        if (grid[cy][cx].type === 'wall') {
          grid[cy][cx] = { type: 'floor', roomId: null }
        }
        cx += cx < to.x ? 1 : -1
      }
      while (cy !== to.y) {
        if (grid[cy][cx].type === 'wall') {
          grid[cy][cx] = { type: 'floor', roomId: null }
        }
        cy += cy < to.y ? 1 : -1
      }
    }
  }

  return grid
}

const rooms: Dungeon['rooms'] = [
  {
    id: 'entrance',
    name: 'Cave Entrance',
    readAloud: 'The mouth of the cave yawns before you, a damp wind carrying the stench of rot and something reptilian. Claw marks scar the stone walls, and broken torches litter the ground — someone was here before you, and they left in a hurry.',
    dmNotes: 'DC 14 Perception: the claw marks are fresh, within the last day. DC 12 Nature: the smell is distinctly lizardfolk.',
    position: { x: 8, y: 18 },
    size: { width: 4, height: 3 },
    enemies: [],
    npcs: [],
    loot: [
      { id: 'torch-1', name: 'Cracked Torch', description: 'A broken torch, still faintly warm. Someone dropped this recently.', value: 0, category: 'gear' }
    ],
    connections: ['guard-post']
  },
  {
    id: 'guard-post',
    name: 'Lizardfolk Guard Post',
    readAloud: 'The tunnel opens into a rough chamber. Two crude wooden barricades have been dragged across the narrowest point. Behind them, you hear hissing and the scrape of claws on stone.',
    dmNotes: 'Two lizardfolk scouts are on watch. They will try to alert the barracks if combat goes badly (one flees on round 3 if both are still alive, round 1 if one drops).',
    position: { x: 7, y: 13 },
    size: { width: 6, height: 4 },
    enemies: [
      {
        id: 'lizard-scout-1', name: 'Lizardfolk Scout', hp: 22, maxHp: 22, ac: 14,
        speed: '30 ft., swim 30 ft.', cr: '1/2',
        attacks: [
          { name: 'Javelin', toHit: 4, damage: '1d6+2 piercing', reach: '30/120 ft.' },
          { name: 'Bite', toHit: 4, damage: '1d6+2 piercing' }
        ]
      },
      {
        id: 'lizard-scout-2', name: 'Lizardfolk Scout', hp: 22, maxHp: 22, ac: 14,
        speed: '30 ft., swim 30 ft.', cr: '1/2',
        attacks: [
          { name: 'Javelin', toHit: 4, damage: '1d6+2 piercing', reach: '30/120 ft.' },
          { name: 'Bite', toHit: 4, damage: '1d6+2 piercing' }
        ]
      }
    ],
    npcs: [],
    loot: [
      { id: 'javelin-bundle', name: 'Bundle of Javelins (6)', description: 'Crude but functional javelins.', value: 3, category: 'weapon', attackBonus: 4, damage: '1d6+2', damageType: 'piercing', weaponProperties: ['thrown (30/120)'] }
    ],
    connections: ['entrance', 'barracks', 'mushroom-cavern']
  },
  {
    id: 'mushroom-cavern',
    name: 'Phosphorescent Cavern',
    readAloud: 'An ethereal blue-green glow fills this cavern. Giant mushrooms, some taller than a person, cluster around shallow pools of still water. The air is thick with spores, and your footsteps echo strangely.',
    dmNotes: 'DC 13 Constitution save or become mildly disoriented (disadvantage on Perception for 10 minutes). DC 15 Nature: some mushrooms are edible and mildly restorative (eating one restores 1d4 HP). The large mushroom in the center is actually a gas spore — if disturbed, it explodes (DC 15 CON save, 3d6 poison on fail).',
    position: { x: 1, y: 12 },
    size: { width: 5, height: 5 },
    enemies: [],
    npcs: [],
    loot: [
      { id: 'glow-mushroom', name: 'Glowing Mushrooms (3)', description: 'Phosphorescent fungi that provide dim light in a 10-foot radius for 24 hours after being picked.', value: 5, category: 'gear' },
      { id: 'healing-mushroom', name: 'Cave Morel', description: 'An edible mushroom with mild restorative properties. Restores 1d4 HP when consumed.', value: 10, magical: true, category: 'consumable' }
    ],
    connections: ['guard-post', 'hag-approach']
  },
  {
    id: 'barracks',
    name: 'Lizardfolk Barracks',
    readAloud: 'Crude nests of reeds and animal hides line the walls of this long chamber. The remains of a recent meal — bones, scales, and something you hope was an animal — sit in the center around a dying fire. Four lizardfolk warriors look up from their rest, eyes narrowing.',
    dmNotes: 'Four lizardfolk are here, but only 3 are combat-ready. The fourth is injured (half HP, the bandaged one). If the scouts from the guard post fled here, add them to the encounter and the lizardfolk are NOT surprised. Otherwise, the party gets a surprise round.',
    position: { x: 13, y: 10 },
    size: { width: 6, height: 4 },
    enemies: [
      {
        id: 'lizard-warrior-1', name: 'Lizardfolk Warrior', hp: 33, maxHp: 33, ac: 15,
        speed: '30 ft., swim 30 ft.', cr: '1',
        attacks: [
          { name: 'Heavy Club', toHit: 5, damage: '1d8+3 bludgeoning' },
          { name: 'Shield Bash', toHit: 5, damage: '1d4+3 bludgeoning', description: 'Target must succeed DC 13 STR save or be knocked prone.' },
          { name: 'Bite', toHit: 5, damage: '1d6+3 piercing' }
        ]
      },
      {
        id: 'lizard-warrior-2', name: 'Lizardfolk Warrior', hp: 33, maxHp: 33, ac: 15,
        speed: '30 ft., swim 30 ft.', cr: '1',
        attacks: [
          { name: 'Heavy Club', toHit: 5, damage: '1d8+3 bludgeoning' },
          { name: 'Bite', toHit: 5, damage: '1d6+3 piercing' }
        ]
      },
      {
        id: 'lizard-warrior-3', name: 'Lizardfolk Warrior', hp: 33, maxHp: 33, ac: 15,
        speed: '30 ft., swim 30 ft.', cr: '1',
        attacks: [
          { name: 'Heavy Club', toHit: 5, damage: '1d8+3 bludgeoning' },
          { name: 'Bite', toHit: 5, damage: '1d6+3 piercing' }
        ]
      },
      {
        id: 'lizard-warrior-4', name: 'Lizardfolk Warrior (Injured)', hp: 16, maxHp: 33, ac: 15,
        speed: '30 ft., swim 30 ft.', cr: '1',
        attacks: [
          { name: 'Heavy Club', toHit: 5, damage: '1d8+3 bludgeoning' },
          { name: 'Bite', toHit: 5, damage: '1d6+3 piercing' }
        ]
      }
    ],
    npcs: [],
    loot: [
      { id: 'gold-pouch', name: 'Coin Pouch', description: 'A leather pouch containing 23 gold pieces and 40 silver pieces.', value: 27, category: 'treasure' },
      { id: 'shield-1', name: 'Bone Shield', description: 'A shield made from the ribcage of something large. Functions as a normal shield (+2 AC).', value: 10, category: 'shield', armorClass: 2 }
    ],
    connections: ['guard-post', 'shrine']
  },
  {
    id: 'shrine',
    name: 'Desecrated Shrine',
    readAloud: 'What was once a small natural shrine has been twisted into something wrong. Totems of bone and feathers hang from the ceiling, and dark stains cover a crude stone altar. The air hums with a faint, sickly energy. A mural on the far wall depicts a woman rising from dark water, hands outstretched.',
    dmNotes: 'This is where the hag communicates with the lizardfolk leader. DC 14 Arcana: the altar radiates faint transmutation magic — it\'s a scrying focus. DC 16 Investigation: hidden compartment in the altar contains a scroll. The mural depicts the hag, Granny Mosspeak.',
    position: { x: 14, y: 4 },
    size: { width: 5, height: 5 },
    enemies: [],
    npcs: [],
    loot: [
      { id: 'scroll-1', name: 'Scroll of Protection from Evil and Good', description: 'A crumbling scroll sealed with black wax. Single use.', value: 100, magical: true, category: 'consumable' },
      { id: 'totem-1', name: 'Bone Totem', description: 'A crude totem carved from humanoid bone. Unsettling to hold. Radiates faint necromancy.', value: 25, category: 'gear' }
    ],
    connections: ['barracks', 'hag-lair']
  },
  {
    id: 'hag-approach',
    name: 'The Sunken Passage',
    readAloud: 'The tunnel slopes downward sharply. Water seeps from the walls, and within a dozen steps you\'re ankle-deep in dark, cold water. The phosphorescent glow from behind you fades, replaced by a sickly yellow-green light pulsing from somewhere ahead. You hear singing — thin, reedy, and deeply wrong.',
    dmNotes: 'The water is waist-deep by the time they reach the hag\'s lair. Medium creatures have difficult terrain here. The singing is the hag — DC 12 WIS save or be frightened until the end of their next turn (first time hearing it only).',
    position: { x: 1, y: 5 },
    size: { width: 4, height: 5 },
    enemies: [],
    npcs: [],
    loot: [
      {
        id: 'magic-sword-1',
        name: '+1 Longsword of the Drowned',
        description: 'A finely crafted longsword half-buried in the silt, its blade of dark steel gleaming with an inner blue-green light. Water beads along the edge but never drips. The crossguard is shaped like outstretched serpent wings, and the pommel bears a coiled sea-serpent devouring its own tail. Faint runes pulse along the fuller when drawn. This weapon grants a +1 bonus to attack and damage rolls.',
        value: 500,
        magical: true,
        category: 'weapon',
        attackBonus: 7,
        damage: '1d8+4',
        damageType: 'slashing',
        weaponProperties: ['versatile (1d10+4)', 'magical']
      }
    ],
    connections: ['mushroom-cavern', 'hag-lair']
  },
  {
    id: 'hag-lair',
    name: 'Granny Mosspeak\'s Lake',
    readAloud: 'The passage opens into a vast underground lake. The water is black and still as glass, reflecting the sickly bioluminescence of the cavern ceiling like a night sky. In the center of the lake, a gnarled tree grows impossibly from a small island of stone and mud. Beneath it sits a hunched figure, fingers trailing in the water. She looks up at you and smiles with too many teeth.\n\n"Oh, visitors. How lovely. I was just thinking about how hungry I am."',
    dmNotes: 'Granny Mosspeak is a Green Hag. She will try to bargain before fighting — she wants the bone totem from the shrine returned (the lizardfolk stole it from her). If the party has the totem, she offers information about the lizardfolk leader\'s weakness. If they refuse or attack, she fights. She\'ll flee into the water at half HP and use the lake for advantage. The tree on the island is her heartwood — destroying it (AC 10, 30 HP, vulnerable to fire) kills her permanently even if she flees.',
    position: { x: 5, y: 1 },
    size: { width: 7, height: 5 },
    enemies: [
      {
        id: 'granny-mosspeak', name: 'Granny Mosspeak (Green Hag)', hp: 82, maxHp: 82, ac: 17,
        speed: '30 ft., swim 30 ft.', cr: '3',
        attacks: [
          { name: 'Claws', toHit: 6, damage: '2d8+4 slashing' },
        ],
        abilities: [
          'Amphibious: Can breathe air and water.',
          'Mimicry: Can mimic animal sounds and humanoid voices. DC 14 Insight to detect.',
          'Invisible Passage: Can turn invisible until she attacks or casts a spell.',
          'Illusory Appearance: Covers herself and anything she wears/carries with an illusion. DC 20 Investigation to see through.',
          'Innate Spellcasting: At will — dancing lights, minor illusion, vicious mockery. 1/day — fog cloud, charm person.'
        ]
      }
    ],
    npcs: [],
    loot: [
      { id: 'hag-eye', name: 'Hag Eye Gem', description: 'A milky gemstone that faintly pulses with light. Can be used as an arcane focus. Once per day, the holder can cast Detect Magic without using a spell slot.', value: 250, magical: true, category: 'gear' },
      { id: 'gold-hoard', name: 'Hag\'s Hoard', description: 'A rotting chest beneath the tree roots containing 150 gold pieces, a silver mirror (25gp), and three potions of healing.', value: 225, category: 'treasure' }
    ],
    connections: ['hag-approach', 'shrine']
  }
]

export const sampleDungeon: Dungeon = {
  id: 'lizard-cave',
  name: 'The Sunken Maw',
  theme: 'Underground cave complex, lizardfolk and hag',
  description: 'A cave system beneath the coastal cliffs where a tribe of lizardfolk have been raiding fishing boats. The lizardfolk are being controlled by Granny Mosspeak, a green hag who lives in an underground lake at the heart of the cave.',
  difficulty: 'medium',
  playerLevel: 5,
  partySize: 4,
  rooms,
  map: {
    width: 22,
    height: 22,
    grid: makeGrid(22, 22, rooms)
  }
}
