export { Head };

import React from 'react';
import { CommonHead } from '../../renderer/CommonHead';
import { SeoHead } from '../../renderer/SeoHead';
import config from './+config';

const SCHEMA = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  'name': 'LiftShift Training Metrics Glossary',
  'description': 'Definitions for LiftShift metrics like training volume, PRs, 1RM, and muscle heatmaps.',
  'itemListElement': [
    { '@type': 'ListItem', 'position': 1, 'name': 'Training Volume', 'description': 'What volume means and how it is aggregated.', 'url': 'https://liftshift.app/metrics/training-volume/' },
    { '@type': 'ListItem', 'position': 2, 'name': 'Personal Records (PRs)', 'description': 'What LiftShift considers a PR.', 'url': 'https://liftshift.app/metrics/personal-records/' },
    { '@type': 'ListItem', 'position': 3, 'name': '1RM / One-Rep Max', 'description': 'What an estimate is and how to interpret it.', 'url': 'https://liftshift.app/metrics/one-rep-max/' },
    { '@type': 'ListItem', 'position': 4, 'name': 'Muscle Heatmaps', 'description': 'What a muscle emphasis estimate means.', 'url': 'https://liftshift.app/metrics/muscle-heatmap/' },
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
