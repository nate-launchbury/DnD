import type { Player } from '../types/game'

interface Props {
  players: Player[]
  onSelect: (role: 'dm' | 'player', playerId: string | null) => void
}

export default function CharacterSelect({ players, onSelect }: Props) {
  return (
    <div className="select-screen">
      <div className="select-container">
        <h1 className="select-title">The Sunken Maw</h1>
        <p className="select-subtitle">Choose your role</p>

        <div className="select-grid">
          {players.map(p => (
            <button
              key={p.id}
              className="select-card select-card--player"
              onClick={() => onSelect('player', p.id)}
            >
              <div
                className="select-token"
                style={{ backgroundColor: p.tokenColor }}
              >
                {p.characterName[0]}
              </div>
              <div className="select-name">{p.characterName}</div>
              <div className="select-role">Player</div>
            </button>
          ))}
        </div>

        <div className="select-divider">
          <span>or</span>
        </div>

        <button
          className="select-card select-card--dm"
          onClick={() => onSelect('dm', null)}
        >
          <div className="select-token select-token--dm">DM</div>
          <div className="select-name">Dungeon Master</div>
          <div className="select-role">Full control</div>
        </button>
      </div>
    </div>
  )
}
