import React from 'react';
import { Github, Star } from 'lucide-react';

const StarOnGithubButton: React.FC<{
  showCount?: boolean;
  className?: string;
  variant?: 'solid' | 'outline';
}> = ({ showCount = true, className, variant = 'solid' }) => {
  const baseClass =
    variant === 'outline'
      ? 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 px-3 py-1.5 bg-transparent border border-black/70 text-slate-200 hover:border-white hover:text-white hover:bg-white/5 transition-all duration-200'
      : 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 bg-transparent border border-black/70 text-slate-200 hover:border-white hover:text-white hover:bg-white/5 transition-all duration-200';

  const label = showCount ? 'Star on GitHub' : 'Star';

  return (
    <button
      type="button"
      onClick={() => window.open('https://github.com/aree6/LiftShift', '_blank', 'noopener,noreferrer')}
      className={`${baseClass} gap-2 ${className ?? ''}`.trim()}
      title="LiftShift on GitHub"
      aria-label="Star on GitHub"
    >
      <Github className="w-4 h-4" />
      <span>{label}</span>
      {showCount ? (
        <span className="inline-flex items-center gap-1 ml-1 text-yellow-300">
          <Star className="w-4 h-4" />
          <span className="text-xs">612</span>
        </span>
      ) : null}
    </button>
  );
};

export default StarOnGithubButton;
