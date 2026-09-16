export { Page };

import React from 'react';
import { InfoShell } from '../../../components/info/InfoShell';
import { assetPath } from '../../../constants';

function Page() {
  return (
    <InfoShell
      activeNav={null}
      title="Strength Imbalance"
      subtitle="LiftShift compares your strength across related exercise pairs against typical population ratios and flags outliers."
    >
      <div className="space-y-7">
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">What the metric means</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            For related exercises (same joint, same action family), lifters reliably show predictable strength ratios. For example, an overhead press is typically 60&ndash;70% of a bench press, and a squat is typically 1.3&ndash;1.5&times; a bench press. LiftShift computes your ratio for 13 such pairs and compares it against population statistics (roughly 28 million logged lifts for the highest-confidence pairs).
          </p>
          <p className="text-slate-300 leading-relaxed mb-4">
            When your ratio falls outside the typical band, LiftShift surfaces it as a <strong className="text-white">watch</strong> (borderline) or <strong className="text-white">flag</strong> (far outside), with the lagging exercise linked for inspection. A flagged ratio is a hint. It can mean a real imbalance, different training history, or a logging difference, never a verdict on your form.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">How strength is measured</h2>
          <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
            <li><strong className="text-white">Window</strong>: the last 90 days of training.</li>
            <li><strong className="text-white">Per session</strong>: the best estimated 1RM of the session (Epley formula, weight &times; (1 + reps/30), working sets of 5&ndash;15 reps, warm-ups excluded).</li>
            <li><strong className="text-white">Strength level</strong>: the 75th percentile of your 5 most recent session bests, so one-off PRs or stale peaks don&rsquo;t dominate.</li>
            <li><strong className="text-white">Unilateral lifts</strong>: per-arm exercises (lateral raises, dumbbell presses) are doubled so they compare fairly against bilateral totals.</li>
            <li><strong className="text-white">Minimum data</strong>: both sides of a pair need at least 2 sessions in the window, and the data overall needs at least 3 sessions, before anything is reported.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Reading the trend chart</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            Each finding shows your weekly laggard percentage (the weaker lift as a % of the stronger one) over the last 3 months, with the typical band shaded green and a dot marking your current level. The line is smoothed with a 3-week average. A chip above the chart says whether the gap is <strong className="text-white">closing</strong> or <strong className="text-white">widening</strong>, based on the last ~5 weeks only (a recent slide isn&rsquo;t masked by earlier progress), with fitted start and end values, e.g. &ldquo;Gap closing &middot; 50% &rarr; 60% over 2 months&rdquo;.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Limitations</h2>
          <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
            <li>Ratio bands are population statistics. Individual body mechanics, leverages, and training history vary, so treat bands as references, not rules.</li>
            <li>Machine weights differ across brands, and technique conventions (range of motion, tempo) affect ratios.</li>
            <li>Low-experience lifters have compressed ratios; the minimum-session guards exist for this reason.</li>
            <li>The metric is a hint for your next sessions, not a diagnosis or injury claim.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Learn more</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            See the <a href={assetPath('how-it-works/') + '#strength-imbalance'} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">How it works</a> guide for the full methodology and the <a href={assetPath('faq/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">FAQ</a> for common questions.
          </p>
        </section>
      </div>
    </InfoShell>
  );
}
