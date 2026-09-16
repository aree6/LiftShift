export { Page };

import React from 'react';
import { InfoShell } from '../../components/info/InfoShell';
import { assetPath } from '../../constants';

function Page() {
  return (
    <InfoShell
      title="About LiftShift"
      subtitle="A free and open source workout analytics tool (AGPL-3.0). Connect Hevy, Strong, Lyfta, Motra, or a generic CSV and get answers your logging app doesn't give you: muscle heatmaps, plateau detection, set-by-set feedback, PR tracking, injury risk scoring, strength imbalance detection, shareable flex cards, and AI-ready exports. Everything runs in your browser."
      activeNav={null}
    >
      <div className="space-y-10">
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Open source</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            LiftShift is fully open source under the <strong>AGPL-3.0</strong> license. The entire codebase is available on <a href="https://github.com/aree6/LiftShift" className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">GitHub</a>. You can audit the code, run it locally, or contribute. No hidden telemetry, no paywalls, no server-side data collection.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">What LiftShift does</h2>
          <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
            <li>Imports workout data from Hevy, Strong, Lyfta, Motra, and generic CSVs (API sync or file upload).</li>
            <li>Builds interactive muscle heatmaps with per-exercise drill-down, volume zone scoring, and muscle balance analysis.</li>
            <li>Detects plateaus and gives specific, actionable next-session suggestions.</li>
            <li>Analyzes every set in a workout with plain-English feedback across 19 scenarios.</li>
            <li>Tracks seven kinds of PRs (weight, 1RM, set volume, session volume, reps, weighted reps, distance) with all-time and 1-month tiers, plus premature PR detection.</li>
            <li>Scores per-joint injury risk from workload, recovery, and antagonist balance, and detects strength imbalances across 13 exercise ratio pairs with a monthly trend.</li>
            <li>Shows a Training Manifest dashboard card and 9 shareable flex cards, including an all-time training receipt.</li>
            <li>Exports structured training data for AI analysis with built-in analysis modules.</li>
            <li>Combines data from multiple apps into one unified dashboard.</li>
            <li>Processes everything locally in your browser &mdash; no server-side storage.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">What makes LiftShift different</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            Hevy, Strong, Lyfta, and Motra are great workout loggers. LiftShift is a workout analyst. Your app shows you what you did. LiftShift tells you what it means — and what to do next.
          </p>
          <p className="text-slate-300 leading-relaxed mb-4">
            Most analytics tools give you dashboards full of numbers you have to interpret yourself. LiftShift gives you status labels, coaching feedback, and tiny actionable suggestions you can try next session. See the <a href={assetPath('how-it-works/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">How it works</a> guide for a complete walkthrough.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">What LiftShift does not do</h2>
          <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
            <li>It is not a workout program generator or coaching service.</li>
            <li>It is not medical advice or nutrition tracking.</li>
            <li>It does not store your training history on LiftShift servers.</li>
            <li>It does not charge subscription fees. Every feature is free.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Quick links</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-slate-300"><strong>How everything works</strong></div>
            <div><a href={assetPath('how-it-works/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">/how-it-works/</a></div>
            <div className="text-slate-300"><strong>Privacy model</strong></div>
            <div><a href={assetPath('privacy/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">/privacy/</a></div>
            <div className="text-slate-300"><strong>Metrics definitions</strong></div>
            <div><a href={assetPath('metrics/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">/metrics/</a></div>
            <div className="text-slate-300"><strong>FAQ</strong></div>
            <div><a href={assetPath('faq/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">/faq/</a></div>
          </div>
        </section>
      </div>
    </InfoShell>
  );
}
