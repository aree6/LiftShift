export type FlexCardId =
  | 'receipt'
  | 'summary'
  | 'volume'
  | 'year-heatmap'
  | 'muscle-focus'
  | 'best-month'
  | 'top-exercises'
  | 'prs'
  | 'streak';

export const FLEX_CARDS: { id: FlexCardId; label: string }[] = [
  { id: 'receipt', label: 'Receipt' },
  { id: 'volume', label: 'Volume Comparison' },
  { id: 'best-month', label: 'Best Month' },
  { id: 'summary', label: 'Summary' },
  { id: 'year-heatmap', label: 'Year Heatmap' },
  { id: 'muscle-focus', label: 'Muscle Focus' },
  { id: 'top-exercises', label: 'Top Exercises' },
  { id: 'prs', label: 'Personal Records' },
  { id: 'streak', label: 'Streak' },
];
