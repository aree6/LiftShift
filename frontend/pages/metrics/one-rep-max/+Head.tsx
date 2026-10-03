export { Head };

import React from 'react';
import { SeoHead } from '../../../renderer/SeoHead';
import config from './+config';

const SCHEMA = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'DefinedTerm',
  'name': '1RM (One-Rep Max)',
  'description': 'A 1RM estimate is a calculated approximation of the maximum weight you could lift for a single repetition, based on a submaximal set in LiftShift.',
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
