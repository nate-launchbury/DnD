import { useMemo } from 'react'
import type { Campaign } from '../types/campaign'
import type { TravelState } from '../types/game'

interface Props {
  campaign: Campaign
  travel: TravelState
  discoveredLocationIds: Set<string>
  isDM: boolean
  onAdvance: () => void
  onTriggerEvent: (eventId: string) => void
  onResolveEvent: () => void
  onArrive: () => void
}

export default function TravelView({
  campaign, travel, discoveredLocationIds, isDM,
  onAdvance, onTriggerEvent, onResolveEvent, onArrive,
}: Props) {
  const from = campaign.locations.find(l => l.id === travel.fromId)
  const to = campaign.locations.find(l => l.id === travel.toId)
  const route = useMemo(() =>
    campaign.routes.find(
      r => (r.fromId === travel.fromId && r.toId === travel.toId) ||
           (r.fromId === travel.toId && r.toId === travel.fromId)
    ),
    [campaign.routes, travel.fromId, travel.toId]
  )

  const progress = travel.totalDays > 0
    ? Math.min(travel.currentDay / travel.totalDays, 1)
    : 0

  const partyX = from && to
    ? from.pinX + (to.pinX - from.pinX) * progress
    : 50
  const partyY = from && to
    ? from.pinY + (to.pinY - from.pinY) * progress
    : 50

  const isFinished = travel.currentDay >= travel.totalDays - 1 && !travel.activeEventId
  const hasActiveEvent = travel.activeEventId !== null
  const activeEvent = route?.events?.find(e => e.id === travel.activeEventId)
  const unusedEvents = route?.events?.filter(e => e.id !== travel.activeEventId) ?? []

  return (
    <div className="travel-view">
      <div className="travel-map-container">
        <img src={campaign.worldMapImage} alt="World Map" className="travel-map-image" />

        {campaign.locations
          .filter(loc => discoveredLocationIds.has(loc.id) || isDM)
          .map(loc => (
            <div
              key={loc.id}
              className={`travel-pin ${loc.id === travel.fromId || loc.id === travel.toId ? 'travel-pin--active' : ''} ${!discoveredLocationIds.has(loc.id) ? 'travel-pin--hidden' : ''}`}
              style={{ left: `${loc.pinX}%`, top: `${loc.pinY}%` }}
            >
              <span className="travel-pin-dot" />
              <span className="travel-pin-name">{loc.name}</span>
            </div>
          ))
        }

        {from && to && (
          <svg className="travel-route-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line
              x1={from.pinX} y1={from.pinY}
              x2={to.pinX} y2={to.pinY}
              className="travel-route-line"
            />
            <line
              x1={from.pinX} y1={from.pinY}
              x2={from.pinX + (to.pinX - from.pinX) * progress}
              y2={from.pinY + (to.pinY - from.pinY) * progress}
              className="travel-route-progress"
            />
          </svg>
        )}

        <div
          className="travel-party-marker"
          style={{ left: `${partyX}%`, top: `${partyY}%` }}
        >
          <span className="travel-party-icon">⚔️</span>
        </div>
      </div>

      <div className="travel-info-bar">
        <div className="travel-route-label">
          {from?.name ?? '?'} &rarr; {to?.name ?? '?'}
        </div>
        <div className="travel-progress">
          <div className="travel-progress-bar">
            <div className="travel-progress-fill" style={{ width: `${progress * 100}%` }} />
          </div>
          <span className="travel-progress-text">
            Day {travel.currentDay + 1} of {travel.totalDays}
          </span>
        </div>

        {hasActiveEvent && activeEvent && (
          <div className="travel-event-card">
            <div className="travel-event-type">{activeEvent.type}</div>
            <div className="travel-event-name">{activeEvent.name}</div>
            <div className="travel-event-desc">{activeEvent.description}</div>
            {isDM && (
              <button className="travel-event-resolve-btn" onClick={onResolveEvent}>
                Resolve Event
              </button>
            )}
          </div>
        )}

        {isDM && !hasActiveEvent && (
          <div className="travel-dm-controls">
            {!isFinished && (
              <button className="travel-btn" onClick={onAdvance}>
                Advance Day
              </button>
            )}
            {isFinished && (
              <button className="travel-btn travel-btn--arrive" onClick={onArrive}>
                Arrive at {to?.name ?? 'destination'}
              </button>
            )}
            {unusedEvents.length > 0 && !isFinished && (
              <div className="travel-events-list">
                <span className="travel-events-label">Trigger event:</span>
                {unusedEvents.map(evt => (
                  <button
                    key={evt.id}
                    className="travel-event-btn"
                    onClick={() => onTriggerEvent(evt.id)}
                  >
                    {evt.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {!isDM && !hasActiveEvent && (
          <div className="travel-player-status">
            {isFinished
              ? 'Arriving soon...'
              : 'Traveling...'}
          </div>
        )}
      </div>
    </div>
  )
}
