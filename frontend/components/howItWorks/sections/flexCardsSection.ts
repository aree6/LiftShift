import type { HowItWorksSection } from '../utils/howItWorksTypes';

export const FLEX_CARDS_SECTION: HowItWorksSection = {
  id: 'flex-cards',
  title: 'Flex cards & year-in-review',
  sidebarTitle: 'Flex cards',
  nodes: [
    {
      type: 'p',
      text:
        'The Flex View is a carousel of 9 cards showing your training highlights. They\'re designed to be shareable, each card a self-contained summary with the LiftShift watermark.',
    },
    {
      type: 'p',
      text:
        'The dashboard has a separate Training Manifest card built on the same receipt engine. It has a 7-day / 30-day toggle, a volume voyage chart with first, peak, and last training-day stops, a body panel showing which muscles you trained in that window, and your top 3 lifts ranked by volume.',
    },
  ],
  children: [
    {
      id: 'flex-receipt',
      title: 'Receipt card',
      sidebarTitle: 'Receipt',
      nodes: [
        { type: 'p', text: 'An all-time training receipt styled like a shop receipt. Top exercises by volume, session / set / rep / time totals, a deterministic receipt number, a VERIFIED stamp, and a QR tip jar. This card always covers your full history, no matter what date filter is active.' },
      ],
    },
    {
      id: 'flex-summary',
      title: 'Summary card',
      sidebarTitle: 'Summary',
      nodes: [
        { type: 'p', text: 'Total workouts, training hours, total volume lifted, sets, and reps, all shown as large count-up numbers.' },
      ],
    },
    {
      id: 'flex-volume',
      title: 'Volume comparison card',
      sidebarTitle: 'Volume comparison',
      nodes: [
        { type: 'p', text: 'Your total volume compared to real-world objects. For example: "That\'s like lifting 3.5 gorillas." Uses a database of 33 comparison items from a dozen eggs (0.08 kg) to an oil tanker (200 million kg). The algorithm picks the comparison that divides most cleanly into your total.' },
      ],
    },
    {
      id: 'flex-best-month',
      title: 'Best month card',
      sidebarTitle: 'Best month',
      nodes: [
        { type: 'p', text: 'Which month had the most workouts, with a 12-bar chart showing monthly distribution and average workouts per active month.' },
      ],
    },
    {
      id: 'flex-streak',
      title: 'Streak card',
      sidebarTitle: 'Streak',
      nodes: [
        { type: 'p', text: 'Your longest training streak in weeks. If currently on a streak, a fire badge shows "Currently on a {n} week streak!"' },
      ],
    },
    {
      id: 'flex-prs',
      title: 'PRs card',
      sidebarTitle: 'PRs',
      nodes: [
        { type: 'p', text: 'Total PR count inside a laurel wreath icon. Your top 2 PR exercises shown as progress bars with weight displays and exercise thumbnails.' },
      ],
    },
    {
      id: 'flex-top-exercises',
      title: 'Top exercises card',
      sidebarTitle: 'Top exercises',
      nodes: [
        { type: 'p', text: 'Top 3 most-performed exercises with gold/silver/bronze medals. Exercise thumbnails in circular containers.' },
      ],
    },
    {
      id: 'flex-year-heatmap',
      title: 'Yearly heatmap card',
      sidebarTitle: 'Yearly heatmap',
      nodes: [
        { type: 'p', text: 'GitHub-style heatmap for the full year. 12 mini monthly grids of colored cells. Green intensity scale: 0 sets (gray), 1-15 (light green), 46+ (deep emerald). Shows total workouts this year as a count-up number.' },
      ],
    },
    {
      id: 'flex-muscle-focus',
      title: 'Muscle focus card',
      sidebarTitle: 'Muscle focus',
      nodes: [
        { type: 'p', text: 'Toggle between a compact body map heatmap and a radar chart of muscle group distribution. Lists your top 3 most-trained muscles. Year label in the header.' },
      ],
    },
  ],
};
