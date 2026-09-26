export { Page };

import React from 'react';
import { InfoShell } from '../../../components/info/InfoShell';
import { assetPath } from '../../../constants';

function Page() {
  return (
    <InfoShell
      activeNav={null}
      title="Muscle heatmaps"
      subtitle="A muscle heatmap is a visual estimate of which muscles your training emphasises, based on your logged exercises."
    >
      <div className="space-y-7">
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">What it means</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            LiftShift\u2019s muscle heatmap shows a colour-coded map of your body, where each muscle\u2019s colour intensity reflects how much <a href={assetPath('metrics/training-volume/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">training volume</a> that muscle has received recently. Darker or more intense colours indicate higher volume; lighter or cooler colours indicate less or no volume.
          </p>
          <p className="text-slate-300 leading-relaxed mb-4">
            The heatmap is built by mapping each exercise you log to the primary and secondary muscles it targets, then distributing the exercise\u2019s volume across those muscles. For example, a bench press primarily maps to the chest and secondarily to the front deltoids and triceps. The volume from that set is allocated proportionally across all three muscle groups.
          </p>
        </section>

        <div className="rounded-xl border border-white/10 overflow-hidden max-w-lg mx-auto">
          <img src={assetPath('/images/misc/weeklyset.avif')} alt="LiftShift interactive muscle heatmap with per-muscle volume zone scoring" loading="lazy" className="w-full" />
        </div>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Rolling 7-day windows</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            The heatmap shows volume over a rolling 7-day window by default. This means the map reflects what you\u2019ve trained in the last week, not your entire history. As older workouts fall outside the window, their volume contribution fades. This helps you see your <em>current</em> training emphasis rather than a lifetime average.
          </p>
          <p className="text-slate-300 leading-relaxed mb-4">
            You can adjust the window size (14 days, 30 days, or a custom date range) using the calendar filter on the dashboard. Longer windows smooth out day-to-day fluctuations; shorter windows give you a real-time picture.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Volume zone scoring</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            Each muscle on the heatmap is assigned a volume zone: <strong className="text-white">Maintenance</strong>, <strong className="text-white">Growth</strong>, or <strong className="text-white">Overreaching</strong>. These zones are general guidelines based on exercise science literature and help you quickly assess whether each muscle is getting enough stimulus:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
            <li><strong className="text-white">Maintenance</strong>: Enough volume to maintain current muscle size and strength, but probably not enough to drive significant growth.</li>
            <li><strong className="text-white">Growth</strong>: Volume is in the range associated with hypertrophy stimulus. Most people training for muscle growth will want to see this zone for their target muscles.</li>
            <li><strong className="text-white">Overreaching</strong>: Volume is above typical effective ranges. Productive in short blocks but risky if sustained.</li>
          </ul>
          <p className="text-slate-300 leading-relaxed mb-4">
            Zone thresholds are population-level estimates, not personalised prescriptions. Your individual response may differ.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">How to use the heatmap</h2>
          <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
            <li><strong className="text-white">Spot neglected muscles</strong>: If a muscle you want to grow shows no colour or a light maintenance zone, you may need to add volume for that area.</li>
            <li><strong className="text-white">Check balance</strong>: Compare left and right sides, front and back. Large asymmetries (e.g. chest gets far more volume than back) may contribute to postural issues or increase injury risk over time.</li>
            <li><strong className="text-white">Click for detail</strong>: Click any muscle on the heatmap to see exactly which exercises contributed to its volume and how much each exercise contributed. This helps you understand <em>why</em> a muscle is showing the colour it shows.</li>
            <li><strong className="text-white">Monitor over time</strong>: Watch how the heatmap changes week to week. A consistent pattern is good; wild swings suggest programme inconsistency.</li>
            <li><strong className="text-white">Plan your next block</strong>: Use the heatmap as a starting point when writing your next training programme. If your hamstrings have been in maintenance for weeks, that\u2019s a signal to consider adding volume.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Bench press heatmap: what your bench day really trains</h2>
          <p className="text-slate-300 leading-relaxed">
            A bench press heatmap shows your bench press volume distributed across the chest, front deltoids, and triceps.
            In LiftShift, every bench press set you log is split proportionally across those three muscles, so your heatmap
            reveals whether your bench days are actually growing your chest or mostly fatiguing your front delts and triceps.
            If your chest sits in a light zone while your front delts glow, consider close-grip or incline variations —
            then watch the heatmap shift over the following weeks.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Limitations</h2>
          <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
            <li>The heatmap reflects <em>volume</em>, not <em>stimulus</em>. Two sets to failure produce a different training effect than two sets with 5 reps in reserve, even though they contribute equal volume. The heatmap treats them the same.</li>
            <li>Exercise-to-muscle mapping is an approximation. A bench press targets the chest, front delts, and triceps, but individual technique and anthropometry affect the actual stimulus distribution. The heatmap assumes a standard distribution.</li>
            <li>Custom or renamed exercises may not map to any muscle and won\u2019t appear on the heatmap. Using standard exercise names from your app\u2019s built-in library produces the most accurate results.</li>
            <li>Volume zone thresholds are research-informed estimates, not precise cutoffs. The line between maintenance and growth is fuzzy in practice.</li>
            <li>The heatmap does not account for non-gym activity. Manual labour, sports, or daily movement that stresses muscles won\u2019t show up unless you log it.</li>
          </ul>
        </section>
      </div>
    </InfoShell>
  );
}
