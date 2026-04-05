import type { Campaign } from '../types/campaign'

interface Props {
  campaign: Campaign
  discoveredLocationIds: Set<string>
  currentLocationId: string | null
  isDM: boolean
  isTraveling: boolean
  onStartTravel?: (toId: string) => void
}

export default function WorldMap({
  campaign, discoveredLocationIds, currentLocationId,
  isDM, isTraveling, onStartTravel
}: Props) {
  return (
    <div className="world-map-inline">
      <div className="world-map-image-container">
        <img src={campaign.worldMapImage} alt="World Map" className="world-map-image" />

        {campaign.locations.map(loc => {
          const isVisible = discoveredLocationIds.has(loc.id) || isDM
          if (!isVisible) return null
          const isCurrent = loc.id === currentLocationId
          const isUndiscovered = !discoveredLocationIds.has(loc.id)

          return (
            <div
              key={loc.id}
              className={`world-map-pin ${isCurrent ? 'world-map-pin--current' : ''} ${isUndiscovered ? 'world-map-pin--undiscovered' : ''}`}
              style={{ left: `${loc.pinX}%`, top: `${loc.pinY}%` }}
              title={loc.name}
            >
              <span className="world-map-pin-icon">{isCurrent ? '📍' : '📌'}</span>
              <span className="world-map-pin-label">{loc.name}</span>
            </div>
          )
        })}

        {campaign.routes.map(route => {
          const from = campaign.locations.find(l => l.id === route.fromId)
          const to = campaign.locations.find(l => l.id === route.toId)
          if (!from || !to) return null
          const bothVisible = (discoveredLocationIds.has(from.id) || isDM) &&
                              (discoveredLocationIds.has(to.id) || isDM)
          if (!bothVisible) return null

          return (
            <svg key={`${route.fromId}-${route.toId}`} className="context-map-route-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
              <line
                x1={from.pinX} y1={from.pinY}
                x2={to.pinX} y2={to.pinY}
                stroke="#c9a227"
                strokeWidth="0.3"
                strokeDasharray="1 0.5"
                opacity="0.4"
              />
            </svg>
          )
        })}
      </div>

      {isDM && !isTraveling && currentLocationId && onStartTravel && (
        <div className="context-map-travel-controls">
          <div className="context-map-travel-label">Travel to:</div>
          {campaign.locations
            .filter(loc => loc.id !== currentLocationId && (discoveredLocationIds.has(loc.id) || isDM))
            .filter(loc => campaign.routes.some(
              r => (r.fromId === currentLocationId && r.toId === loc.id) ||
                   (r.toId === currentLocationId && r.fromId === loc.id)
            ))
            .map(loc => (
              <button
                key={loc.id}
                className="context-map-travel-btn"
                onClick={() => onStartTravel(loc.id)}
              >
                {loc.name}
                <span className="context-map-travel-days">
                  {campaign.routes.find(
                    r => (r.fromId === currentLocationId && r.toId === loc.id) ||
                         (r.toId === currentLocationId && r.fromId === loc.id)
                  )?.travelDays ?? '?'}d
                </span>
              </button>
            ))
          }
        </div>
      )}
    </div>
  )
}
