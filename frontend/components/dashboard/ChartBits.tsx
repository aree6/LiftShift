import React, { useMemo } from 'react';
import { Info, Minus, TrendingDown, TrendingUp } from 'lucide-react';

export const TrendIcon = ({ direction }: { direction: 'up' | 'down' | 'same' }) => {
  const Icon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus;
  const offsetCls = direction === 'up' ? 'top-[1px]' : direction === 'down' ? 'top-0' : 'top-0';
  return (
    <span className={`relative inline-flex ${offsetCls}`}>
      <Icon className="w-3 h-3" />
    </span>
  );
};

export const ShiftedMeta = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return <span className="inline-flex items-center gap-1 ml-2 leading-none">{children}</span>;
};

export const BadgeLabel = ({ main, meta }: { main: React.ReactNode; meta?: React.ReactNode }) => (
  <span className="inline-flex items-center gap-2">
    <span className="font-semibold leading-none">{main}</span>
    {meta && <span className="text-[9px] opacity-70 leading-none">{meta}</span>}
  </span>
);

export const getTrendBadgeTone = (
  deltaPercent: number,
  opts?: { goodWhen?: 'up' | 'down' | 'either' }
): 'good' | 'bad' | 'neutral' => {
  const goodWhen = opts?.goodWhen ?? 'up';
  if (!isFinite(deltaPercent) || deltaPercent === 0) return 'neutral';
  if (goodWhen === 'either') return deltaPercent > 0 ? 'good' : 'bad';
  if (goodWhen === 'up') return deltaPercent > 0 ? 'good' : 'bad';
  return deltaPercent < 0 ? 'good' : 'bad';
};

export const TrendBadge: React.FC<{
  label: React.ReactNode;
  tone: 'good' | 'bad' | 'neutral' | 'info';
}> = ({
  label,
  tone,
}) => {
  const cls =
    tone === 'good'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
      : tone === 'bad'
        ? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
        : tone === 'info'
          ? 'border-blue-500/30 bg-blue-500/10 text-blue-300'
          : 'border-slate-700/40 bg-slate-900/20 text-slate-300';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-normal border ${cls}`}>
      {label}
    </span>
  );
};

export const InsightLine = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-wrap items-center gap-2">
    <span className="font-semibold text-slate-300">Insights:</span>
    {children}
  </div>
);

const sanitizeInsightText = (text: string) => {
  return text
    .replace(/[\u201C\u201D"]/g, '')
    .replace(/\u2014|\u2013/g, ',')
    .replace(/;/g, '.')
    .replace(/[()]/g, '')
    .replace(/\s*\/\s*/g, ' and ')
    .replace(/%/g, ' percent')
    .replace(/\s+/g, ' ')
    .trim();
};

const splitInsightSentences = (text: string) => {
  const cleaned = sanitizeInsightText(text);
  const sentences: string[] = [];
  let start = 0;
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] !== '.') continue;
    const prev = i > 0 ? cleaned[i - 1] : '';
    const next = i + 1 < cleaned.length ? cleaned[i + 1] : '';
    const isDecimal = /\d/.test(prev) && /\d/.test(next);
    const isSentenceEnd = !isDecimal && (i === cleaned.length - 1 || /\s/.test(next));
    if (!isSentenceEnd) continue;
    const s = cleaned.slice(start, i + 1).trim();
    if (s) sentences.push(s);
    start = i + 1;
  }
  const tail = cleaned.slice(start).trim();
  if (tail) sentences.push(tail.endsWith('.') ? tail : `${tail}.`);
  return sentences;
};

export const InsightText = ({ text }: { text: string }) => {
  const sentences = useMemo(() => splitInsightSentences(text), [text]);
  return (
    <div className="text-[11px] text-slate-500 leading-snug">
      {sentences.map((s, i) => (
        <span key={i} className="block">
          {s}
        </span>
      ))}
    </div>
  );
};

export const ChartDescription = ({
  children,
  isMounted = true,
  topSlot,
}: {
  children: React.ReactNode;
  isMounted?: boolean;
  topSlot?: React.ReactNode;
}) => (
  <div className={`mt-4 pt-4 border-t border-slate-800 flex flex-col gap-2 transition-opacity duration-700 ${isMounted ? 'opacity-100' : 'opacity-0'}`}>
    {topSlot && <div className="flex justify-center">{topSlot}</div>}
    <div className="flex items-start gap-3">
      <Info className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0 transition-opacity duration-200 hover:opacity-80" />
      <div className="text-xs text-slate-400 leading-relaxed space-y-2">{children}</div>
    </div>
  </div>
);
