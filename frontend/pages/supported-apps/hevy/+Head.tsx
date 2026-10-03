export { Head };

import React from 'react';
import { SeoHead } from '../../../renderer/SeoHead';
import config from './+config';

const SCHEMA = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  'name': 'Import Hevy Workout Data into LiftShift',
  'description': 'Step-by-step guide to exporting Hevy workout data and importing it into LiftShift for analytics.',
});

function Head() {
  return (
    <>
      <SeoHead isLanding={false} title={config.title} description={config.description} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: SCHEMA }} />
    </>
  );
}
