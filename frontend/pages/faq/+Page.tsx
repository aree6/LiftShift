export { Page };

import React from 'react';
import { InfoShell } from '../../components/info/InfoShell';
import { assetPath } from '../../constants';

function Page() {
  return (
    <InfoShell
      title="FAQ"
      subtitle="Quick answers. For detailed explanations of every feature, see the How it works guide."
      activeNav={null}
    >
      <div className="space-y-10">
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">What is LiftShift?</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            LiftShift is a free and open source workout analytics tool that connects to Hevy, Strong, Lyfta, Motra, or a generic CSV and provides insights your logging app doesn&rsquo;t offer &mdash; muscle heatmaps, plateau detection, set-by-set feedback, PR tracking, per-joint injury risk scoring, strength imbalance detection, shareable flex cards, and AI-ready exports. Everything runs locally in your browser. See the <a href={assetPath('about/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">About</a> page for more.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Does LiftShift store my workout data?</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            No. LiftShift does not store your full training history on any LiftShift-owned server. All computation happens locally in your browser using IndexedDB. We never see your sets, reps, or exercise history. For full details, read the <a href={assetPath('privacy/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">Privacy</a> page.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Which workout apps are supported?</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            LiftShift supports <strong>Hevy</strong> (login, Pro API key, or CSV), <strong>Strong</strong> (CSV), <strong>Lyfta</strong> (API key or CSV), <strong>Motra</strong> (Excel), and generic CSVs from any other app. You can also combine data from multiple apps into one unified dashboard. See <a href={assetPath('supported-apps/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">Supported apps</a> for step-by-step import guides.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">How does plateau detection work?</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            LiftShift analyzes your recent workout history for each exercise and checks whether your performance (volume load, estimated 1RM, and rep quality) has stalled or declined over a configurable window. When a plateau is detected, it provides a status label (Getting stronger, Plateauing, or Taking a dip) along with specific, actionable suggestions &mdash; like changing rep ranges, adding accessory work, or adjusting frequency. Read the <a href={assetPath('how-it-works/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">How it works</a> guide for the full methodology.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Can I export my data for AI analysis?</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            Yes. LiftShift includes a one-click AI-ready export that formats your training data with built-in analysis modules including junk volume audit, structural balance, joint health, program adherence, and more. You can paste the export into any LLM for personalized training insights. See the <a href={assetPath('ai/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">AI reference</a> page for details.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">What kinds of PRs does LiftShift track?</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            LiftShift tracks seven types of personal records — <strong>weight, 1RM, set volume, session volume, reps, weighted reps, and distance</strong> — across two tiers: <strong>all-time bests</strong> (your strongest performance ever for an exercise) and <strong>1-month bests</strong> (your best in the last month, useful for monitoring recent progress). It also detects <strong>premature PRs</strong> (when you hit a PR but your volume and rep quality suggest you pushed too far) and flags PR droughts when you haven&rsquo;t set a new record in a while.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">What is set-by-set feedback?</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            After every workout, LiftShift analyzes each set across 19 predefined scenarios &mdash; including RIR errors, volume mismatch, intensity drops, rep quality issues, and more. Each set gets a badge, a plain-English explanation, and a concrete improvement suggestion. This gives you coaching-style feedback without needing a coach.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">What is the Injury Risk card?</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            The Injury Risk card estimates joint stress from 0 to 100 percent for each joint you train. It combines three factors: your <strong>workload ratio</strong> (this week&rsquo;s sets vs. your 4-week average), <strong>recovery</strong> (back-to-back training days on the same joint), and <strong>antagonist balance</strong> (volume ratio between opposing muscle groups). Lower is safer &mdash; a spike above 40 percent suggests considering a deload or rebalancing your program. It is a load-management hint, not medical advice. See the <a href={assetPath('how-it-works/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">How it works</a> guide for the full methodology.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">What is Strength Imbalance?</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            Strength Imbalance compares your estimated 1-rep max across 13 related exercise pairs (bench vs. overhead press, rows vs. bench, squat vs. bench, curls vs. pushdowns, and more) against typical ratios from population statistics &mdash; roughly 28 million logged lifts. When one side of a pair falls outside its typical band, LiftShift flags it as a watch or flag, shows your weekly trend over the last 3 months, and tells you whether the gap is closing or widening. A flagged ratio is a hint &mdash; it can mean a real imbalance, different training history, or a logging difference &mdash; never a verdict on your form.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">What are Flex cards and the Training Manifest?</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            Flex cards are 9 shareable summaries of your training, including an all-time training receipt styled like a shop receipt. The Training Manifest is a separate dashboard card with a 7-day / 30-day toggle, a volume voyage chart, a body panel for the window, and your top lifts by volume. Both are built from your real logged sets.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Why do some charts look wrong?</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            Charts are recalculated based on the selected date range in the calendar filter. If a date range is active, all metrics reflect only that window &mdash; which can make charts look different than expected. Clear the calendar filter or select &ldquo;All time&rdquo; to see your full history. If you synced over an API and see a &ldquo;Showing newest history only&rdquo; banner, the source API capped how far back the sync could go, and totals reflect that partial history. A CSV or Excel import gives you the complete log. Also, make sure you&rsquo;ve imported enough data for meaningful trends. See the <a href={assetPath('how-it-works/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">How it works</a> guide for calendar filtering details.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Is LiftShift a coaching app?</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            No. LiftShift is an analytics tool, not a coaching service or workout program generator. It gives you data-driven insights, status labels, and suggestions &mdash; but it does not write programs, provide medical advice, or replace a qualified coach. Think of it as a second pair of eyes on your training data.
          </p>
        </section>

        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 mt-6">
          <p className="text-slate-300 text-sm">
            Didn&rsquo;t find your answer? Check the <a href={assetPath('how-it-works/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">How it works</a> guide for deep dives into every feature, or open an issue on <a href="https://github.com/aree6/LiftShift" className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">GitHub</a>.
          </p>
        </div>
      </div>
    </InfoShell>
  );
}
