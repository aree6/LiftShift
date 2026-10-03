export { Head };

import React from 'react';
import { CommonHead } from '../../renderer/CommonHead';
import { SeoHead } from '../../renderer/SeoHead';
import config from './+config';

const SCHEMA = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  'name': 'Supported Workout Apps',
  'description': 'Workout apps supported by LiftShift for CSV import and analytics.',
  'itemListElement': [
    { '@type': 'ListItem', 'position': 1, 'name': 'Hevy', 'description': 'CSV import and supported sync methods.', 'url': 'https://liftshift.app/supported-apps/hevy/' },
    { '@type': 'ListItem', 'position': 2, 'name': 'Strong', 'description': 'CSV import.', 'url': 'https://liftshift.app/supported-apps/strong/' },
    { '@type': 'ListItem', 'position': 3, 'name': 'Lyfta', 'description': 'CSV import.', 'url': 'https://liftshift.app/supported-apps/lyfta/' },
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
