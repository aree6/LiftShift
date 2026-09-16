import type { HowItWorksSection } from '../utils/howItWorksTypes';

export const IMPORT_SYNC_SECTION: HowItWorksSection = {
  id: 'import-and-sync',
  title: 'Import & sync options',
  sidebarTitle: 'Import & sync',
  nodes: [
    {
      type: 'p',
      text:
        'You can bring data into LiftShift a few different ways. Pick the method that matches your app and comfort level.',
    },
  ],
  cta: {
    text: 'Ready to import? Pick your platform:',
    links: [
      { label: 'Hevy (Login or API key)', hrefPath: '/?platform=hevy' },
      { label: 'Lyfta (API key)', hrefPath: '/?platform=lyfta' },
      { label: 'Strong (CSV upload)', hrefPath: '/?platform=strong' },
      { label: 'Motra (Excel upload)', hrefPath: '/?platform=motra' },
      { label: 'Other CSV', hrefPath: '/?platform=other' },
    ],
  },
  children: [
    {
      id: 'import-hevy-login',
      title: 'Hevy: login sync',
      sidebarTitle: 'Hevy login',
      nodes: [
        {
          type: 'p',
          text:
            'Log in with your Hevy credentials. LiftShift uses your own backend to retrieve a short-lived auth token, pulls your workout history newest-first, and converts every session into a standard set format used across the app. Very long histories can be capped by the source API. When that happens the app shows a "Showing newest history only" banner, and lifetime totals, PRs, and streaks reflect the partial history.',
        },
        {
          type: 'callout',
          tone: 'warning',
          title: 'Language & date formats',
          text:
            'If the source app uses a non-English locale, date parsing can break. If LiftShift says it "couldn\'t parse workout dates", switch the exporting app to English and try again.',
        },
      ],
    },
    {
      id: 'import-hevy-api-key',
      title: 'Hevy Pro: API key sync',
      sidebarTitle: 'Hevy API key',
      nodes: [
        {
          type: 'p',
          text:
            'If you have Hevy Pro, use your API key. LiftShift validates the key and fetches workouts through the official API endpoint, then maps them into the same internal format.',
        },
      ],
    },
    {
      id: 'import-lyfta-api-key',
      title: 'Lyfta: API key sync',
      sidebarTitle: 'Lyfta API key',
      nodes: [
        {
          type: 'p',
          text:
            'Lyfta sync uses your API key to fetch workouts and workout summaries, then normalizes them to LiftShift\'s set format. Very long histories can be capped by the source API. When that happens the app shows a "Showing newest history only" banner, and lifetime totals, PRs, and streaks reflect the partial history.',
        },
      ],
    },
    {
      id: 'import-csv',
      title: 'CSV and Excel import (Strong / Motra / Lyfta / other apps)',
      sidebarTitle: 'CSV import',
      nodes: [
        {
          type: 'p',
          text:
            'File import is the most universal option. LiftShift detects column meanings (exercise name, weight, reps, date, set type), supports ISO 8601, US, and European date formats, and converts units when needed. Motra uploads take an Excel (.xlsx) export. Generic CSVs from any other app work too, columns are auto-detected. File imports are never capped, so a CSV gives you the complete history.',
        },
        {
          type: 'callout',
          tone: 'note',
          title: 'Best-effort field matching',
          text:
            'Different apps export slightly different columns. LiftShift uses "best effort" matching so you can upload most CSV formats without manual mapping.',
        },
      ],
    },
    {
      id: 'import-combine',
      title: 'Combining data from multiple apps',
      sidebarTitle: 'Multi-app merge',
      nodes: [
        {
          type: 'p',
          text:
            'Switched from Strong to Hevy? Use both? LiftShift can merge data from multiple sources into one unified dashboard. Add a second source anytime via "Import" → "Add data source".',
        },
        {
          type: 'ul',
          items: [
            'Exercise names are normalized across sources (so "Barbell Bench Press" from Hevy and "Bench Press (Barbell)" from Strong map to the same canonical exercise).',
            'Sources are labeled so you know where each set came from.',
            'Duplicate sets (same exercise, same start time, same weight/reps) are detected and skipped.',
          ],
        },
      ],
    },
  ],
};
