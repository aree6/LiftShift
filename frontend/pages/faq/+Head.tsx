export { Head };

import React from 'react';
import { CommonHead } from '../../renderer/CommonHead';
import { SeoHead } from '../../renderer/SeoHead';
import config from './+config';

const SCHEMA = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  'mainEntity': [
    { '@type': 'Question', 'name': 'What is LiftShift?', 'acceptedAnswer': { '@type': 'Answer', 'text': 'A free, privacy-focused workout analytics tool. Connect Hevy, Strong, or Lyfta to get muscle heatmaps, plateau detection, set-by-set feedback, and AI-ready exports. Everything runs in your browser.' } },
    { '@type': 'Question', 'name': 'Does LiftShift store my workout data?', 'acceptedAnswer': { '@type': 'Answer', 'text': 'No. All analytics run locally in your browser. Data is cached in browser storage for faster reloads. Nothing is uploaded to LiftShift servers.' } },
    { '@type': 'Question', 'name': 'Which apps are supported?', 'acceptedAnswer': { '@type': 'Answer', 'text': 'Hevy (API sync or CSV), Strong (CSV), and Lyfta (CSV). You can also combine data from multiple apps into one dashboard.' } },
    { '@type': 'Question', 'name': 'How does plateau detection work?', 'acceptedAnswer': { '@type': 'Answer', 'text': 'LiftShift compares your recent sessions to previous ones. If your strength is roughly flat, you get a plateauing label with a concrete suggestion.' } },
    { '@type': 'Question', 'name': 'Can I export data for AI analysis?', 'acceptedAnswer': { '@type': 'Answer', 'text': 'Yes. Pick a timeframe, optionally select analysis modules, and LiftShift generates a structured prompt + data. Paste into any AI tool.' } },
    { '@type': 'Question', 'name': 'What PRs does LiftShift track?', 'acceptedAnswer': { '@type': 'Answer', 'text': 'All-time bests (Gold), 1-month bests (Silver), premature PRs (unsustainable jumps), and PR droughts.' } },
    { '@type': 'Question', 'name': 'Is LiftShift a coaching app?', 'acceptedAnswer': { '@type': 'Answer', 'text': 'No. It is analytics for your training logs. It gives feedback based on your data but does not generate training programs or provide medical advice.' } },
  ],
});

function Head() {
  return (
    <>
      <CommonHead />
      <SeoHead isLanding={false} title={config.title} description={config.description} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: SCHEMA }} />
    </>
  );
}
