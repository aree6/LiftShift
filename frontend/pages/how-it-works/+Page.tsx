export { Page };

import React from 'react';
import { InfoShell } from '../../components/info/InfoShell';
import { ArrowRight, ShieldCheck, Wand2, BarChart3, FileUp } from 'lucide-react';
import { assetPath } from '../../constants';

function Page() {
  return (
    <InfoShell
      activeNav="how-it-works"
      title="How LiftShift works"
      subtitle="Import your workout history, compute insights locally, and explore dashboards that actually help you train smarter."
    >
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-3">
            <FileUp className="w-5 h-5 text-emerald-300" />
            <h2 className="text-lg font-semibold">1) Bring your data</h2>
          </div>
          <p className="mt-2 text-slate-300">
            Choose your platform (Hevy, Strong, Lyfta, or CSV) and import your workout logs.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-3">
            <Wand2 className="w-5 h-5 text-emerald-300" />
            <h2 className="text-lg font-semibold">2) Normalize + organize</h2>
          </div>
          <p className="mt-2 text-slate-300">
            LiftShift parses sets (exercise, reps, weight, time) and builds a clean history you can filter and analyze.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-300" />
            <h2 className="text-lg font-semibold">3) Compute locally</h2>
          </div>
          <p className="mt-2 text-slate-300">
            Most analytics run in your browser. Your workout history stays on your device.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-emerald-300" />
            <h2 className="text-lg font-semibold">4) Explore dashboards</h2>
          </div>
          <p className="mt-2 text-slate-300">
            See volume trends, PRs, muscle emphasis, and exercise deep dives—then use filters to answer real training questions.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-5">
        <div className="flex items-center gap-3">
          <ArrowRight className="w-5 h-5 text-emerald-300" />
          <h2 className="text-lg font-semibold">Want to try it now?</h2>
        </div>
        <p className="mt-2 text-slate-200">
          Use the dock at the bottom to pick your platform. You’ll jump straight into the import flow.
        </p>
        <p className="mt-3 text-sm text-slate-300">
          Or open the <a className="text-emerald-300 hover:text-emerald-200 underline" href={assetPath('/metrics/')}>metrics glossary</a> if you want clear definitions.
        </p>
      </section>
    </InfoShell>
  );
}
