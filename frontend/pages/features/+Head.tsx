export { Head };

import React from 'react';
import { CommonHead } from '../../renderer/CommonHead';
import { SeoHead } from '../../renderer/SeoHead';
import config from './+config';

const FEATURES_SCHEMA = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'LiftShift Features',
  description: 'Everything LiftShift can do with your workout data.',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Muscle Heatmaps',
      description: 'Interactive body maps with rolling 7-day windows and per-exercise drill-down.',
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Plateau Detection',
      description: 'Detects stalled progress with specific, actionable next-session suggestions.',
    },
    {
      '@type': 'ListItem',
      position: 3,
      name: 'Set-by-Set Feedback',
      description: 'Analyses every set in a workout across 19 scenarios with coaching badges.',
    },
    {
      '@type': 'ListItem',
      position: 4,
      name: 'Smart PR Tracking',
      description: 'All-time bests, 1-month bests, premature PR detection, and drought alerts.',
    },
    {
      '@type': 'ListItem',
      position: 5,
      name: 'AI-Ready Export',
      description: 'Structured training data export with built-in analysis modules.',
    },
    {
      '@type': 'ListItem',
      position: 6,
      name: 'Calendar Filtering',
      description: 'Pick any date range and all metrics recalculate for that window.',
    },
    {
      '@type': 'ListItem',
      position: 7,
      name: 'Multi-App Merge',
      description: 'Combine data from Hevy, Strong, and Lyfta into one unified dashboard.',
    },
  ],
});

function Head() {
  return (
    <>
      <CommonHead />
      <SeoHead isLanding={false} title={config.title} description={config.description} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: FEATURES_SCHEMA }}
      />
    </>
  );
}
