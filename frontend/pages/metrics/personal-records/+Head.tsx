export { Head };

import React from 'react';
import { SeoHead } from '../../../renderer/SeoHead';
import config from './+config';

const SCHEMA = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'DefinedTerm',
  'name': 'Personal Records (PRs)',
  'description': 'In LiftShift, a PR is your best-ever performance for an exercise derived from logged sets, tracked across seven PR types in two tiers: Gold (all-time), Silver (1-month), and Premature (unsustainable spikes).',
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
