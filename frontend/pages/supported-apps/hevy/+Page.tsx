export { Page };

import React from 'react';
import { InfoShell } from '../../../components/info/InfoShell';
import { assetPath } from '../../../constants';

function Page() {
  return (
    <InfoShell
      activeNav={null}
      title="Hevy"
      subtitle="LiftShift gives you muscle heatmaps, plateau detection, set-by-set feedback, and AI-ready exports that Hevy\u2019s built-in charts don\u2019t offer. Here\u2019s how to connect your Hevy data."
    >
      <div className="space-y-7">
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Import options</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            LiftShift supports two ways to bring in your Hevy data:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
            <li><strong className="text-white">CSV import</strong>: Export your workout history from Hevy as a CSV file and upload it to LiftShift. This gives you the most complete data, file imports are never capped. All analysis runs locally in your browser.</li>
            <li><strong className="text-white">Hevy API sync</strong>: Log in with your Hevy email and password, or paste a Hevy Pro API key. LiftShift pulls your newest workouts through your own backend proxy and keeps your dashboard up to date. Very long histories can be capped by the source API, when that happens the app shows a “Showing newest history only” banner.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">How to export your Hevy data</h2>
          <ol className="list-decimal list-inside space-y-1 text-slate-300 leading-relaxed">
            <li>Open the Hevy app on your phone.</li>
            <li>Go to your <strong className="text-white">Profile</strong> tab (the person icon in the bottom-right corner).</li>
            <li>Tap the <strong className="text-white">Settings</strong> gear icon in the top-right.</li>
            <li>Scroll down and tap <strong className="text-white">Export Data</strong>. Hevy will generate a CSV file containing your full workout history.</li>
            <li>Save or share the CSV file to your computer, then upload it to LiftShift\u2019s import page.</li>
          </ol>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">What LiftShift reads</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            LiftShift parses the following columns from your Hevy CSV export:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
            <li>Exercise name (the <code className="text-emerald-300">exercise_title</code> column)</li>
            <li>Workout date and time (the <code className="text-emerald-300">start_time</code> column)</li>
            <li>Set-level data including weight in kg, rep count, set type, RPE, duration, and distance</li>
            <li>Workout-level metadata such as title, description, and notes</li>
          </ul>
          <p className="text-slate-300 leading-relaxed mb-4">
            File import runs entirely in your browser. Login and API-key sync pass through your own backend proxy, which only forwards requests to Hevy and stores nothing.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Troubleshooting</h2>

          <h3 className="text-base font-semibold text-white mb-2">Date parsing</h3>
          <p className="text-slate-300 leading-relaxed mb-4">
            Hevy exports dates in ISO 8601 format (e.g. 2024-01-15T08:30:00Z), which LiftShift parses automatically. If you see date-related import errors, your phone\u2019s locale may be affecting the export format. Try switching your phone\u2019s language to English (US) temporarily before exporting, or check that the <code className="text-emerald-300">start_time</code> column in your CSV uses a standard format.
          </p>

          <h3 className="text-base font-semibold text-white mb-2">Only newest workouts synced</h3>
          <p className="text-slate-300 leading-relaxed mb-4">
            Login and API-key syncs pull your newest workouts first and the source API caps how far back one sync can go. When the cap hits, the app shows a “Showing newest history only” banner and totals reflect the partial history. For the complete log, import a Hevy CSV export instead.
          </p>

          <h3 className="text-base font-semibold text-white mb-2">Charts look wrong</h3>
          <p className="text-slate-300 leading-relaxed mb-4">
            If metrics like training volume or 1RM estimates don\u2019t match what you expect, the most common cause is inconsistent exercise naming. If you\u2019ve renamed exercises in Hevy or used custom names, LiftShift\u2019s muscle mapping may not group them correctly. Standard Hevy library names produce the most accurate results. Check the muscle heatmap to see if exercises are being mapped to the right muscle groups.
          </p>

          <h3 className="text-base font-semibold text-white mb-2">Units</h3>
          <p className="text-slate-300 leading-relaxed mb-4">
            Hevy stores all weights in kilograms internally. LiftShift displays weights in the unit you choose in your dashboard settings. If your Hevy profile uses pounds, the CSV export still contains kilograms. LiftShift converts them to your preferred unit during import. Make sure your unit preference is set correctly in LiftShift\u2019s settings before importing.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Combining Hevy with other apps</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            LiftShift lets you combine data from multiple apps into one unified dashboard. If you\u2019ve used Hevy alongside Strong or Lyfta, import both exports and LiftShift merges the workout histories, deduplicates overlapping sessions, and gives you a single view of your entire training history. See the <a href={assetPath('how-it-works/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">How it works</a> page for details on multi-source merging.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">What analytics you get</h2>
          <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
            <li><a href={assetPath('metrics/training-volume/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">Training volume</a>: Total weight moved per workout, per week, and per muscle group, with rolling window comparisons.</li>
            <li><a href={assetPath('metrics/personal-records/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">Personal records (PRs)</a>: All-time bests, 1-month bests, and premature PR detection with drought alerts.</li>
            <li><a href={assetPath('metrics/one-rep-max/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">1RM estimates</a>: Estimated one-rep max for every exercise, updated after each workout.</li>
            <li><a href={assetPath('metrics/muscle-heatmap/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">Muscle heatmaps</a>: Visual breakdown of which muscles your training emphasises, with 7-day rolling windows and volume zone scoring.</li>
            <li>Set-by-set feedback with 19 coaching scenarios, badges, tooltips, and suggestions based on your performance quality.</li>
            <li>GitHub-style yearly consistency heatmap showing streaks, consistency scores, and workout day highlights.</li>
          </ul>
        </section>
      </div>
    </InfoShell>
  );
}
