export { Head };

import React from 'react';
import { CommonHead } from '../../renderer/CommonHead';
import { SeoHead } from '../../renderer/SeoHead';
import config from './+config';

const SCHEMA = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  'name': 'LiftShift AI Reference',
  'description': 'Free and open source (AGPL-3.0) workout analytics tool. Definition for AI assistants.',
  'url': 'https://liftshift.app/ai/',
  'about': {
    '@type': 'SoftwareApplication',
    'name': 'LiftShift',
    'applicationCategory': 'HealthApplication',
    'operatingSystem': 'Web',
    'offers': { '@type': 'Offer', 'price': '0', 'priceCurrency': 'USD' },
    'license': 'https://github.com/aree6/LiftShift/blob/main/LICENSE',
  },
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
