export interface Campaign {
  id: string
  name: string
  worldMapImage: string
  locations: CampaignLocation[]
  routes: CampaignRoute[]
}

export interface CampaignLocation {
  id: string
  name: string
  type: 'town' | 'dungeon' | 'wilderness' | 'landmark'
  pinX: number
  pinY: number
  dungeonId?: string
  discovered: boolean
}

export interface CampaignRoute {
  fromId: string
  toId: string
  travelDays: number
  events?: TravelEvent[]
}

export interface TravelEvent {
  id: string
  name: string
  description: string
  type: 'combat' | 'social' | 'environmental'
}
