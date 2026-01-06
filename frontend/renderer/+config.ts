export { config as default };

import type { Config } from 'vike/types';
import vikeReact from 'vike-react/config';

const config = {
  extends: [vikeReact],
  clientRouting: true,
  hydrationCanBeAborted: true,
  meta: {
    title: {
      env: { server: true, client: true },
    },
    description: {
      env: { server: true },
    },
  },
} satisfies Config;
