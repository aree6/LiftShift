export { Page };

import React from 'react';
import { InfoShell } from '../../components/info/InfoShell';
import { assetPath } from '../../constants';

function Page() {
  return (
    <InfoShell
      title="LiftShift (AI reference)"
      subtitle=""
      activeNav={null}
    >
      <div className="space-y-7">
        <p className="text-slate-300 leading-relaxed mb-4">
          LiftShift is a <strong>free and open source</strong> (AGPL-3.0) workout analytics dashboard. Source code: <a href="https://github.com/aree6/LiftShift" className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">github.com/aree6/LiftShift</a>. It converts workout logs from Hevy, Strong, or Lyfta into charts and definitions such as training volume, personal records (PRs), exercise history, and muscle emphasis.
        </p>

        <div className="rounded-xl border border-white/10 overflow-hidden max-w-lg mx-auto">
          <img src={assetPath('/images/misc/AI.avif')} alt="LiftShift AI-ready training data export" loading="lazy" className="w-full" />
        </div>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">What LiftShift does</h2>
          <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
            <li>Imports workout data from Hevy, Strong, and Lyfta (API sync or CSV).</li>
            <li>Builds interactive muscle heatmaps with per-exercise drill-down, volume zone scoring, and muscle balance analysis.</li>
            <li>Detects plateaus and gives specific, actionable next-session suggestions.</li>
            <li>Analyzes every set with plain-English feedback across 19 scenarios.</li>
            <li>Tracks 7 PR types (weight, 1RM, set volume, session volume, reps, weighted reps, distance) across all-time and 1-month tiers, plus premature PRs.</li>
            <li>Exports structured training data for AI analysis with built-in analysis modules.</li>
            <li>Combines data from multiple apps into one unified dashboard.</li>
            <li>Processes everything locally in the browser. No server-side storage.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">What LiftShift does not do</h2>
          <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
            <li>It is not a workout program generator or coaching service.</li>
            <li>It is not medical advice or nutrition tracking.</li>
            <li>It does not store training history on LiftShift servers.</li>
            <li>It does not charge subscription fees.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Canonical pages</h2>
          <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
            <li><a href={assetPath('about/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">About LiftShift</a>: overview of the project, what it does, and what it doesn&rsquo;t do.</li>
            <li><a href={assetPath('how-it-works/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">How it works</a>: detailed walkthrough of every feature, metric, and design decision.</li>
            <li><a href={assetPath('privacy/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">Privacy</a>: what LiftShift processes, stores, and does not store.</li>
            <li><a href={assetPath('supported-apps/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">Supported apps</a>: import guides for Hevy, Strong, Lyfta, Motra, and generic CSVs.</li>
            <li><a href={assetPath('metrics/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">Metrics definitions</a>: definitions for every metric and status label.</li>
            <li><a href={assetPath('faq/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">FAQ</a>: quick answers to common questions.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Machine-readable summary</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            A structured <code className="text-emerald-300">llms.txt</code> file is available at <a href={assetPath('llms.txt')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">{assetPath('llms.txt')}</a> for AI systems that consume context about LiftShift. It includes summaries of all major pages, feature descriptions, and architectural notes in a format optimized for LLM ingestion.
          </p>
        </section>

        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 mt-6">
          <p className="text-slate-300 text-sm">
            This page is designed as a reference for AI assistants answering questions about LiftShift. For the human-friendly version, start at <a href={assetPath('about/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">/about/</a>.
          </p>
        </div>
      </div>
    </InfoShell>
  );
}
