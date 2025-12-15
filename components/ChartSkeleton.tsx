import React from 'react';

interface ChartSkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export const ChartSkeleton: React.FC<ChartSkeletonProps> = ({ className = '', style }) => {
  return (
    <div
      className={`relative w-full overflow-hidden rounded-lg border border-slate-700/50 bg-black/50 ${className}`}
      style={style}
    >
      <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-slate-800/25 via-slate-700/20 to-slate-800/25" />
      <div className="absolute inset-0">
        <div className="absolute left-3 right-3 bottom-3 h-px bg-slate-700/40" />
        <div className="absolute left-3 top-3 bottom-3 w-px bg-slate-700/40" />
        <div className="absolute left-6 right-6 bottom-6 h-16 rounded-md bg-slate-800/20" />
      </div>
    </div>
  );
};
