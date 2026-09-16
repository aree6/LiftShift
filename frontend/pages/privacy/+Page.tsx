export { Page };

import React from 'react';
import { InfoShell } from '../../components/info/InfoShell';
import { assetPath } from '../../constants';

function Page() {
  return (
    <InfoShell
      title="Privacy"
      subtitle="LiftShift is designed to work without sending your full training history to a LiftShift-owned database. The goal is: you get analytics, without giving up control of your data."
      activeNav={null}
    >
      <div className="space-y-10">
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">What LiftShift processes</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            LiftShift reads your workout history (exercises, sets, reps, weights, dates, notes) from Hevy, Strong, or Lyfta to compute analytics locally. This includes exercise names, set-level data, workout dates, and any notes or RPE/RIR values you&rsquo;ve logged. Muscle mapping is done client-side using a built-in exercise-to-muscle database.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Where data is processed</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            All computation &mdash; heatmap generation, plateau detection, set-by-set analysis, PR tracking, and AI export formatting &mdash; happens entirely in your browser using IndexedDB. LiftShift does not upload your workout data to a server for processing. The only network requests are to the Hevy API (if you use API sync instead of CSV import) and to fetch the LiftShift application code itself.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">What LiftShift stores</h2>
          <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
            <li><strong>Your workout data</strong>: stored locally in your browser&rsquo;s IndexedDB. This never leaves your device.</li>
            <li><strong>Application preferences</strong>: platform selection, date filter ranges, and UI settings are stored in localStorage.</li>
            <li><strong>Anonymous page view analytics</strong>: LiftShift uses Google Analytics to track anonymous page views (URLs visited, no workout data). You can block this with any ad blocker or by disabling JavaScript.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">What LiftShift does not store</h2>
          <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
            <li>Your full training history is never stored on LiftShift servers.</li>
            <li>Your Hevy, Strong, or Lyfta account credentials are never seen by LiftShift. Hevy API auth uses OAuth and LiftShift never receives your password. CSV imports are processed entirely in-browser.</li>
            <li>LiftShift does not use cookies beyond what the app itself needs to function (localStorage preferences).</li>
            <li>No personal identifiers (name, email, location) are collected or stored by LiftShift.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Important limitation</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            While LiftShift does not store your data, <strong>the third-party apps you connect to (Hevy, Strong, Lyfta) do</strong>. LiftShift has no control over their data practices. If you use Hevy API sync, Hevy&rsquo;s servers will process your request and transmit your workout history to your browser. Review each app&rsquo;s privacy policy for details on how they handle your data.
          </p>
        </section>

        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 mt-6">
          <p className="text-slate-300 text-sm">
            For more background on the design choices behind LiftShift&rsquo;s architecture, see the <a href={assetPath('how-it-works/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">How it works</a> guide. The full source code is available on <a href="https://github.com/aree6/LiftShift" className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">GitHub</a> under AGPL-3.0.
          </p>
        </div>
      </div>
    </InfoShell>
  );
}
