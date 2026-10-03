export { Head };

import React from 'react';
import { CommonHead } from '../../renderer/CommonHead';
import { SeoHead } from '../../renderer/SeoHead';
import config from './+config';

const SCHEMA = JSON.stringify({
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Organization', 'name': 'LiftShift', 'url': 'https://liftshift.app/', 'sameAs': ['https://github.com/aree6/LiftShift'] },
    { '@type': 'WebApplication', 'name': 'LiftShift', 'url': 'https://liftshift.app/', 'applicationCategory': 'HealthApplication', 'operatingSystem': 'Web', 'isAccessibleForFree': true, 'license': 'https://github.com/aree6/LiftShift/blob/main/LICENSE' },
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
