export { Page };

import React from 'react';
import { InfoShell } from '../../components/info/InfoShell';
import { assetPath } from '../../constants';

function Page() {
  return (
    <InfoShell
      activeNav={null}
      title="Supported apps"
      subtitle="LiftShift supports importing data from the apps below. Each page explains the import method and expectations."
    >
      <div className="space-y-7">
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Supported apps</h2>
          <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
            <li><a href={assetPath('supported-apps/hevy/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">Hevy</a>: CSV import and API sync</li>
            <li><a href={assetPath('supported-apps/strong/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">Strong</a>: CSV import</li>
            <li><a href={assetPath('supported-apps/lyfta/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">Lyfta</a>: CSV import and API sync</li>
            <li><strong className="text-white">Motra</strong>: Excel (.xlsx) import, pick it from the platform list on the home page</li>
            <li><strong className="text-white">Other apps</strong>: generic CSV import with automatic column detection</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">What LiftShift needs from exports</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            To build your analytics, LiftShift needs a few data points from your workout export. Every supported app provides these in its own format, and LiftShift\u2019s parser handles the conversion automatically.
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
            <li><strong className="text-white">Exercise name</strong>: The name of the movement you performed (e.g. \u201cBench Press\u201d, \u201cSquat (Barbell)\u201d).</li>
            <li><strong className="text-white">Date</strong>: When the workout took place, in a standardised format.</li>
            <li><strong className="text-white">Reps and weight</strong>: How many repetitions you performed and at what load, so LiftShift can calculate volume, intensity, and estimated 1RM.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Common import pitfalls</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            Regardless of which app you\u2019re coming from, these issues come up often. Check the troubleshooting section on your app\u2019s page for specifics.
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
            <li><strong className="text-white">Non-English dates</strong>: If your phone\u2019s locale is set to a language that formats dates differently (e.g. DD/MM/YYYY instead of MM/DD/YYYY), some exports may use that locale. LiftShift attempts to detect the format automatically, but mismatches can cause import errors.</li>
            <li><strong className="text-white">Unit headers</strong>: Some exports include unit suffixes in column headers (like \u201cweight_kg\u201d or \u201cweight (lbs)\u201d). LiftShift strips these, but unusual formats can sometimes confuse the parser.</li>
            <li><strong className="text-white">Exercise name variations</strong>: If you rename exercises or use custom names, LiftShift\u2019s muscle mapping may not recognise them. Standard names from each app\u2019s exercise library work best.</li>
          </ul>
        </section>
      </div>
    </InfoShell>
  );
}
