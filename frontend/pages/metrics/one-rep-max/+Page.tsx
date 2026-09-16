export { Page };

import React from 'react';
import { InfoShell } from '../../../components/info/InfoShell';
import { assetPath } from '../../../constants';

function Page() {
  return (
    <InfoShell
      activeNav={null}
      title="1RM (one-rep max)"
      subtitle="LiftShift shows 1RM estimates derived from your logged sets so you can track strength trends without testing maxes."
    >
      <div className="space-y-7">
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">What a 1RM estimate means</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            Your one-rep max (1RM) is the heaviest weight you can lift for a single repetition with proper form. In practice, testing a true 1RM is fatiguing, risky without a spotter, and impractical to do regularly across multiple exercises.
          </p>
          <p className="text-slate-300 leading-relaxed mb-4">
            A 1RM estimate is a mathematically predicted value based on a submaximal set. For example, if you bench press 80 kg for 8 reps, LiftShift can estimate that your 1RM is around 99\u2013101 kg \u2014 without you ever needing to load that weight on the bar.
          </p>
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 mt-6">
            <p className="text-slate-300 text-sm leading-relaxed">
              <strong className="text-white">Example:</strong> You bench press 80 kg for 8 reps. Using the Epley formula, your estimated 1RM is 80 \u00d7 (1 + 8/30) = 80 \u00d7 1.267 = <strong className="text-white">101.3 kg</strong>.
            </p>
          </div>
          <p className="text-slate-300 leading-relaxed mb-4">
            LiftShift shows your highest 1RM estimate for each exercise, updated automatically after every workout. You can track how this estimate trends over time without ever testing a true max.
          </p>
        </section>

        <div className="rounded-xl border border-white/10 overflow-hidden max-w-lg mx-auto">
          <img src={assetPath('/images/misc/hypertrophy.avif')} alt="LiftShift strength tracking and 1RM estimation dashboard" loading="lazy" className="w-full" />
        </div>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">How LiftShift calculates 1RM</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            LiftShift uses the <strong className="text-white">Epley formula</strong>, one of the most widely validated 1RM estimation equations:
          </p>
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 mt-6">
            <p className="text-slate-300 text-sm leading-relaxed">
              <strong className="text-white">1RM = weight \u00d7 (1 + reps / 30)</strong>
              <br />
              where <em>weight</em> is the load lifted and <em>reps</em> is the number of repetitions performed.
            </p>
          </div>
          <p className="text-slate-300 leading-relaxed mb-4">
            The formula is applied to every working set you log. LiftShift then takes the highest estimate across all sets for each exercise as your current estimated 1RM. Warm-up sets are excluded from 1RM calculation.
          </p>
          <p className="text-slate-300 leading-relaxed mb-4">
            The Epley formula is most accurate for rep counts between 1 and 10. Estimates derived from sets with more than 10 reps tend to overestimate 1RM. LiftShift still calculates them but flags high-rep estimates with lower confidence.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Practical uses</h2>
          <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
            <li><strong className="text-white">Track strength trends</strong>: Watch how your estimated 1RM trends upward (or downward) over weeks and months without ever testing a true max.</li>
            <li><strong className="text-white">Program design</strong>: Use your estimated 1RM to set percentage-based training loads (e.g. 75% of 1RM for hypertrophy work).</li>
            <li><strong className="text-white">Compare across rep ranges</strong>: A set of 100 kg \u00d7 5 reps and a set of 85 kg \u00d7 10 reps might produce similar 1RM estimates, helping you compare performances at different rep ranges.</li>
            <li><strong className="text-white">Spot discrepancies</strong>: If your estimated 1RM jumps sharply from one workout to the next, it may indicate you pushed harder that session or that your previous estimates were sandbagged.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Limitations</h2>
          <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
            <li>The Epley formula assumes reps are performed to or near failure. If you leave several reps in reserve, the estimate will underestimate your true 1RM.</li>
            <li>Accuracy degrades above 10 reps. A 20-rep set will produce an unrealistically high estimate.</li>
            <li>Exercise-specific differences matter. The formula was validated on compound barbell lifts (squat, bench press, deadlift). Estimates for isolation exercises, machine movements, or bodyweight exercises are less reliable.</li>
            <li>An estimate is not a measurement. Your true 1RM on any given day depends on fatigue, nutrition, sleep, and mental readiness \u2014 none of which LiftShift can see.</li>
            <li>LiftShift shows the highest <em>estimate</em> across your history, not the highest <em>actual</em> lift. These are different concepts.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Safety note</h2>
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 mt-6">
            <p className="text-slate-300 text-sm leading-relaxed">
              <strong className="text-white">Do not attempt a true 1RM based solely on LiftShift\u2019s estimate.</strong> The estimate is a mathematical projection, not a guarantee of capability. Attempting a maximal lift without proper preparation, warm-up, spotting, and technique can result in serious injury. If you want to test your true 1RM, use a structured peaking protocol, have a competent spotter, and prioritise safety over numbers.
            </p>
          </div>
        </section>
      </div>
    </InfoShell>
  );
}
