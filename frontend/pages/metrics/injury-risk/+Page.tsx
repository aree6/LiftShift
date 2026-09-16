export { Page };

import React from 'react';
import { InfoShell } from '../../../components/info/InfoShell';
import { assetPath } from '../../../constants';

function Page() {
  return (
    <InfoShell
      activeNav={null}
      title="Injury Risk"
      subtitle="LiftShift estimates joint stress from 0 to 100 percent per joint so you can spot load-management risks early."
    >
      <div className="space-y-7">
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">What the score means</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            The Injury Risk card scores every joint you train from 0 to 100 percent. Lower is safer. The score is an estimate of how much recent training stress a joint is under. It is not a prediction of injury and not medical advice. A spike above 40 percent suggests considering a deload or rebalancing your program.
          </p>
          <p className="text-slate-300 leading-relaxed mb-4">
            The score combines three factors, each shown color-coded in the card: <strong className="text-white">workload</strong> (this week&rsquo;s sets vs. your 4-week average, mirroring the acute:chronic workload ratio), <strong className="text-white">recovery</strong> (back-to-back days training the same joint), and <strong className="text-white">balance</strong> (volume ratio between an antagonist pair, e.g. quads vs. hamstrings).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">How it is calculated</h2>
          <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
            <li><strong className="text-white">Workload ratio</strong>: sets on the joint this week divided by the 4-week rolling average. A ratio above ~1.3 is elevated; higher spikes push the score up sharply.</li>
            <li><strong className="text-white">Recovery</strong>: counts consecutive days the joint was worked. Each back-to-back day increases the recovery component.</li>
            <li><strong className="text-white">Antagonist balance</strong>: compares weekly sets between opposing muscle groups around the joint. Large imbalances (e.g. far more pressing than pulling) add to the score.</li>
          </ul>
          <p className="text-slate-300 leading-relaxed mb-4 mt-4">
            Muscles are attributed to joints through the exercise-to-muscle mapping used across LiftShift, with warm-up sets excluded and secondary muscles weighted lower.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">How to use it</h2>
          <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
            <li><strong className="text-white">Load management</strong>: if a joint&rsquo;s score climbs week over week, reduce frequency or volume on the exercises that hit it hardest.</li>
            <li><strong className="text-white">Program balance</strong>: a high balance component points at an antagonist pair, e.g. add pulling volume if pressing dominates.</li>
            <li><strong className="text-white">Deload timing</strong>: scores above 40 are a reasonable cue to schedule a deload week.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Limitations</h2>
          <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
            <li>The score is derived only from what you log. Technique, sleep, stress, and existing conditions are invisible to it.</li>
            <li>It estimates relative training stress, not injury probability. A low score does not guarantee safety, and a high score does not mean you will get injured.</li>
            <li>ACWR-style metrics are most meaningful with consistent logging over several weeks. Short histories produce noisier scores.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Learn more</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            See the <a href={assetPath('how-it-works/') + '#injury-risk'} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">How it works</a> guide for the full methodology and the <a href={assetPath('faq/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">FAQ</a> for common questions.
          </p>
        </section>
      </div>
    </InfoShell>
  );
}
