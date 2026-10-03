export { Head };

import React from 'react';
import { SeoHead } from '../../../renderer/SeoHead';
import config from './+config';

const SCHEMA = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  'name': 'Import Lyfta Workout Data into LiftShift',
  'description': 'Step-by-step guide to importing Lyfta workout data into LiftShift for analytics via API key sync or CSV.',
});

function Head() {
  return (
    <>
      <SeoHead isLanding={false} title={config.title} description={config.description} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: SCHEMA }} />
    </>
  );
}
