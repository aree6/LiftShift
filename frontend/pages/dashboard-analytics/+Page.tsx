export { Page };

import React from 'react';
import { InfoShell } from '../../components/info/InfoShell';
import { assetPath } from '../../constants';

const sections = [
  {
    title: '1. Muscle heatmaps: see your training balance',
    image: '/images/misc/weeklyset.avif',
    alt: 'LiftShift interactive muscle heatmap with volume zone scoring',
    content: (
      <>
        <p className="text-slate-300 leading-relaxed mb-4">
          The body map shows a heatmap of your weekly volume per muscle group. The key difference from basic app heatmaps: <strong>these are rolling 7-day windows</strong>, which matches how your body actually recovers, not arbitrary calendar weeks.
        </p>
        <p className="text-slate-300 leading-relaxed mb-4">
          Hover any muscle to see your weekly set rate, current volume zone (maintenance, growth, or overreaching), and estimated progress %. Click a muscle to drill into exactly which exercises contribute, with primary and secondary involvement weighted separately.
        </p>
        <p className="text-slate-300 leading-relaxed mb-4">
          A &ldquo;top 3 concentration&rdquo; metric warns you if too much volume is concentrated in a few muscles. Green = well-distributed. Red = you might be neglecting something.
        </p>
      </>
    ),
  },
  {
    title: '2. Exercise status: know if you&rsquo;re improving',
    image: '/images/misc/plateau.avif',
    alt: 'LiftShift exercise status: Getting stronger, Plateauing, Taking a dip',
    content: (
      <>
        <p className="text-slate-300 leading-relaxed mb-4">
          Every exercise you&rsquo;ve logged gets analyzed and labeled:
        </p>
        <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed mb-4">
          <li><strong>Getting stronger</strong>: Clear positive trend (&gt; +1% strength change).</li>
          <li><strong>Plateauing</strong>: Roughly stable (between -3% and +1%).</li>
          <li><strong>Taking a dip</strong>: Clear drop (&gt; -3%).</li>
          <li><strong>New</strong>: Not enough sessions yet to read a trend.</li>
        </ul>
        <p className="text-slate-300 leading-relaxed mb-4">
          Each status comes with a confidence level (based on how many sessions you&rsquo;ve logged) and a <strong>suggestion card</strong> with concrete next-session advice.
        </p>
      </>
    ),
  },
  {
    title: '3. Set-by-set feedback: learn from every lift',
    image: '/images/misc/setbyset.avif',
    alt: 'LiftShift set-by-set coaching feedback analyzing each set',
    content: (
      <>
        <p className="text-slate-300 leading-relaxed mb-4">
          This is the feature beginners find most useful. Open any past workout and LiftShift analyzes each set relative to the previous one across <strong>19 scenarios</strong>:
        </p>
        <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed mb-4">
          <li><strong>Same weight, reps increased</strong>: &ldquo;Found More&rdquo; or &ldquo;Building Momentum&rdquo;</li>
          <li><strong>Same weight, mild drop</strong>: &ldquo;Normal Fatigue&rdquo;</li>
          <li><strong>Weight increase, reps below target</strong>: &ldquo;Too Aggressive&rdquo; or &ldquo;Not Ready&rdquo;</li>
          <li><strong>Weight decrease, reps met</strong>: &ldquo;Good Reset&rdquo; or &ldquo;Fatigue Managed&rdquo;</li>
        </ul>
        <p className="text-slate-300 leading-relaxed mb-4">
          Each badge has a tooltip with exact numbers. An &ldquo;improvement&rdquo; line tells you what to do next session. A &ldquo;why&rdquo; line explains what just happened.
        </p>
      </>
    ),
  },
  {
    title: '4. Smart PR tracking: more than all-time bests',
    image: '/images/misc/plateau.avif',
    alt: 'LiftShift PR tracking dashboard',
    content: (
      <>
        <p className="text-slate-300 leading-relaxed mb-4">
          LiftShift tracks seven kinds of PRs per exercise:
        </p>
        <ul className="list-disc list-inside space-y-1 text-slate-300 leading-relaxed mb-4">
          <li><strong>Gold PRs</strong>: True all-time bests for weight, 1RM estimate, set volume, session volume, reps, weighted reps, and distance.</li>
          <li><strong>Silver PRs</strong>: Best in the last 1 month. Important for experienced lifters who rarely hit true all-time PRs.</li>
          <li><strong>Premature PRs</strong>: A big spike that wasn&rsquo;t sustained in follow-up sessions. Flagged so you know it wasn&rsquo;t a real breakthrough yet.</li>
        </ul>
        <p className="text-slate-300 leading-relaxed mb-4">
          It also tracks <strong>PR droughts</strong> (days since last all-time PR) and <strong>PR frequency</strong> (new PRs per week). The dashboard summary tells you if your momentum is heating up or cooling off.
        </p>
      </>
    ),
  },
  {
    title: '5. AI-ready export: ask your own questions',
    image: '/images/misc/AI.avif',
    alt: 'LiftShift AI analysis prompt generator',
    content: (
      <>
        <p className="text-slate-300 leading-relaxed mb-4">
          LiftShift can export your full training history in a structured format designed for AI analysis. You pick a timeframe (last session, 1/3/6 months, or all data), optionally select analysis modules (junk volume audit, structural balance, joint health check, intensity drift, etc.), and it generates a prompt + clipboard-ready data. Paste into any AI and ask anything.
        </p>
        <p className="text-slate-300 leading-relaxed mb-4">
          The built-in modules cover: comprehensive audit, redundancy check, junk volume audit, intensity drift, structural balance, fatigue correlation, joint health, and unilateral balance. Or write your own custom prompt.
        </p>
      </>
    ),
  },
  {
    title: '6. Calendar filtering: zoom into any block',
    image: '/images/misc/calender.avif',
    alt: 'LiftShift calendar filtering with date range selection',
    content: (
      <p className="text-slate-300 leading-relaxed mb-4">
        This is simple but powerful. Pick any date range, a single day, a week, a month, a year, or multiple custom ranges, and <strong>every chart, every metric, every insight recalculates</strong> for just that window. Compare your 2025 training against 2024 in seconds. Isolate a specific training block and see what changed.
      </p>
    ),
  },
  {
    title: '7. Consistency heatmap &amp; Flex cards',
    image: '/images/misc/hypertrophy.avif',
    alt: 'LiftShift hypertrophy scatter plot and consistency metrics',
    content: (
      <>
        <p className="text-slate-300 leading-relaxed mb-4">
          A GitHub-style heatmap shows your entire year&rsquo;s training at a glance, workout days as colored squares, intensity by volume. You also get a consistency score, weekly streak counter, and average workouts per week.
        </p>
        <p className="text-slate-300 leading-relaxed mb-4">
          Flex cards are shareable year-in-review summaries: total volume lifted (with fun real-world comparisons), best month, longest streak, top exercises, muscle balance, and total PRs. Designed to look good when shared.
        </p>
      </>
    ),
  },
  {
    title: '8. Lifetime Progress',
    content: (
      <p className="text-slate-300 leading-relaxed mb-4">
        Every muscle gets a 9-tier journey from <strong>Seedling</strong> to <strong>Legend</strong> based on your cumulative lifetime sets. Uses a diminishing-returns formula so early milestones feel achievable and late tiers require real dedication. Shows estimated time to your next milestone if you keep training at your current weekly rate.
      </p>
    ),
  },
];

function Page() {
  return (
    <InfoShell
      title="How to read your training data like a coach"
      subtitle="Your workout app gives you numbers, sets, reps, weight, maybe a basic line chart. LiftShift turns those same numbers into answers you can actually act on. Here's how each feature works."
      activeNav={null}
    >
      <div className="space-y-12">
        {sections.map((s) => (
          <section key={s.title}>
            <h2 className="text-lg font-semibold text-white mb-4">{s.title}</h2>
            <div className={`grid grid-cols-1 ${s.image ? 'lg:grid-cols-2' : ''} gap-6 items-start`}>
              <div>{s.content}</div>
              {s.image ? (
                <div className="rounded-xl border border-white/10 overflow-hidden max-w-lg mx-auto">
                  <img
                    src={assetPath(s.image)}
                    alt={s.alt || ''}
                    loading="lazy"
                    className="w-full"
                  />
                </div>
              ) : null}
            </div>
          </section>
        ))}

        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 mt-6">
          <h2 className="text-base font-semibold text-emerald-200 mb-2">Try it free</h2>
          <p className="text-slate-300 text-sm mb-3">Every feature above is completely free. No account required. All analysis runs in your browser.</p>
          <a href={assetPath('/')} className="text-emerald-300/80 hover:text-emerald-400 transition-colors duration-200 text-sm">Open LiftShift →</a>
        </div>
      </div>
    </InfoShell>
  );
}
