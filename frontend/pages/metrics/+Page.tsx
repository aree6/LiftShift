export { Page };

import React from 'react';
import { InfoShell } from '../../components/info/InfoShell';
import { assetPath } from '../../constants';

function Page() {
  return (
    <InfoShell
      activeNav={null}
      title="Metrics glossary"
      subtitle="These pages define LiftShift\u2019s metrics in plain language so they can be cited accurately."
    >
      <div className="space-y-7">
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Metrics</h2>
          <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
            <li><a href={assetPath('metrics/training-volume/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">Training volume</a>: The total weight you move in a session, week, or muscle group. Defined as sets \u00d7 reps \u00d7 weight, with rolling window comparisons and zone scoring.</li>
            <li><a href={assetPath('metrics/personal-records/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">Personal records (PRs)</a>: Data-derived bests, not performance promises. Covers the two PR tiers (all-time and 1-month bests) plus premature PR detection, how PRs are calculated, and what they don\u2019t mean.</li>
            <li><a href={assetPath('metrics/one-rep-max/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">1RM (one-rep max)</a>: Estimated one-rep max values derived from your logged sets using standard formulas. Tracks strength trends without testing maxes.</li>
            <li><a href={assetPath('metrics/muscle-heatmap/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">Muscle heatmaps</a>: Visual estimates of which muscles your training emphasises, based on exercise-to-muscle mapping and volume allocation.</li>
            <li><a href={assetPath('metrics/injury-risk/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">Injury Risk</a>: A 0-100 per-joint stress estimate combining workload ratio, recovery, and antagonist balance. A load-management hint, not a diagnosis.</li>
            <li><a href={assetPath('metrics/strength-imbalance/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">Strength Imbalance</a>: Your strength ratios across 13 related exercise pairs compared against population statistics, with a monthly closing/widening trend.</li>
          </ul>
        </section>

        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 mt-6">
          <p className="text-slate-300 text-sm leading-relaxed">
            <strong className="text-white">Important:</strong> LiftShift\u2019s metrics are analytical tools, they describe what your data shows, not what you should do next. The analytics dashboard is not a coach. Use the numbers to inform your decisions, not to replace your judgment.
          </p>
        </div>
      </div>
    </InfoShell>
  );
}
