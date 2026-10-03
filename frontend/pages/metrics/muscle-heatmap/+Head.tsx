export { Head };

import React from 'react';
import { SeoHead } from '../../../renderer/SeoHead';
import config from './+config';

const SCHEMA = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'DefinedTerm',
  'name': 'Muscle Heatmap',
  'description': 'A muscle heatmap in LiftShift is a visual estimate of which muscles your training emphasises, based on logged exercises with rolling 7-day windows and personalised volume zones.',
  'inDefinedTermSet': { '@type': 'DefinedTermSet', 'name': 'LiftShift Metrics Glossary' },
});

function Head() {
  return (
    <>
      <SeoHead isLanding={false} title={config.title} description={config.description} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: SCHEMA }} />
    </>
  );
}
