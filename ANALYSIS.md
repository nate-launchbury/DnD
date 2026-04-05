# D&D Game Design -- Object Model, Session Structure & Build Plan

*Extracted from design conversations, Apr 4 2026*

---

## Core Objects

### 1. DM (Dungeon Master)

The orchestrator. Pulls from the Story and pushes to the Table at whatever pacing is appropriate.

**Responsibilities:**
- Creates or prepares the story (homebrew or module)
- Controls the pacing of story revelation
- Plays all NPCs (needs quick access to NPC voice/demeanor/goals)
- Sets difficulty classes for skill checks
- Decides when players level up
- Can amend the base rules (house rules)

**Product constraint (future):** The product should make it hard for the DM to be a "bad DM" -- enforcing narrative consistency so they can't silently retcon established facts that players have already interacted with.

---

### 2. Players

Consumers of the story through the Table. Creators of their own characters.

**Responsibilities:**
- Create their own character (race, class, narrative background)
- Interact with the story through the Table
- Make decisions, interact with NPCs, engage in combat
- Track their own character progression

**Data access rule:** Players see the *public* story (everything they've experienced so far) but are guaranteed to *never* see the private story. This is a hard product boundary.

---

### 3. Story

The content layer. Has a clear public/private divide.

**Properties:**
- **Public story** -- what players have seen and experienced. Gives them context for the current session so "the storytelling hits hit properly."
- **Private story** -- what only the DM knows. Future events, NPC true motivations, unrevealed secrets, upcoming breadcrumbs.

**Structure:** Relatively flat. "Just a bunch of files, not much business logic." Not deeply nested objects -- more like a content repository.

**Two modes of creation:**
- **Homebrew** -- DM builds everything from scratch
- **Module** -- Story is pre-populated from a published book. DM acts as a user of the story, making small amendments.

**Contains:**
- World (locations, dungeons, towns, geography)
- NPCs (voice, demeanor, goals, relationships, secrets)
- Quest hooks and objectives
- Breadcrumbs (data points that lead to revelations)
- Secrets (private facts that become public through play)

---

### 4. Table

The intermediary surface. Where the story is actually *told and played*.

**Key insight:** "At any one time, the table only contains fragments of the story." It's not the story itself -- it's the currently active view of the story.

**Why it's separate from Story:** Players interact with the Table directly, sometimes *without* interacting with the Story yet. Example: combat happens on the Table (grid, tokens, positioning) before any narrative consequence flows back to the Story.

**Core function for combat:** Grid-based, token-based spatial representation. This is where strict rules enforcement matters most.

---

### 5. Rules

The shared language. Governs how all objects are allowed to interact.

**V1 approach:** Rules stay entirely manual. Players and DM handle rules the way they already do -- look them up when needed, ignore them when obvious. "The right way to approach D&D is just play make believe with your friends, but if you can't decide how something should work, somebody's already thought it all through."

**Future:** Could be knowledge-based into AI so it can cite specific pages when enforcing rules. House rules could be toggle-based overrides.

---

## Sub-Objects & Components

### World
Possibly its own object separate from Story. Contains:
- **Towns** -- freedom of movement, many NPCs, shops, shrines, open exploration
- **Dungeons** -- controlled paths, combat-focused, enclosed spaces
- **Wilderness/Roads** -- exploration space between locations

### NPCs
Each NPC needs a quick-reference "article":
- Voice/accent notes
- General demeanor
- Goals and motivations
- Secrets they hold
- Relationships to other NPCs and story threads

### Breadcrumbs
Data points that lead players toward story revelations.
- **Location-fluid:** Same breadcrumb can surface in different contexts
- **Recommended minimum:** ~3 per secret/objective
- DM tracks which have surfaced and which haven't

### Player Characters
- **Race**, **Class**, **Narrative background** (the three essentials)
- Stats (derived from race + class + rolls, ~20 skill attributes)
- Level (advances at DM discretion)

### Downtime Activities
What characters do between sessions. Creates NPCs and relationships that can become active story elements.

---

## Three Core Interaction Types

1. **Combat** -- Very strict rules. Grid/token-based. Happens primarily in dungeons.
2. **Interaction** -- Roleplaying with NPCs. Persuasion, bartering, intimidation. DM sets difficulty class.
3. **Exploration** -- Traveling between locations. Random encounters. Some DMs fast-forward this.

---

## Session Structure (End-to-End Flow)

### Pre-Session
1. Find participants
2. DM prepares: establish world, define starting point, define objective (work backwards), create breadcrumbs (~3), flesh out NPCs, set up downtime activities
3. Players create characters within DM-provided constraints

### During Session
1. DM sets the scene (pulls from private story, pushes to table)
2. Players interact through combat/interaction/exploration
3. Breadcrumbs surface organically based on player choices
4. Path is flexible, data points are fixed

### Post-Session
- Downtime activities resolve
- DM decides level-ups
- Public story updates
- DM preps next session based on player choices

---

## Design Principle

**Don't cross the line between D&D and a video game.** If you turn D&D into a video game, you get a shitty version of both. D&D's spirit is imagination. The product should make it as easy as possible to *communicate* with others, not replace imagination with visuals.

---

## Build Roadmap

### V1 -- Shared Map with Public/Private Objects (Build Today)

A shared map/whiteboard where the DM places objects with public/private attributes. Hosted on GitHub Pages.

**In scope:**
- Shared map/board that DM and players view simultaneously
- Objects on the map (NPCs, locations, items) with editable text attributes
- Public/private toggle on each attribute
- Per-player visibility controls (fog of war)
- DM view (sees everything) vs. player view (sees only revealed content)
- Hosted on GitHub Pages -- everyone accesses via URL
- Built for the existing campaign with Nate, Guy, and John

**Out of scope:**
- AI integration (use Claude on the side, copy-paste in)
- Character creation
- Combat mechanics / HP tracking / dice rolling
- Rules enforcement
- AI-voiced NPCs

**Key decisions:**
- Public/private boundary: DM explicitly reveals (toggle-based, not inferred)
- Object attributes: free-form text (just notes for yourself)
- No structured forms or validation
- No backend needed

---

### V2 -- AI Dungeon (Fast Follow)

AI generates a dungeon and privately DMs it to the human DM, who relays to players. The chatbot is private (DM-only). Guided mode.

**In scope:**
- AI generates dungeon: map, enemies, stat blocks, read-aloud text, fog of war
- "Golden text box" concept: AI gives DM context + highlighted text to read aloud
- DM reads AI output and relays to players
- Character creation assist (chatbot connected to world knowledge base)

**Key insight:** Dungeons need less creative control than town/RP. Collaborative storytelling matters at the campaign level, not individual dungeon level. Handing dungeon-running to AI is low-risk, high-value.

---

### V3 -- AI DM Goes Public

Same product as V2, but the AI chatbot talks directly to players. The human DM joins as a player.

**Pitch:** "Hey DM, sick of always being a DM and never being able to play? Let us drop a low-consequence dungeon into your world that you get to participate in."

**Three future toggle modes:**
1. Expert mode -- just attributes and properties, DM does everything
2. Guided mode -- AI provides golden text boxes, DM relays (V2)
3. AI-driven mode -- AI interacts directly with players (V3)

---

## Resolved Questions

- **Public/private boundary:** DM explicitly reveals. Toggle-based.
- **Rules architecture:** Manual for V1. Not a product concern yet.
- **Retcon detection:** Out of scope entirely.
- **AI role in V1:** None inside the product. Claude on the side.

## Remaining Open Questions for V1

- What does the map/board layout look like? 2D grid vs. clickable locations?
- What is the minimal object schema? (NPC: name, occupation, voice, goals, secrets?)
- How does fog of war work technically in a static-hosted app?
- State management: JSON file that DM updates and pushes, or real-time?
- How do players distinguish their view from each other's? (URL param? Login?)
