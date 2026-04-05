import type { Campaign } from '../types/campaign'

export const sampleCampaign: Campaign = {
  id: 'arturia-campaign',
  name: 'Shores of Arturia',
  worldMapImage: '/world-map.png',
  locations: [
    {
      id: 'loc-aurelia',
      name: 'Aurelia',
      type: 'town',
      pinX: 32,
      pinY: 55,
      discovered: true,
    },
    {
      id: 'loc-sunken-maw',
      name: 'The Sunken Maw',
      type: 'dungeon',
      pinX: 38,
      pinY: 62,
      dungeonId: 'lizard-cave',
      discovered: true,
    },
    {
      id: 'loc-oakvale',
      name: 'Oakvale',
      type: 'town',
      pinX: 52,
      pinY: 48,
      discovered: false,
    },
    {
      id: 'loc-wraithwood',
      name: 'The Wraithwood',
      type: 'wilderness',
      pinX: 45,
      pinY: 40,
      discovered: false,
    },
    {
      id: 'loc-stormwatch',
      name: 'Stormwatch Tower',
      type: 'landmark',
      pinX: 60,
      pinY: 35,
      discovered: false,
    },
  ],
  routes: [
    {
      fromId: 'loc-aurelia',
      toId: 'loc-sunken-maw',
      travelDays: 1,
      events: [
        {
          id: 'evt-coastal-path',
          name: 'Coastal Ambush',
          description: 'Bandits lurk along the cliffside path, drawn by tales of treasure from the caves.',
          type: 'combat',
        },
      ],
    },
    {
      fromId: 'loc-aurelia',
      toId: 'loc-wraithwood',
      travelDays: 2,
      events: [
        {
          id: 'evt-merchant',
          name: 'Traveling Merchant',
          description: 'A halfling merchant with a cart full of oddities offers to trade.',
          type: 'social',
        },
      ],
    },
    {
      fromId: 'loc-wraithwood',
      toId: 'loc-oakvale',
      travelDays: 1,
    },
    {
      fromId: 'loc-oakvale',
      toId: 'loc-stormwatch',
      travelDays: 3,
      events: [
        {
          id: 'evt-storm',
          name: 'Mountain Storm',
          description: 'A violent storm rolls in over the peaks, forcing the party to seek shelter.',
          type: 'environmental',
        },
      ],
    },
  ],
}
