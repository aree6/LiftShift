import React from 'react';
import { Reveal } from '../../ui/Reveal';
import { useTheme } from '../../theme/ThemeProvider';
import { Info } from 'lucide-react';
import { assetPath } from '../../../constants';

const featureGroups = [
  {
    group: 'Training insights',
    image: '/images/misc/weeklyset.avif',
    alt: 'LiftShift interactive muscle heatmap with exercise drill-down and volume zone scoring',
    items: [
      'Interactive muscle heatmaps, click any muscle to see contributing exercises, with rolling 7-day windows and volume zone scoring.',
      'Training Manifest dashboard card: 7-day / 30-day toggle, volume voyage chart with first, peak, and last stops, body panel for the window, and top lifts by volume.',
      'GitHub-style yearly consistency heatmap with streaks, consistency scores, and workout day highlights.',
      'Rolling window comparisons: last week vs. previous week, last month vs. previous month, on every metric.',
      'Training focus breakdown by rep ranges (strength / hypertrophy / endurance).',
      'Per-joint Injury Risk scoring: workload, recovery, and antagonist balance combine into a 0-100 risk score per joint.',
    ],
  },
  {
    group: 'Progress tracking',
    image: '/images/misc/plateau.avif',
    alt: 'LiftShift exercise status labels: Getting stronger, Plateauing, or Taking a dip',
    items: [
      'Smart PR tracking, all-time bests, 1-month bests, premature PR detection, and PR drought alerts.',
      'Exercise status labels, Getting stronger, Plateauing, or Taking a dip, with confidence levels.',
      'Plateau detection with specific, actionable suggestions for what to change next session.',
    ],
  },
  {
    group: 'Coaching feedback',
    image: '/images/misc/setbyset.avif',
    alt: 'LiftShift set-by-set coaching feedback on every set in a workout',
    items: [
      'Set-by-set analysis, 19 scenarios with badges, tooltips, and improvement suggestions.',
      'Strength imbalance detection: 13 push/pull and leg/back ratios against population statistics, with a monthly trend so you can watch a gap close.',
      'AI-ready export, one-click structured data export with built-in analysis modules (junk volume audit, structural balance, joint health, and more).',
      'Weight-up / weight-down suggestions based on your actual performance quality.',
    ],
  },
  {
    group: 'Data tools',
    image: '/images/misc/calender.avif',
    alt: 'LiftShift calendar filtering with date range selection',
    items: [
      'Calendar filtering, pick any date range and all metrics recalculate for just that window.',
      'Combine data from Hevy, Strong, Lyfta, Motra, and generic CSVs into one unified dashboard.',
      'Lifetime Progress, 9-tier per-muscle journey from Seedling to Legend.',
      'Flex cards, 9 shareable year-in-review summaries including an all-time training receipt.',
    ],
  },
];

type Props = {
  className?: string;
  showTitle?: boolean;
};

export const FeaturesDoc: React.FC<Props> = ({ className = '', showTitle = true }) => {
  const { mode } = useTheme();
  const isLight = mode === 'light';
  return (
    <div className={`space-y-12 ${className}`}>
      {showTitle ? (
        <div>
          <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>Features</h1>
          <p className={`mt-2 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
            Everything LiftShift can do with your workout data. Connect Hevy, Strong, Lyfta, Motra, or a generic CSV in seconds.
          </p>
        </div>
      ) : null}

      {featureGroups.map((g, idx) => (
        <section key={g.group}>
          <Reveal className={`grid grid-cols-1 lg:grid-cols-2 gap-6 items-start ${idx % 2 === 1 ? 'lg:[direction:rtl]' : ''}`}>
            <div className={idx % 2 === 1 ? 'lg:[direction:ltr]' : ''}>
              <h2 className={`text-lg font-semibold mb-3 ${isLight ? 'text-slate-900' : 'text-white'}`}>{g.group}</h2>
              <ul className={`list-disc list-inside space-y-2 leading-relaxed ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                {g.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
            <div className={`rounded-xl border overflow-hidden max-w-lg mx-auto ${isLight ? 'border-black/10' : 'border-white/10'}`}>
              <img
                src={assetPath(g.image)}
                alt={g.alt}
                loading="lazy"
                className="w-full"
              />
            </div>
          </Reveal>
        </section>
      ))}

      <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 mt-6">
        <div className={`flex items-center gap-2 text-sm font-semibold mb-2 ${isLight ? 'text-emerald-700' : 'text-emerald-200'}`}>
          <Info className="w-4 h-4" />
          Full documentation
        </div>
        <p className={`text-sm ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
          See <a href={assetPath('how-it-works/')} className={`${isLight ? 'text-slate-600 hover:text-emerald-600' : 'text-slate-400 hover:text-emerald-400'} transition-colors duration-200`}>How it works</a> for detailed explanations of every feature, metric definition, and design choice.
        </p>
      </div>
    </div>
  );
};
