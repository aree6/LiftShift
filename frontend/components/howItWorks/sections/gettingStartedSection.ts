import type { HowItWorksSection } from '../utils/howItWorksTypes';

export const GETTING_STARTED_SECTION: HowItWorksSection = {
  id: 'getting-started',
  title: 'Getting started',
  nodes: [
    {
      type: 'p',
      text:
        'LiftShift turns your workout log into answers about your training: which muscles are growing, what\'s stuck, what\'s improving, and what to do next. Connect Hevy, Strong, Lyfta, Motra, or a generic CSV in seconds. No account needed. Everything runs in your browser.',
    },
    {
      type: 'ul',
      items: [
        'Import from Hevy (login), Hevy Pro (API key), Lyfta (API key), Strong (CSV), Motra (Excel), or a generic CSV from any other app.',
        'Choose your body map gender and weight unit (kg / lbs) so charts and muscle visuals match you.',
        'Explore your dashboard: weekly volume, personal records, exercise progress, muscle heatmaps, activity calendar, the Training Manifest card, and set-by-set feedback.',
      ],
    },
    {
      type: 'callout',
      tone: 'note',
      title: 'No account, no upload',
      text:
        'All analytics run locally in your browser. When you use login or API-key syncing, LiftShift uses your credentials only to retrieve workout data. Analysis is still done on your device.',
    },
  ],
  cta: {
    text: 'Connect your app and get started in 60 seconds:',
    links: [
      { label: 'Hevy', hrefPath: '/?platform=hevy' },
      { label: 'Strong', hrefPath: '/?platform=strong' },
      { label: 'Lyfta', hrefPath: '/?platform=lyfta' },
      { label: 'Motra', hrefPath: '/?platform=motra' },
      { label: 'Upload CSV', hrefPath: '/?platform=other' },
    ],
  },
};
