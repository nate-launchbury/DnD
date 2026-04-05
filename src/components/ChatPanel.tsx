import { useState, useRef, useEffect } from 'react'
import type { ChatMessage } from '../types/game'
import type { Room } from '../types/dungeon'

interface Props {
  messages: ChatMessage[]
  currentRoom: Room | null
  isDM: boolean
  onSendMessage: (text: string) => void
  onRequestDmNotes: () => void
}

const MESSAGE_STYLES: Record<string, { bg: string; border: string; label: string }> = {
  golden:  { bg: '#2a2010', border: '#c9a227', label: 'Read Aloud' },
  narration: { bg: '#1a1a2e', border: '#555', label: 'Narration' },
  dm_note: { bg: '#1a0a1e', border: '#9b59b6', label: 'DM Notes' },
  combat:  { bg: '#2a1010', border: '#c0392b', label: 'Combat' },
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

export default function ChatPanel({ messages, currentRoom, isDM, onSendMessage, onRequestDmNotes }: Props) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    onSendMessage(input.trim())
    setInput('')
  }

  return (
    <div className="chat-panel">
      <div className="chat-header">
        <h2>
          {currentRoom ? currentRoom.name : 'The Sunken Maw'}
        </h2>
        {isDM && currentRoom && (
          <button className="dm-notes-btn" onClick={onRequestDmNotes}>
            DM Notes
          </button>
        )}
      </div>

      <div className="chat-messages">
        {messages.map(msg => {
          const style = MESSAGE_STYLES[msg.type] || MESSAGE_STYLES.system
          if (msg.type === 'dm_note' && !isDM) return null
          if (msg.type === 'golden' && !isDM) return null

          const displayText = (msg.type === 'combat' && !isDM)
            ? filterCombatForPlayer(msg.text)
            : msg.text

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
        <div ref={bottomRef} />
      </div>

      <form className="chat-input" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type an action or message..."
          autoFocus
        />
        <button type="submit">Send</button>
      </form>
    </div>
  )
}
