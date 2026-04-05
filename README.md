# D&D
Clone the repo and then run it 

This is going to be a fucking hit

### Michael
1. `git pull --rebase` to be up to date
1. `git add -A` to add all local changes to your commit 
1. `git commit -m "<my commit message>"` to make your commit 
1. `git pull --rebase` again 
1. `git push` to push your local changes to the repo
=======

DnD Exploration — Who Does What
The Team
Nate — The Cartographer Build the world. Forge the characters. Set the stage.

Michael — The Chronicler Make every roll land. Every room reveal. Every story beat hit.

Nate's Territory
You own everything that happens before and around the game — the tools the DM uses to create, prepare, and manage a session.

Build these systems:

Character Creator — Full creation flow: race, class, abilities, skills, equipment, backstory. Replace the hardcoded characters with a real builder.

Bestiary & Items — Monster builder with stat blocks and CR. Item creator for weapons, armor, potions, magic items. Loot tables. Trap designer. An SRD library to pull from.

Dungeon Editor — Visual grid editor where the DM paints rooms, draws corridors, places doors, and populates everything with creatures, NPCs, loot, traps, secrets, and interactive objects from the bestiary.

Encounter Design — Difficulty calculator, XP budgets, enemy behavior tags (aggressive, defensive, flees at half HP), boss mechanics (lair actions, legendary actions), reinforcement waves.

Campaign & World Builder — World map editor, location management, travel routes and events, NPC builder (personality, dialogue, merchant inventory), quest designer, faction system, atmosphere tagging (assign sounds and moods to rooms).

DM Runtime Tools — DM screen with party stats at a glance, secret rolls, condition application, enemy HP tracking, improvisation tables (random names, rumors, weather), contextual room notes, manual fog control.

Session Management — Save/load, import/export, setup-to-play phase transition, server overhaul to accept dynamic content.

Michael's Territory
You own everything that happens during the game — how players interact with the world and how the world reacts back.

Build these systems:

Combat Engine — Attack rolls vs AC, damage, action economy (Action / Bonus Action / Reaction / Movement tracking), all 15 D&D conditions with visual indicators and mechanical effects, opportunity attacks, critical hits, death saves with cinematic tension.

Spell System — Spell slot tracking, spell list with search/filter, casting flow (select → target → roll → resolve), concentration tracking and saves, area-of-effect grid overlays, cantrips vs leveled spells, ritual casting.

Skill Checks — DM-prompted rolls with hidden DCs, advantage/disadvantage as a first-class concept, contested rolls, passive perception auto-detection, group checks, saving throws, tool proficiency.

Exploration & Environment — Smooth fog-of-war, dynamic lighting (torch radius, darkvision in grayscale, magical darkness), trap triggers and disarming, secret door discovery, interactive objects (levers, chests, locked doors), difficult terrain, environmental hazards, threatened square highlighting.

Atmosphere & Cinematic Moments — Ambient soundscapes per room, combat music, environmental color grading, particle effects (rain, snow, embers), room reveal drama, nat 20/nat 1 celebrations, boss introductions, death save tension (heartbeat, vignette), kill shots, "previously on..." session recaps.

Character & Party Experience — Drag-and-drop equipment, inventory with consumable use and encumbrance, short/long rest mechanics, party HP dashboard, marching order, inspiration, gold tracking, merchant/shop UI, adventure journal, XP/level-up flow.

Chat & Social — Real-time messaging, whispers, emotes, in-character vs out-of-character, styled DM narration, NPC dialogue with social check integration, rich encounter log formatting.

Dice Experience — 3D dice with physics, advantage/disadvantage visualization, contextual roll types, grouped rolls (8d6 fireball), roll history with stats, dramatic slow-mo on high-stakes rolls, DM secret rolls, integrated roll-to-outcome narration.

Stay Out of Each Other's Lanes
Nate, don't touch:

How the dungeon map renders (fog, lighting, tokens, animations)
Dice visuals or roll experience
Combat mechanics or initiative UX
The encounter log, chat, or any player-facing UI during gameplay
Global styling
Michael, don't touch:

Character creation or the setup screens
Dungeon/campaign/monster/item data schemas (Nate evolves these)
The dungeon editor, world map editor, or any DM authoring tools
Session save/load or server initialization
The data files (players, sample dungeon, sample campaign)
Where Your Work Meets
You don't need to coordinate daily, but you do share a few surfaces. The rule is simple: add, don't break.

Player interface — Nate defines what a character is (race, class, stats, spells). Michael defines how that character plays (combat state, conditions, action tracking). Both add fields. Neither removes them.

Action types — Both add new actions to the same union type. Nate's start with create/edit/setup. Michael's use player verbs: attack/cast/use/roll.

Game engine — Nate prefers new files for world-builder logic. Michael prefers new files for combat/skills/spells. Keep the shared engine file stable.

App.tsx — Nate adds setup/editor screen routing. Michael modifies the in-game layout. Put your screens in separate folders (setup/ vs game/) and this stays clean.

Server — Nate handles initialization and session persistence. Michael handles new runtime action handlers. Stay in your lane of the switch statement.

The Handoff
Nate builds it. Michael makes it come alive.

Nate produces...	Michael consumes...
A Player from the character creator	Combat, dice, spells, party dashboard all use it
A Dungeon from the editor	Map rendering, fog, lighting, traps, secrets
Enemy stat blocks with behavior tags	Combat resolution, AI turn suggestions
NPC data with personality and inventory	Dialogue UI, social checks, merchant shops
Atmosphere tags on rooms	Ambient sound, color grading, music cues
Loot tables	Loot generation and treasure reveal
If you change a shared interface, tell the other person.

AI Prompts
Nate's Prompt — The Cartographer
You are helping Nate build the DM/World Builder side of a D&D multiplayer session
tool called DnD Exploration. Stack: React 19 + TypeScript + Vite, Node WebSocket
server (ws, port 4000).
Nate is "The Cartographer" — he builds the world, forges characters, designs
encounters, and manages sessions. He does NOT touch the player runtime experience.
=== WHAT YOU'RE BUILDING ===
1. CHARACTER CREATOR — Full creation flow: race, class, abilities, skills, equipment,
   backstory. Replace hardcoded PCs in src/data/players.ts. Output: valid Player
   object (src/types/game.ts).
2. BESTIARY & ARSENAL — Monster builder with full stat blocks and CR. Item creator
   (weapons, armor, consumables, magic items). Loot table builder. Trap & hazard
   designer. SRD library.
3. DUNGEON EDITOR — Visual grid editor: paint rooms, draw corridors, place doors.
   Populate with creatures, NPCs, items, traps, secrets, interactables from bestiary.
   Multi-floor. Themes. Read-aloud text and DM notes per room. Output: valid Dungeon
   (src/types/dungeon.ts).
4. ENCOUNTER DESIGN — Difficulty calculator (Easy/Medium/Hard/Deadly), XP budgets,
   enemy behavior presets (aggressive/defensive/cowardly/tactical), lair + legendary
   actions for bosses, wave/reinforcement triggers, custom encounter start conditions.
5. CAMPAIGN & WORLD BUILDER — World map editor (upload image, place pins, draw
   routes). Location management. Travel events with probability. NPC builder
   (personality, disposition, dialogue, knowledge, merchant inventory). Quest designer
   (objectives, rewards, stages). Faction system. Atmosphere tags on rooms/locations
   (sound profile, lighting mood, music cue).
6. DM RUNTIME TOOLS — DM screen (party stats at a glance, DC reference, room notes).
   Secret rolls. Apply/remove conditions on any creature with duration. Enemy HP
   tracking. Improvisation tables (random names, rumors, weather). Contextual room
   notes. Manual fog reveal/hide.
7. SESSION MANAGEMENT — Save/load with auto-save. Campaign persistence. Import/export
   as JSON. Setup → Play phase transition. Server overhaul to accept dynamic content.
=== STAY AWAY FROM ===
- How the dungeon map renders (fog, lighting, tokens, animations)
- Dice visuals or roll animations
- Combat mechanics, initiative player UX, attack resolution
- Encounter log, chat UI, spell casting UI
- Global styling (src/index.css)
- These components: DungeonMap, DiceRoller, FloatingPanel, ChatPanel, ContextPane
=== SHARED FILES ===
You can ADD to these, but don't restructure or remove existing fields:
- src/types/game.ts — Add character-definition and setup fields
- src/types/actions.ts — Add actions prefixed create/edit/setup/save
- src/engine/gameEngine.ts — Prefer new files (worldBuilder.ts, etc.)
- server/index.ts — Modify init and setup-phase handling only
- src/components/App.tsx — Add setup screen routing only
=== OUTPUT CONTRACTS ===
Your editors produce objects Michael's systems consume at runtime:
- Player, Dungeon, Room, Enemy, NPC, Item, Campaign, CampaignLocation, CampaignRoute
Extend these interfaces by adding fields. Never remove or rename existing ones.
Prefer creating new files over modifying shared ones. When unsure about scope, ask.
Michael's Prompt — The Chronicler
You are helping Michael build the Player Experience side of a D&D multiplayer session
tool called DnD Exploration. Stack: React 19 + TypeScript + Vite, Node WebSocket
server (ws, port 4000).
Michael is "The Chronicler" — he makes every roll land, every room reveal, every
story beat hit. He does NOT touch world/session authoring tools.
=== WHAT YOU'RE BUILDING ===
1. COMBAT ENGINE — Attack rolls vs AC, damage, weapon properties. Action economy
   (Action/Bonus Action/Reaction/Movement tracking with visual bar). Standard actions
   (Attack, Dash, Dodge, Disengage, Help, Hide, Ready). All 15 D&D conditions with
   token indicators, mechanical automation, duration tracking, hover rules cards.
   Death saves with cinematic tension. Opportunity attacks. Critical hits/misses.
2. SPELL SYSTEM — Spell slot tracking, spell list UI with search/filter, casting flow
   (select → target → roll → resolve), concentration tracking + CON saves, area of
   effect grid overlays (cone/sphere/line/cube), cantrips vs leveled, ritual casting.
3. SKILL CHECKS — DM-prompted rolls with hidden DCs, advantage/disadvantage (2d20,
   take higher/lower), contested rolls, passive perception auto-detection, group
   checks, saving throws, tool proficiency.
4. EXPLORATION & ENVIRONMENT — Smooth fog-of-war, dynamic lighting (torch radius,
   darkvision grayscale, magical darkness), vision modes, trap triggers and disarming,
   secret door discovery, interactive objects, difficult terrain, environmental
   hazards, threatened squares, movement depth.
5. ATMOSPHERE & CINEMATIC MOMENTS — Ambient soundscapes per room with crossfade,
   combat/boss music, environmental color grading, particle effects (rain/snow/embers),
   room reveal drama, nat 20/1 celebrations, boss introductions, death save tension
   (heartbeat, vignette), kill shots, "previously on..." recaps.
6. CHARACTER & PARTY EXPERIENCE — Drag-and-drop equipment, inventory with consumables
   and encumbrance, short/long rest mechanics, party HP dashboard, marching order,
   inspiration, gold/currency, merchant/shop UI, adventure journal, XP and level-up.
7. CHAT & SOCIAL — Real-time messaging, whispers, emotes, IC/OOC toggle, styled DM
   narration, NPC dialogue with social checks, rich encounter log formatting.
8. DICE EXPERIENCE — 3D physics dice, advantage/disadvantage visualization, contextual
   roll types, grouped rolls, roll history with stats, dramatic slow-mo, DM secret
   rolls, integrated roll-to-outcome narration.
=== STAY AWAY FROM ===
- Character creation or setup screens
- Dungeon/campaign/monster/item data schemas (Nate evolves these)
- Dungeon editor, world map editor, any DM authoring tools
- Session save/load, server initialization
- Data files: players.ts, sampleDungeon.ts, sampleCampaign.ts
- These components: CharacterSelect, WorldMap, TravelView
=== SHARED FILES ===
You can ADD to these, but don't restructure or remove existing fields:
- src/types/game.ts — Add runtime fields (combat state, conditions, spell slots)
- src/types/actions.ts — Add player verb actions (attack/cast/use/roll/rest)
- src/engine/gameEngine.ts — Prefer new files (combat.ts, skills.ts, spells.ts)
- server/index.ts — Add runtime action handlers only
- src/components/App.tsx — Modify in-game layout only
=== INPUT CONTRACTS ===
Your systems consume interfaces Nate's editors produce:
- Player — treat character-definition fields as read-only during gameplay
- Dungeon/Room — render what you get, handle traps/secrets/lighting from room data
- Enemy — use stat blocks for combat, behavior presets for AI
- NPC — display in dialogue, use for social checks and shops
- Atmosphere tags — drive sound, mood, and music
- Loot tables — generate loot on room clear
These may gain new fields. Code defensively with optional chaining and defaults.
Prefer creating new files over modifying shared ones. When unsure about scope, ask.
>>>>>>> fc6db29 (updated the readme and added visual updates to dungeon)
