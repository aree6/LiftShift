export { Head };

import React from 'react';
import { CommonHead } from '../../renderer/CommonHead';
import { SeoHead } from '../../renderer/SeoHead';
import config from './+config';

const SCHEMA = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'Article',
  'headline': 'Hevy vs Lyfta vs Strong: Full 2026 Comparison + Free LiftShift Analytics',
  'description': 'Honest comparison of Hevy, Lyfta, and Strong: features, pricing, API access, real user reviews, and complaints. Plus how LiftShift adds muscle heatmaps, plateau detection, PR tracking, set-by-set feedback, and AI export that all three workout loggers lack.',
  'author': { '@type': 'Organization', 'name': 'LiftShift', 'url': 'https://liftshift.app/' },
  'publisher': { '@type': 'Organization', 'name': 'LiftShift', 'url': 'https://liftshift.app/' },
  'url': 'https://liftshift.app/hevy-vs-lyfta/',
  'mainEntityOfPage': 'https://liftshift.app/hevy-vs-lyfta/',
});

function Head() {
  return (
    <>
      <CommonHead />
      <SeoHead canonicalPath="/hevy-vs-lyfta/" isLanding={false} title={config.title} description={config.description} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: SCHEMA }} />
    </>
  );
}
