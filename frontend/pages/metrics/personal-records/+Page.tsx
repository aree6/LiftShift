export { Page };

import React from 'react';
import { InfoShell } from '../../../components/info/InfoShell';
import { assetPath } from '../../../constants';

function Page() {
  return (
    <InfoShell
      activeNav={null}
      title="Personal records (PRs)"
      subtitle="A PR is a data-derived best, not a promise about your future performance."
    >
      <div className="space-y-7">
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">What counts as a PR</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            A personal record in LiftShift is the best performance you\u2019ve logged for a given exercise, measured across your entire training history. LiftShift tracks PRs by three metrics: heaviest weight lifted for a given rep count, highest estimated 1RM, and highest single-set volume (weight \u00d7 reps) for the exercise.
          </p>
          <p className="text-slate-300 leading-relaxed mb-4">
            A PR is set-specific \u2014 benching 100 kg for 5 reps and benching 90 kg for 10 reps are different performances. LiftShift records the best combination of weight and reps you\u2019ve achieved, not just the heaviest single rep.
          </p>
        </section>

        <div className="rounded-xl border border-white/10 overflow-hidden max-w-lg mx-auto">
          <img src={assetPath('/images/misc/plateau.avif')} alt="LiftShift exercise status and PR tracking dashboard" loading="lazy" className="w-full" />
        </div>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">The three PR tiers</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            LiftShift classifies every PR into one of three tiers based on how it compares to your history:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
            <li><strong className="text-white">Gold PR</strong>: An all-time personal record. You have never lifted more weight for this many reps, ever, in your logged history. This is the highest tier and the one most people mean when they say \u201cPR.\u201d</li>
            <li><strong className="text-white">Silver PR</strong>: A 1-month best. You haven\u2019t lifted this much in the last month. This indicates you\u2019re surpassing recent performance and trending in the right direction, even if you haven\u2019t hit an all-time best yet.</li>
            <li><strong className="text-white">Premature PR</strong>: A best at a new rep range. For example, if you\u2019ve never logged this exercise at 6 reps before and you hit a weight that\u2019s your best at 6 reps, it\u2019s flagged as a premature PR. It\u2019s technically a record, but LiftShift notes that the comparison pool is shallow. These often occur when you try a new rep scheme or exercise variation.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">PR droughts and frequency</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            LiftShift tracks how long it\u2019s been since your last PR for each exercise and alerts you to PR droughts. A PR drought isn\u2019t necessarily a problem \u2014 it may mean you\u2019re in a maintenance phase or focusing on other exercises. But if you\u2019re trying to progress and haven\u2019t hit a PR in a while, it\u2019s a data point worth investigating.
          </p>
          <p className="text-slate-300 leading-relaxed mb-4">
            PR frequency varies naturally. Beginners hit PRs frequently. Intermediate lifters see them less often. Advanced lifters may go months between PRs. LiftShift doesn\u2019t judge \u2014 it just reports what your data shows.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">How PRs are calculated</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            LiftShift evaluates every set you log against three dimensions:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
            <li><strong className="text-white">Weight</strong>: The heaviest load lifted for a given rep count. This is the classic definition of a PR.</li>
            <li><strong className="text-white">1RM estimate</strong>: The highest estimated one-rep max for the exercise, derived from any set using the Epley formula. Even if the weight itself isn\u2019t your heaviest, a set with more reps at a slightly lower weight may produce a higher estimated 1RM. See the <a href={assetPath('metrics/one-rep-max/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">1RM page</a> for the formula.</li>
            <li><strong className="text-white">Volume</strong>: The highest single-set volume (weight \u00d7 reps) for the exercise. This captures endurance-oriented PRs that raw weight alone would miss.</li>
          </ul>
          <p className="text-slate-300 leading-relaxed mb-4">
            A single set can qualify as a PR on one, two, or all three dimensions simultaneously.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">What a PR does not mean</h2>
          <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
            <li>A PR does <strong className="text-white">not</strong> mean your technique was perfect. LiftShift sees numbers, not form. A PR with compromised technique may not represent real strength gain.</li>
            <li>A PR does <strong className="text-white">not</strong> guarantee you can repeat it next session. Day-to-day performance varies with sleep, nutrition, stress, and fatigue.</li>
            <li>A premature PR does <strong className="text-white">not</strong> carry the same weight as a gold PR. The comparison pool is smaller, so the record is less meaningful.</li>
            <li>A PR at a higher rep count does <strong className="text-white">not</strong> mean your 1RM has increased. It means you\u2019re stronger at that rep range. LiftShift\u2019s 1RM estimate helps connect the dots.</li>
            <li>Hitting PRs every session is <strong className="text-white">not</strong> sustainable long-term. PR frequency naturally declines as you approach your genetic potential.</li>
          </ul>
        </section>
      </div>
    </InfoShell>
  );
}
