import type { HowItWorksSection } from '../utils/howItWorksTypes';

export const STRENGTH_IMBALANCE_SECTION: HowItWorksSection = {
  id: 'strength-imbalance',
  title: 'Strength Imbalance',
  sidebarTitle: 'Strength Imbalance',
  nodes: [
    {
      type: 'p',
      text:
        'The Strength Imbalance card compares your estimated strength across 13 related exercise pairs (bench vs overhead press, rows vs bench, squat vs bench, deadlift vs bench, curls vs pushdowns, and more) against typical ratios from population statistics. When one side of a pair falls far outside its typical band, LiftShift flags it as an imbalance worth a look.',
    },
    {
      type: 'callout',
      tone: 'note',
      title: 'A hint, never a verdict',
      text:
        'A flagged ratio can mean a real imbalance, different training history, or simply a logging difference. The card says what most lifters sit at, lists possible causes, and links to the lagging exercise. It never claims your form is wrong.',
    },
  ],
  children: [
    {
      id: 'si-metric',
      title: 'How strength is measured',
      sidebarTitle: 'The metric',
      nodes: [
        {
          type: 'p',
          text:
            'For each movement, LiftShift looks at the last 90 days, takes the best estimated 1-rep max per session (Epley formula: weight x (1 + reps / 30), reps 5-15, warmups excluded), keeps the 5 most recent sessions, and reports the 75th percentile of those. Per-arm exercises (lateral raises, dumbbell presses) are doubled so they compare fairly against bilateral lifts. Both sides of a pair need at least 2 sessions before anything is reported.',
        },
      ],
    },
    {
      id: 'si-bands',
      title: 'Expected and hard bands',
      sidebarTitle: 'Bands & severity',
      nodes: [
        {
          type: 'p',
          text:
            'Each pair has an expected band (where typical lifters sit) and a wider hard band (clear outliers). Inside the expected band is fine. Between the bands is a "watch" (medium confidence). Outside the hard band is a "flag" (high confidence). The bands come from population statistics, roughly 28 million logged lifts for the highest-confidence pairs.',
        },
        {
          type: 'p',
          text:
            'Up to 3 findings are surfaced, deduplicated by the lagging movement, with a segment control to switch between them. The overview card on the dashboard shows a one-line alert when anything is detected.',
        },
      ],
    },
    {
      id: 'si-trend',
      title: 'The trend chart',
      sidebarTitle: 'Trend chart',
      nodes: [
        {
          type: 'p',
          text:
            'Each finding has a chart of your weekly laggard percentage (the weaker lift as a % of the stronger one) over the last 3 months, with the typical band shaded in green. The line is smoothed with a 3-week average so heavy and light weeks don\'t zigzag it. A dot marks your current level.',
        },
        {
          type: 'p',
          text:
            'Above the chart, a chip says whether the gap is closing or widening based on the last ~5 weeks only, so a recent slide isn\'t masked by months of earlier progress. It reports the fitted start and end values, e.g. "Gap closing · 50% → 60% over 2 months".',
        },
      ],
    },
  ],
};
