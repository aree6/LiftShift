export { Page };

import React from 'react';
import { InfoShell } from '../../../components/info/InfoShell';
import { assetPath } from '../../../constants';

function Page() {
  return (
    <InfoShell
      activeNav={null}
      title="Training volume"
      subtitle="Definition first, then interpretation."
    >
      <div className="space-y-7">
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">What training volume means</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            Training volume is the total amount of weight you move in a given period, expressed in your preferred unit (kilograms or pounds). It\u2019s the simplest way to quantify how much work your muscles are doing.
          </p>
          <p className="text-slate-300 leading-relaxed mb-4">
            LiftShift calculates volume as:
          </p>
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 mt-6">
            <p className="text-slate-300 text-sm leading-relaxed">
              <strong className="text-white">Volume = weight \u00d7 reps</strong> for each set, summed across all sets in the selected time window.
            </p>
          </div>
          <p className="text-slate-300 leading-relaxed mb-4">
            Example: if you bench press 100 kg for 3 sets of 8 reps, your bench press volume for that workout is 100 \u00d7 8 \u00d7 3 = <strong className="text-white">2,400 kg</strong>. LiftShift sums this across all exercises to give your total workout volume.
          </p>
        </section>

        <div className="rounded-xl border border-white/10 overflow-hidden max-w-lg mx-auto">
          <img src={assetPath('/images/misc/hypertrophy.avif')} alt="LiftShift training volume analysis with scatter plot" loading="lazy" className="w-full" />
        </div>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">What changes volume</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            Volume changes whenever you adjust any of the three input variables:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
            <li><strong className="text-white">Weight</strong>: Adding 2.5 kg to your bench press increases volume.</li>
            <li><strong className="text-white">Reps</strong>: Doing 10 reps instead of 8 increases volume.</li>
            <li><strong className="text-white">Sets</strong>: Adding a fourth set increases volume.</li>
            <li><strong className="text-white">Exercise selection</strong>: Adding or removing exercises from your routine changes total volume.</li>
            <li><strong className="text-white">Workout frequency</strong>: Training more days per week increases weekly volume.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">How to interpret volume trends</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            Volume trends are most useful when compared over time. LiftShift shows you:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
            <li><strong className="text-white">Session volume</strong>: How much work you did in a single workout.</li>
            <li><strong className="text-white">Weekly volume</strong>: Total work across all sessions in a rolling 7-day window.</li>
            <li><strong className="text-white">Per-muscle volume</strong>: How volume is distributed across muscle groups (visible on the <a href={assetPath('metrics/muscle-heatmap/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">muscle heatmap</a>).</li>
            <li><strong className="text-white">Rolling comparisons</strong>: This week vs. last week, this month vs. last month, so you can spot trends at a glance.</li>
          </ul>
          <p className="text-slate-300 leading-relaxed mb-4">
            A steadily rising weekly volume often indicates progressive overload (you\u2019re doing more work over time). A sharp drop may be intentional (a deload week) or a sign of inconsistency. Look at volume alongside other metrics like <a href={assetPath('metrics/personal-records/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">PRs</a> and <a href={assetPath('metrics/one-rep-max/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">1RM estimates</a> for a complete picture.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Volume vs. muscle growth</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            Higher volume is not always better. Research suggests there\u2019s a per-session volume ceiling beyond which additional sets provide diminishing returns and may increase fatigue without additional stimulus. LiftShift doesn\u2019t prescribe how much volume you should do \u2014 it shows you what you\u2019re actually doing so you can compare it against your own goals and reference research.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Volume zone scoring</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            LiftShift assigns each muscle group a volume zone based on your recent training:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
            <li><strong className="text-white">Maintenance</strong>: Volume is within the range that maintains current muscle size and strength. You\u2019re doing enough to hold ground but not enough to drive significant growth.</li>
            <li><strong className="text-white">Growth</strong>: Volume is in the range associated with hypertrophy stimulus. You\u2019re providing enough mechanical tension to signal adaptation.</li>
            <li><strong className="text-white">Overreaching</strong>: Volume is above the typical effective range. This can be productive in short blocks (overreaching phases) but sustained overreaching increases injury risk and may lead to systemic fatigue.</li>
          </ul>
          <p className="text-slate-300 leading-relaxed mb-4">
            These zones are general guidelines based on exercise science literature, not personalised prescriptions. Individual response to volume varies significantly.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Caveats</h2>
          <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
            <li>Volume counts all sets equally \u2014 a warm-up set of 10 rep counts the same as a working set to failure. LiftShift\u2019s set-type labels help distinguish these, but total volume is a blunt measurement.</li>
            <li>Volume doesn\u2019t account for proximity to failure, tempo, or range of motion. Two workouts with identical volume numbers can produce very different training effects.</li>
            <li>Bodyweight exercises are included in volume if you\u2019ve logged a weight. If you don\u2019t log bodyweight for pull-ups or dips, those exercises contribute zero volume \u2014 which undercounts your actual work.</li>
            <li>Volume alone is not a measure of workout quality. Use it as one data point among many.</li>
          </ul>
        </section>
      </div>
    </InfoShell>
  );
}
