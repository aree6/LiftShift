import type { Config } from 'vike/types';
import vikeReact from 'vike-react/config';

export default {
  extends: [vikeReact],
  // Pre-render only opted-in pages.
  prerender: { partial: true },
  // Default head tags (can be overridden per route group or page).
  title: 'LiftShift - Free Workout Analytics Dashboard',
  description:
    'LiftShift transforms workout logs into beautiful analytics dashboards. Privacy-first, runs locally in your browser.',
} satisfies Config;
