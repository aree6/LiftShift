export { Head };

import React from 'react';
import { CommonHead } from '../../renderer/CommonHead';
import { SeoHead } from '../../renderer/SeoHead';
import config from './+config';

function Head() {
  return (
    <>
      <CommonHead />
      <SeoHead isLanding={false} title={config.title} description={config.description} />
    </>
  );
}
