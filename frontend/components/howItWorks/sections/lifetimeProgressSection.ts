import type { HowItWorksSection } from '../utils/howItWorksTypes';

export const LIFETIME_PROGRESS_SECTION: HowItWorksSection = {
  id: 'lifetime-progress',
  title: 'Lifetime Progress',
  sidebarTitle: 'Lifetime Progress',
  nodes: [
    {
      type: 'p',
      text:
        'Every muscle in your body has a training journey. Lifetime Progress tracks that journey across 9 tiers, from Seedling to Legend, showing how deep your training history goes for each muscle group.',
    },
  ],
  children: [
    {
      id: 'lifetime-tiers',
      title: 'The 9 tiers',
      sidebarTitle: 'The 9 tiers',
      nodes: [
        {
          type: 'p',
          text:
            'The journey from Seedling to Legend uses diminishing returns so early milestones feel achievable and late tiers require real dedication:',
        },
        {
          type: 'ul',
          items: [
            'Seedling (0%): Just getting started. Focus on learning movements and building the habit.',
            'Sprout (2%): You have a workout routine. Keep showing up consistently.',
            'Sapling (4%): You train regularly. Now focus on progressive overload.',
            'Foundation (7%): Solid fundamentals. Time to build muscle mass.',
            'Builder (14%): Noticeable muscle growth. Push for progressive overload.',
            'Sculptor (25%): Significant muscle development. Refine your physique.',
            'Elite (35%): Impressive dedication. Fine-tune your training and nutrition.',
            'Master (55%): Elite-level dedication. Maintain and refine your masterpiece.',
            'Legend (100%): The pinnacle of fitness dedication. You have earned your legacy.',
          ],
        },
      ],
    },
    {
      id: 'lifetime-formula',
      title: 'How achievement is calculated',
      sidebarTitle: 'Achievement formula',
      nodes: [
        {
          type: 'p',
          text:
            'Achievement percentage uses a diminishing returns formula: (lifetime sets) / (lifetime sets + 3,500) x 100.',
        },
        {
          type: 'ul',
          items: [
            'At 250 lifetime sets: ~7% (Seedling → Sprout range).',
            'At 1,000 sets: ~22% (Sprout → Builder range).',
            'At 3,500 sets: 50% (halfway to Legend).',
            'At 7,500 sets: ~68% (Master tier).',
            'At 25,000 sets: ~88% (deep into the Legend tier).',
          ],
        },
        {
          type: 'p',
          text:
            'For each muscle, LiftShift also estimates weeks to your next tier based on your current weekly set rate. If you\'re not currently training a muscle, the estimate shows "∞ years", a nudge to add it back to your routine.',
        },
      ],
    },
    {
      id: 'lifetime-how-to-use',
      title: 'How to use it',
      sidebarTitle: 'How to use it',
      nodes: [
        {
          type: 'p',
          text:
            'Use Lifetime Progress as a consistency motivator. The per-muscle breakdown highlights imbalances in your training history. Maybe your chest has 10x the sets of your back. The time-to-next-tier estimate gives you a tangible goal for muscles you\'ve been neglecting.',
        },
        {
          type: 'callout',
          tone: 'note',
          title: 'Not genetic potential',
          text:
            'Lifetime Progress measures cumulative work, not your genetic ceiling. A higher tier means more total volume invested in that muscle. It doesn\'t predict your maximum possible development.',
        },
      ],
    },
  ],
};
