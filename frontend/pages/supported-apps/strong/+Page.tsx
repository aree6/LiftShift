export { Page };

import React from 'react';
import { InfoShell } from '../../../components/info/InfoShell';
import { assetPath } from '../../../constants';

function Page() {
  return (
    <InfoShell
      activeNav={null}
      title="Strong"
      subtitle="Strong is a great workout logger, but its built-in charts leave you guessing. LiftShift turns your Strong CSV export into muscle heatmaps, plateau detection, PR tracking, and set-by-set feedback."
    >
      <div className="space-y-7">
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Import options</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            Strong does not offer an API, so the CSV export is the only way to bring your data into LiftShift. The export contains your full workout history including exercises, sets, reps, weights, and dates.
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
            <li><strong className="text-white">CSV import</strong>: Export your workout history from Strong as a CSV file and upload it to LiftShift. All analysis runs locally in your browser. Strong exports can vary in format. See the variants section below.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">How to export</h2>
          <ol className="list-decimal list-inside space-y-1 text-slate-300 leading-relaxed">
            <li>Open the Strong app on your phone.</li>
            <li>Go to the <strong className="text-white">Profile</strong> tab.</li>
            <li>Tap <strong className="text-white">Settings</strong>.</li>
            <li>Scroll down and tap <strong className="text-white">Export Data</strong> or <strong className="text-white">Export as CSV</strong>.</li>
            <li>Save or share the CSV file to your computer, then upload it to LiftShift\u2019s import page.</li>
          </ol>
          <p className="text-slate-300 leading-relaxed mb-4">
            Note: Strong exports contain your <em>entire</em> workout history. LiftShift will parse all of it, but you can filter by date range on the dashboard after importing.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">What LiftShift reads</h2>
          <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
            <li>Exercise name</li>
            <li>Workout date</li>
            <li>Set order and set type (warm-up, working, drop set, failure)</li>
            <li>Weight and rep count for each set</li>
            <li>Optional: workout duration, notes, and routine names</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Common Strong export variants</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            Strong\u2019s CSV export format has changed over time and can differ between iOS and Android versions. LiftShift\u2019s parser handles the most common variants automatically:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
            <li><strong className="text-white">Semicolon-delimited</strong>: Some Strong exports use semicolons (<code className="text-emerald-300">;</code>) instead of commas as the delimiter. LiftShift detects and handles both formats.</li>
            <li><strong className="text-white">Unit-suffixed headers</strong>: Older Strong exports may include unit information in column headers (e.g. \u201cWeight (kg)\u201d or \u201cWeight (lbs)\u201d). LiftShift strips suffixes and handles unit conversion if needed.</li>
            <li><strong className="text-white">Routine names</strong>: Some exports include the routine or workout name as a grouping column. LiftShift preserves this as workout-level metadata so you can filter by routine on the dashboard.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Troubleshooting</h2>

          <h3 className="text-base font-semibold text-white mb-2">Error on import</h3>
          <p className="text-slate-300 leading-relaxed mb-4">
            If LiftShift cannot parse your Strong export, first check the delimiter. Open the CSV file in a text editor. Do the columns appear separated by commas or semicolons? Both should work, but if your file uses an unusual delimiter (tabs, for example), try re-exporting from Strong or using a CSV conversion tool. If the format looks correct but the import still fails, your export may include non-English date formats or unusual encoding. Try re-exporting with your phone\u2019s language set to English.
          </p>

          <h3 className="text-base font-semibold text-white mb-2">Exercise names are split or missing</h3>
          <p className="text-slate-300 leading-relaxed mb-4">
            Strong can use custom exercise names that don\u2019t match standard libraries. If exercises don\u2019t appear in your analytics or show up under \u201cUncategorised\u201d on the muscle heatmap, the names may not be recognised by LiftShift\u2019s exercise-to-muscle mapping. Using Strong\u2019s built-in exercise library names (rather than custom names) produces the most accurate results.
          </p>

          <h3 className="text-base font-semibold text-white mb-2">Switched from Strong to Hevy</h3>
          <p className="text-slate-300 leading-relaxed mb-4">
            If you\u2019ve moved from Strong to Hevy, you can import both exports into LiftShift. The dashboard merges your history and deduplicates overlapping dates so you get a single, continuous timeline. See the <a href={assetPath('supported-apps/hevy/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">Hevy page</a> for import instructions.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">What analytics you get</h2>
          <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
            <li><a href={assetPath('metrics/training-volume/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">Training volume</a>: Weekly and per-muscle volume trends with rolling comparisons.</li>
            <li><a href={assetPath('metrics/personal-records/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">Personal records (PRs)</a>: Track your strongest lifts with tiered PR detection.</li>
            <li><a href={assetPath('metrics/one-rep-max/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">1RM estimates</a>: Strength trend tracking without max testing.</li>
            <li><a href={assetPath('metrics/muscle-heatmap/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">Muscle heatmaps</a>: See exactly which muscles are getting attention and which are being neglected.</li>
            <li>Set-by-set coaching feedback and plateau detection with actionable suggestions.</li>
          </ul>
        </section>
      </div>
    </InfoShell>
  );
}
