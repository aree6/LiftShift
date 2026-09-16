export { Page };

import React from 'react';
import { InfoShell } from '../../../components/info/InfoShell';
import { assetPath } from '../../../constants';

function Page() {
  return (
    <InfoShell
      activeNav={null}
      title="Lyfta"
      subtitle="Lyfta is a powerful workout tracker, and LiftShift adds muscle heatmaps, plateau detection, PR tracking, and AI-ready exports on top. Import your Lyfta data with an API key or CSV export. All analytics run locally in your browser."
    >
      <div className="space-y-7">
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Import options</h2>
          <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
            <li><strong className="text-white">API sync</strong>: Connect your Lyfta account using your API key. LiftShift pulls your workout history automatically and keeps your dashboard up to date with each new session.</li>
            <li><strong className="text-white">CSV import</strong>: Export your workout history from Lyfta as a CSV file and upload it to LiftShift. This method is always available and gives you full control over which data gets imported. All processing happens locally in your browser.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">How to export</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            To export your data from Lyfta as a CSV file:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-slate-300 leading-relaxed">
            <li>Open the Lyfta app on your phone.</li>
            <li>Navigate to your <strong className="text-white">Profile</strong> or <strong className="text-white">Account</strong> section.</li>
            <li>Look for an <strong className="text-white">Export Data</strong> option. Depending on your app version, this may be under Settings, Account, or Data &amp; Privacy.</li>
            <li>Download the CSV file and upload it to LiftShift\u2019s import page.</li>
          </ol>
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 mt-6">
            <p className="text-slate-300 text-sm leading-relaxed">
              <strong className="text-white">Note:</strong> If you can\u2019t find the export option, Lyfta may have moved it in a recent update. Check the app\u2019s help section or contact Lyfta support. The CSV format is straightforward and LiftShift\u2019s parser handles it automatically.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">What LiftShift reads</h2>
          <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
            <li>Exercise name</li>
            <li>Workout date and time</li>
            <li>Set-level data: weight, reps, set type, and optional RPE</li>
            <li>Workout title, notes, and duration</li>
          </ul>
          <p className="text-slate-300 leading-relaxed mb-4">
            File import runs entirely in your browser. API-key sync passes through your own backend proxy, which only forwards requests to Lyfta and stores nothing.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Troubleshooting</h2>

          <h3 className="text-base font-semibold text-white mb-2">Can\u2019t read export</h3>
          <p className="text-slate-300 leading-relaxed mb-4">
            If LiftShift cannot parse your Lyfta export, first confirm you downloaded the correct file format. Lyfta may offer multiple export options. Make sure you selected CSV (not JSON or another format). If the file is a valid CSV but still fails, try opening it in a text editor to check that the content looks like structured data (rows with comma-separated values). If the file appears empty or contains only headers, your Lyfta account may not have workout data to export yet.
          </p>

          <h3 className="text-base font-semibold text-white mb-2">Exercise names inconsistent</h3>
          <p className="text-slate-300 leading-relaxed mb-4">
            Lyfta allows custom exercise naming. If you\u2019ve created custom exercises or renamed standard ones, LiftShift\u2019s muscle mapping may not recognise them. Use Lyfta\u2019s built-in exercise library names for the most accurate muscle heatmap and analytics. Exercises that can\u2019t be mapped will still appear in your volume metrics but may not show up on the heatmap.
          </p>

          <h3 className="text-base font-semibold text-white mb-2">Missing workouts</h3>
          <p className="text-slate-300 leading-relaxed mb-4">
            If some workouts from Lyfta don\u2019t appear in LiftShift after import, check that those workouts contain completed sets. Workouts with no logged sets (just a title and duration) are excluded from analytics since there\u2019s no performance data to analyse. API syncs also pull newest-first and the source API caps how far back one sync can go, when the cap hits the app shows a \u201CShowing newest history only\u201D banner. Also check your date range filter on the dashboard, you may need to expand it. For the complete log, import a Lyfta CSV export instead.
          </p>

          <h3 className="text-base font-semibold text-white mb-2">Using alongside other apps</h3>
          <p className="text-slate-300 leading-relaxed mb-4">
            If you use Lyfta alongside Hevy or Strong, import both exports into LiftShift. The dashboard merges your history and deduplicates overlapping sessions so you get a single timeline. See <a href={assetPath('supported-apps/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">Supported apps</a> for import guides for other platforms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">What analytics you get</h2>
          <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
            <li><a href={assetPath('metrics/training-volume/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">Training volume</a>: Track volume trends across workouts, weeks, and muscle groups.</li>
            <li><a href={assetPath('metrics/personal-records/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">Personal records (PRs)</a>: Tiered PR tracking with gold, silver, and premature detection.</li>
            <li><a href={assetPath('metrics/one-rep-max/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">1RM estimates</a>: Progressive strength estimates without maxing out.</li>
            <li><a href={assetPath('metrics/muscle-heatmap/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">Muscle heatmaps</a>: Visual per-muscle training emphasis with rolling 7-day windows.</li>
            <li>Set-by-set coaching feedback, plateau detection, and AI-ready structured data exports.</li>
          </ul>
        </section>
      </div>
    </InfoShell>
  );
}
