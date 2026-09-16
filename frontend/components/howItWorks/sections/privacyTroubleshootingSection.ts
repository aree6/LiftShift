import type { HowItWorksSection } from '../utils/howItWorksTypes';

export const PRIVACY_STORAGE_SECTION: HowItWorksSection = {
  id: 'privacy-and-storage',
  title: 'Privacy & storage',
  sidebarTitle: 'Privacy & storage',
  nodes: [
    {
      type: 'p',
      text:
        'LiftShift is designed so you get analytics without giving up control of your data. The guiding principle: everything runs in your browser.',
    },
    {
      type: 'ul',
      items: [
        'Analytics are computed locally in your browser. This includes charts, summaries, trends, and per-exercise history.',
        'Workout data is cached in your browser\'s local storage (compressed with LZ-string) so the dashboard loads instantly on return visits.',
        'Preferences like weight units, body map gender, and theme are stored locally.',
        'You can clear your data at any time from the app preferences or by clearing your browser storage.',
        '"Update data" re-syncs your latest workouts without losing your analytics state.',
      ],
    },
    {
      type: 'callout',
      tone: 'warning',
      title: 'Third-party data sources',
      text:
        'If you use an API sync (Hevy, Lyfta), that third-party service has its own privacy and security model. LiftShift\'s privacy guarantee covers what LiftShift itself stores, which is nothing on any server.',
    },
  ],
};

export const TROUBLESHOOTING_SECTION: HowItWorksSection = {
  id: 'troubleshooting',
  title: 'Troubleshooting',
  sidebarTitle: 'Troubleshooting',
  nodes: [
    {
      type: 'p',
      text:
        'Common issues and how to fix them.',
    },
  ],
  children: [
    {
      id: 'trouble-truncated',
      title: 'Early workouts are missing after API sync',
      sidebarTitle: 'Truncated history',
      nodes: [
        {
          type: 'p',
          text:
            'API syncs pull your newest workouts first and the source API caps how far back one sync can go. When the cap hits, the app shows a "Showing newest history only" banner under the header. Lifetime totals, PRs, and streaks then reflect the partial history. If you want the complete log, import a CSV or Excel export instead, file imports are never capped.',
        },
      ],
    },
    {
      id: 'trouble-dates',
      title: 'Dates not parsing correctly',
      sidebarTitle: 'Date parsing',
      nodes: [
        {
          type: 'p',
          text:
            'If LiftShift says it "couldn\'t parse workout dates", your source app is likely using a non-English locale. Switch the exporting app to English, re-export, and import again.',
        },
      ],
    },
    {
      id: 'trouble-exercise-names',
      title: 'Exercise names vary across sessions',
      sidebarTitle: 'Exercise names',
      nodes: [
        {
          type: 'p',
          text:
            'If your charts look wrong, check for inconsistent exercise names: "Bench Press" vs "Barbell Bench" vs "Flat Bench" will be treated as different exercises. LiftShift uses fuzzy matching, but significant variations may not be normalized. Standardize your naming in your logging app.',
        },
      ],
    },
    {
      id: 'trouble-missing-muscles',
      title: 'Exercise doesn\'t appear on the heatmap',
      sidebarTitle: 'Missing muscles',
      nodes: [
        {
          type: 'p',
          text:
            'An exercise must match a known exercise in LiftShift\'s asset database to show muscle emphasis. If your exercise name doesn\'t match (e.g., a very custom or unusual name), it won\'t appear on the body map. The exercise will still show in all other charts and analytics.',
        },
      ],
    },
    {
      id: 'trouble-units',
      title: 'Weight units are wrong',
      sidebarTitle: 'Weight units',
      nodes: [
        {
          type: 'p',
          text:
            'If weights are showing incorrectly (e.g., 100 kg bench press when you lift 100 lbs), check your import preferences. CSV files sometimes embed units in headers like "Weight (kg)". LiftShift tries to detect this automatically. You can also manually select kg or lbs during import.',
        },
      ],
    },
    {
      id: 'trouble-warmups',
      title: 'Warm-ups showing in volume totals',
      sidebarTitle: 'Warm-up filtering',
      nodes: [
        {
          type: 'p',
          text:
            'LiftShift filters out sets marked as warm-up (type "w" or containing "warmup"). If warm-ups are still appearing, check that your logging app marks them correctly. If your app doesn\'t support warm-up labels, all sets will be treated as working sets.',
        },
      ],
    },
    {
      id: 'trouble-prs',
      title: 'PRs don\'t match your logging app',
      sidebarTitle: 'PR mismatches',
      nodes: [
        {
          type: 'p',
          text:
            'Different apps define PRs differently. LiftShift uses best logged weight per exercise from working sets. If your app counts warm-ups as PRs or uses a different formula, Pro results will differ.',
        },
      ],
    },
  ],
};
