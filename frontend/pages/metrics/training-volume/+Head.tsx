export { Head };

import React from 'react';
import { SeoHead } from '../../../renderer/SeoHead';
import config from './+config';

const SCHEMA = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'DefinedTerm',
  'name': 'Training Volume',
  'description': 'In LiftShift, volume refers to the amount of work performed, derived from logged sets as weight multiplied by reps.',
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
