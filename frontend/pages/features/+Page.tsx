export { Page };

import React from 'react';
import { InfoShell } from '../../components/info/InfoShell';
import { Flame, CalendarDays, Trophy, BarChart3, Dumbbell, ShieldCheck } from 'lucide-react';

function FeatureCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center gap-3">
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-2 text-emerald-300">{icon}</div>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <p className="mt-2 text-slate-300">{text}</p>
    </div>
  );
}

function Page() {
  return (
    <InfoShell
      activeNav="features"
      title="Features"
      subtitle="Everything is designed to answer training questions quickly, with clean visuals and clear definitions."
    >
      <section className="grid gap-4 sm:grid-cols-2">
        <FeatureCard
          icon={<Flame className="w-5 h-5" />}
          title="Muscle heatmaps"
          text="See which muscles you’re actually training, with group and muscle views and different time windows."
        />
        <FeatureCard
          icon={<CalendarDays className="w-5 h-5" />}
          title="Calendar filtering"
          text="Zoom into a day, week, or month to compare blocks of training and isolate what changed."
        />
        <FeatureCard
          icon={<Trophy className="w-5 h-5" />}
          title="PR detection"
          text="Automatically detect new personal records and track PR trends over time."
        />
        <FeatureCard
          icon={<BarChart3 className="w-5 h-5" />}
          title="Volume trends"
          text="Track training load over time with charts built for quick interpretation."
        />
        <FeatureCard
          icon={<Dumbbell className="w-5 h-5" />}
          title="Exercise deep dives"
          text="Pick any exercise to see trends, recent performance, and historical context in one view."
        />
        <FeatureCard
          icon={<ShieldCheck className="w-5 h-5" />}
          title="Privacy-first"
          text="Most analytics run locally in your browser. Your workout history stays on your device."
        />
      </section>
    </InfoShell>
  );
}
