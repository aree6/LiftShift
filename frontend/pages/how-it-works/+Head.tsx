export { Head };

import React from 'react';
import { CommonHead } from '../../renderer/CommonHead';
import { SeoHead } from '../../renderer/SeoHead';
import config from './+config';

const HOW_IT_WORKS_SCHEMA = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  headline: 'How LiftShift Works: Import, Analyze, Improve Your Training',
  description:
    'Import workout logs from Hevy, Strong, Lyfta, or CSV. LiftShift computes training volume, PRs, muscle balance, and exercise trends locally in your browser.',
  proficiencyLevel: 'Beginner',
  author: { '@type': 'Organization', name: 'LiftShift', url: 'https://liftshift.app/' },
  publisher: { '@type': 'Organization', name: 'LiftShift', url: 'https://liftshift.app/' },
  url: 'https://liftshift.app/how-it-works/',
  mainEntityOfPage: 'https://liftshift.app/how-it-works/',
});

function Head() {
  return (
    <>
      <CommonHead />
      <SeoHead canonicalPath="/how-it-works/" isLanding={false} title={config.title} description={config.description} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: HOW_IT_WORKS_SCHEMA }}
      />
    </>
  );
}
