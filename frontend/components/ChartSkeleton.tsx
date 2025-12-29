import React from 'react';

interface ChartSkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export const ChartSkeleton: React.FC<ChartSkeletonProps> = ({ className = '', style }) => {
  return (
    <div
      className={`relative w-full overflow-hidden rounded-lg border ${className}`}
      style={{
        backgroundColor: 'rgb(var(--panel-rgb) / 0.35)',
        borderColor: 'rgb(var(--border-rgb) / 0.5)',
        ...style,
      }}
    >
      <div
        className="absolute inset-0 animate-pulse"
        style={{
          backgroundImage:
            'linear-gradient(90deg, rgb(var(--border-rgb) / 0.10) 0%, rgb(var(--border-rgb) / 0.18) 50%, rgb(var(--border-rgb) / 0.10) 100%)',
        }}
      />
      <div className="absolute inset-0">
        <div className="absolute left-3 right-3 bottom-3 h-px" style={{ backgroundColor: 'rgb(var(--border-rgb) / 0.35)' }} />
        <div className="absolute left-3 top-3 bottom-3 w-px" style={{ backgroundColor: 'rgb(var(--border-rgb) / 0.35)' }} />
        <div className="absolute left-6 right-6 bottom-6 h-16 rounded-md" style={{ backgroundColor: 'rgb(var(--border-rgb) / 0.12)' }} />
      </div>
    </div>
  );
};
