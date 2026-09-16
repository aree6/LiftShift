export { Page };

import React from 'react';
import { InfoShell } from '../../components/info/InfoShell';
import { assetPath } from '../../constants';

function Page() {
  return (
    <InfoShell
      title="Hevy vs Lyfta vs Strong: which workout tracker is right for you?"
      subtitle="Hevy, Lyfta, and Strong are all excellent at logging workouts, but none of them tell you what your data actually means. Compare features, pricing, and complaints side-by-side, then see how LiftShift adds the analytics layer all three are missing."
      activeNav={null}
    >
      <div className="space-y-10">

        {/* PICK ANY LOGGER CALLOUT */}
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-5">
          <p className="text-emerald-200 text-base font-semibold mb-1">
            Your gym stack = the logger you enjoy + LiftShift.
          </p>
          <p className="text-slate-300 text-sm leading-relaxed">
            Hevy, Lyfta, and Strong are all excellent at <em>logging</em> your workouts (sets, reps, weight, rest timers). They differ in exercise libraries, social features, and API access. Pick the one that fits your style. Then add LiftShift for the analytics layer none of them provide: muscle heatmaps, plateau detection, set-by-set feedback, AI export, and more. All three connect in under a minute.
          </p>
        </div>

        {/* COMPARISON TABLE */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Quick comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300 border-collapse">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-2 pr-4 text-white font-semibold">Feature</th>
                  <th className="py-2 pr-4 text-white font-semibold">Hevy</th>
                  <th className="py-2 pr-4 text-white font-semibold">Lyfta</th>
                  <th className="py-2 pr-4 text-white font-semibold">Strong</th>
                  <th className="py-2 text-emerald-300/90 font-semibold">LiftShift</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-white/5">
                  <td className="py-2 pr-4">Workout logging</td>
                  <td className="py-2 pr-4">Polished &amp; fast. Best UX in the category, but development has slowed.</td>
                  <td className="py-2 pr-4">Modern &amp; clean. Newer player with active development, but occasional stability bugs.</td>
                  <td className="py-2 pr-4">Minimal &amp; focused. The OG tracker, but hasn't received meaningful updates in years. Feels abandoned.</td>
                  <td className="py-2"><span className="text-emerald-300/80">Free, open source add-on to your logger.</span> Not a replacement.</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2 pr-4">Exercise library</td>
                  <td className="py-2 pr-4">400+ with GIF demos</td>
                  <td className="py-2 pr-4">5,000+ with HD video demos</td>
                  <td className="py-2 pr-4">200+ (custom exercises unlimited)</td>
                  <td className="py-2"><span className="text-emerald-300/80">Combines exercises, muscle maps &amp; videos from all three.</span></td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2 pr-4">Social features</td>
                  <td className="py-2 pr-4">Feed, followers, comments</td>
                  <td className="py-2 pr-4">Community challenges</td>
                  <td className="py-2">None</td>
                  <td className="py-2"><span className="text-slate-500">&mdash;</span></td>
                </tr>
                <tr className="border-b border-white/5 bg-emerald-500/[0.04]">
                  <td className="py-2 pr-4"><span className="text-emerald-200">Muscle heatmaps</span></td>
                  <td className="py-2 pr-4 text-red-400/80">No</td>
                  <td className="py-2 pr-4 text-red-400/80">No</td>
                  <td className="py-2 pr-4 text-red-400/80">No</td>
                  <td className="py-2 text-emerald-300/80">Interactive body map. Click any muscle, see contributing exercises with primary vs secondary weighting. Rolling 7-day windows, MEV/MRV volume zone scoring, hypertrophy score (0-100).</td>
                </tr>
                <tr className="border-b border-white/5 bg-emerald-500/[0.04]">
                  <td className="py-2 pr-4"><span className="text-emerald-200">Plateau detection</span></td>
                  <td className="py-2 pr-4 text-red-400/80">No</td>
                  <td className="py-2 pr-4 text-red-400/80">No</td>
                  <td className="py-2 pr-4 text-red-400/80">No</td>
                  <td className="py-2 text-emerald-300/80">Detects static vs general plateaus. Gives specific, actionable suggestions: add a rep, bump the weight, try double progression, or deload. Confidence levels per exercise.</td>
                </tr>
                <tr className="border-b border-white/5 bg-emerald-500/[0.04]">
                  <td className="py-2 pr-4"><span className="text-emerald-200">Set-by-set feedback</span></td>
                  <td className="py-2 pr-4 text-red-400/80">No</td>
                  <td className="py-2 pr-4 text-red-400/80">No</td>
                  <td className="py-2 pr-4 text-red-400/80">No</td>
                  <td className="py-2 text-emerald-300/80">Analyzes every set across 19 scenarios. Tells you if you jumped weight too fast, left reps in the tank, or hit normal fatigue. Weight-up / weight-down suggestions per exercise.</td>
                </tr>
                <tr className="border-b border-white/5 bg-emerald-500/[0.04]">
                  <td className="py-2 pr-4"><span className="text-emerald-200">AI-ready export</span></td>
                  <td className="py-2 pr-4 text-red-400/80">No</td>
                  <td className="py-2 pr-4 text-red-400/80">No</td>
                  <td className="py-2 pr-4 text-red-400/80">No</td>
                  <td className="py-2 text-emerald-300/80">8 built-in analysis modules: junk volume audit, structural balance, joint health, fatigue correlation, redundancy check, intensity drift, unilateral balance, general audit. Custom prompts supported.</td>
                </tr>
                <tr className="border-b border-white/5 bg-emerald-500/[0.04]">
                  <td className="py-2 pr-4"><span className="text-emerald-200">Multi-app merge</span></td>
                  <td className="py-2 pr-4 text-red-400/80">No</td>
                  <td className="py-2 pr-4 text-red-400/80">No</td>
                  <td className="py-2 pr-4 text-red-400/80">No</td>
                  <td className="py-2 text-emerald-300/80">Switched from Strong to Hevy? Use both? LiftShift merges all history into one dashboard. Exercise names normalized, duplicates skipped, source labeled.</td>
                </tr>
                <tr className="border-b border-white/5 bg-emerald-500/[0.04]">
                  <td className="py-2 pr-4"><span className="text-emerald-200">Runs locally, no account</span></td>
                  <td className="py-2 pr-4 text-red-400/80">No</td>
                  <td className="py-2 pr-4 text-red-400/80">No</td>
                  <td className="py-2 pr-4 text-red-400/80">No</td>
                  <td className="py-2 text-emerald-300/80">All processing in your browser. No data stored on our servers. Nothing to sign up for. AGPL-3.0 licensed.</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2 pr-4">API access</td>
                  <td className="py-2 pr-4">Yes (OAuth2 + Pro API key)</td>
                  <td className="py-2 pr-4">Yes (API key)</td>
                  <td className="py-2 pr-4">No</td>
                  <td className="py-2"><span className="text-emerald-300/80">Connects to all three: Hevy via OAuth2 or Pro API key, Lyfta via API key, Strong via CSV.</span></td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2 pr-4">Pricing</td>
                  <td className="py-2 pr-4">$23.99/yr</td>
                  <td className="py-2 pr-4">Free + Lyfta Pro</td>
                  <td className="py-2 pr-4">$29.99/yr</td>
                  <td className="py-2 text-emerald-300/80 font-semibold">Free &amp; open source (AGPL-3.0)</td>
                </tr>
                <tr className="border-b border-white/5">
                  <td className="py-2 pr-4">What users love</td>
                  <td className="py-2 pr-4 text-sm"><span className="text-slate-400">"Prettiest UX and the best free tier in the category." &mdash; r/Hevy</span></td>
                  <td className="py-2 pr-4 text-sm"><span className="text-slate-400">"Crazy how much is available for free — 5,000+ exercises, unlimited routines." &mdash; App Store</span></td>
                  <td className="py-2 pr-4 text-sm"><span className="text-slate-400">"I've used nearly every logging app since the App Store launched. This is the best bar none." &mdash; App Store</span></td>
                  <td className="py-2 text-sm"><span className="text-emerald-300/80">"Better analytics than Hevy premium. I bought Pro for the charts but even that doesn't do as good a job." &mdash; r/LiftShift</span></td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">What users complain about</td>
                  <td className="py-2 pr-4 text-sm"><span className="text-slate-400">Free tier caps history at 3 months, 4 routines, 7 custom exercises. No injury-aware program adjustments. Development pace has slowed.</span></td>
                  <td className="py-2 pr-4 text-sm"><span className="text-slate-400">Accidental workout reset bugs. Pressing the wrong button can wipe a session. Apple Watch must be started from phone. Social homepage can't be hidden.</span></td>
                  <td className="py-2 pr-4 text-sm"><span className="text-slate-400">Hasn't received meaningful updates in years. Free tier limits to 3 routines, which blocks PPL and most 4-day splits. Interface feels dated. No API.</span></td>
                  <td className="py-2 text-sm"><span className="text-slate-400">Comprehensive dashboard can be overwhelming for users who just want minimal tracking. UI density is intentional (packed with data) but takes a few sessions to get used to.</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* WHEN TO CHOOSE EACH */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">When to choose Hevy</h2>
          <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
            <li>You want the most polished workout logging experience with social features, exercise GIFs, and a large community.</li>
            <li>You care about API access: Hevy&rsquo;s API lets LiftShift sync your data automatically without CSV files.</li>
            <li>You want the best support for programs, routines, and workout templates.</li>
            <li>You&rsquo;re on iOS and want Apple Watch support for logging.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">When to choose Lyfta</h2>
          <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
            <li>You want the largest exercise library: 5,000+ exercises with HD video demos and a clean, modern interface.</li>
            <li>You use RIR (reps in reserve) instead of RPE for intensity tracking.</li>
            <li>You like plan-based workout structures and want the newest, most actively developed option.</li>
            <li>You want automatic API sync: Lyfta&rsquo;s API key lets LiftShift pull your data directly. CSV import is also available.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">When to choose Strong</h2>
          <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed">
            <li>You value pure speed and simplicity above everything else. Strong gets out of your way.</li>
            <li>You don&rsquo;t need social features, API access, or modern bells and whistles. Just logging.</li>
            <li>You want offline-first reliability. Strong works without internet and syncs cleanly later.</li>
            <li>You&rsquo;re comfortable importing via CSV into LiftShift for analytics. Strong has no API.</li>
          </ul>
        </section>

        {/* HOW LIFTSHIFT FILLS THEM */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Pick any logger. LiftShift fills the rest.</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            LiftShift is not a replacement for Hevy, Lyfta, or Strong. It&rsquo;s a free, open source analytics add-on that plugs into whichever logger you already use.
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed mb-4">
            <li><strong className="text-white">Hevy</strong>: Log in with Hevy email and password, or connect a Pro API key. Automatic sync of your newest workouts.</li>
            <li><strong className="text-white">Lyfta</strong>: Connect via API key. Automatic sync of your newest workouts (very long histories can be capped by the source API; CSV import is uncapped).</li>
            <li><strong className="text-white">Strong</strong>: Upload a CSV export. LiftShift&rsquo;s parser handles all export variants automatically.</li>
          </ul>
          <p className="text-slate-300 leading-relaxed mb-4">
            Switched apps over the years? LiftShift merges data from multiple sources into one dashboard. Exercise names are normalized across platforms, duplicates are detected and skipped, and every set is labeled so you know where it came from. Your entire training history, unified.
          </p>
          <p className="text-slate-300 leading-relaxed mb-4">
            All processing runs in your browser. No account needed. Nothing stored on our servers. Free and open source under AGPL-3.0.
          </p>
          <p className="text-slate-300 leading-relaxed">
            See the <a href={assetPath('how-it-works/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">How it works</a> guide for a full walkthrough of every feature.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Bottom line</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            Hevy, Lyfta, and Strong are all great workout loggers. The differences come down to exercise libraries, social features, API access, user experience, and how actively each is maintained. Pick the one that matches your training style.
          </p>
          <p className="text-slate-300 leading-relaxed mb-4">
            Then add LiftShift. It works with all three, fills the analytics gaps all three share, and gives you muscle heatmaps, plateau detection, set-by-set feedback, AI-ready exports, and more. No matter which logger you chose, your logger handles the logging and LiftShift handles the thinking.
          </p>
        </section>

        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 mt-6">
          <p className="text-slate-300 text-sm">
            Ready to see what your training data actually says? <a href={assetPath('/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200">Open the dashboard</a> and connect Hevy or Lyfta via API, or upload a CSV from Strong. It&rsquo;s free and takes under a minute.
          </p>
        </div>
      </div>
    </InfoShell>
  );
}
