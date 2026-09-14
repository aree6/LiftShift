import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Info, Sparkles, Menu } from 'lucide-react';
import { useTheme } from '../theme/ThemeProvider';
import { assetPath } from '../../constants';
import { SEMI_FANCY_FONT } from '../../utils/ui/uiConstants';

const GithubIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

type NavigationProps = {
  activeNav?: 'how-it-works' | 'features' | null;
  variant?: 'landing' | 'info';
  className?: string;
  onNavClick?: (nav: 'how-it-works' | 'features') => void;
  onLogoClick?: () => void;
};

export const Navigation: React.FC<NavigationProps> = ({
  activeNav = null,
  variant = 'landing',
  className = '',
  onNavClick,
  onLogoClick,
}) => {
  const { mode } = useTheme();
  const isLight = mode === 'light';
  const reduceMotion = useReducedMotion();
  return (
    <motion.header
      initial={reduceMotion ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`h-20 sm:h-24 flex items-center justify-between ${className}`}
    >
      {/* Logo on the left */}
      {onLogoClick ? (
        <button
          onClick={onLogoClick}
          className={`flex items-center gap-2 sm:gap-3 rounded-xl px-1.5 sm:px-2 py-1 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${isLight ? 'hover:bg-black/5' : 'hover:bg-white/5'}`}
        >
          <img src={assetPath('/UI/logo.png')} alt="LiftShift Logo" className="w-6 h-6 sm:w-8 sm:h-8" />
          <span className={`font-semibold text-sm sm:text-xl ${isLight ? 'text-slate-900' : 'text-white'}`} style={SEMI_FANCY_FONT}>LiftShift</span>
        </button>
      ) : (
        <a href={assetPath('/')} className={`flex items-center gap-2 sm:gap-3 rounded-xl px-1.5 sm:px-2 py-1 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${isLight ? 'hover:bg-black/5' : 'hover:bg-white/5'}`}>
          <img src={assetPath('/UI/logo.png')} alt="LiftShift Logo" className="w-6 h-6 sm:w-8 sm:h-8" />
          <span className={`font-semibold text-sm sm:text-xl ${isLight ? 'text-slate-900' : 'text-white'}`} style={SEMI_FANCY_FONT}>LiftShift</span>
        </a>
      )}

      {/* Navigation links on the right - Desktop */}
      <div className="hidden sm:flex items-center gap-5">
        {onNavClick ? (
          <button
            onClick={() => onNavClick('how-it-works')}
            className={`inline-flex items-center gap-1.5 transition-all duration-200 hover:-translate-y-[1px] active:scale-[0.97] text-sm font-medium cursor-pointer ${activeNav === 'how-it-works'
                ? 'text-emerald-300'
                : `${isLight ? 'text-slate-600 hover:text-emerald-600' : 'text-slate-300 hover:text-emerald-300'}`
              }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>How it works</span>
          </button>
        ) : (
          <a
            href={assetPath('how-it-works/')}
            className={`inline-flex items-center gap-1.5 transition-all duration-200 hover:-translate-y-[1px] active:scale-[0.97] text-sm font-medium ${variant === 'info' && activeNav === 'how-it-works'
                ? 'text-emerald-300'
                : `${isLight ? 'text-slate-600 hover:text-emerald-600' : 'text-slate-300 hover:text-emerald-300'}`
              }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>How it works</span>
          </a>
        )}
        {onNavClick ? (
          <button
            onClick={() => onNavClick('features')}
            className={`inline-flex items-center gap-1.5 transition-all duration-200 hover:-translate-y-[1px] active:scale-[0.97] text-sm font-medium cursor-pointer ${activeNav === 'features'
                ? 'text-emerald-300'
                : `${isLight ? 'text-slate-600 hover:text-emerald-600' : 'text-slate-300 hover:text-emerald-300'}`
              }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Features</span>
          </button>
        ) : (
          <a
            href={assetPath('features/')}
            className={`inline-flex items-center gap-1.5 transition-all duration-200 hover:-translate-y-[1px] active:scale-[0.97] text-sm font-medium ${variant === 'info' && activeNav === 'features'
                ? 'text-emerald-300'
                : `${isLight ? 'text-slate-600 hover:text-emerald-600' : 'text-slate-300 hover:text-emerald-300'}`
              }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Features</span>
          </a>
        )}
        <a
          href="https://github.com/aree6/LiftShift"
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1.5 transition-all duration-200 hover:-translate-y-[1px] active:scale-[0.97] text-sm font-medium ${isLight ? 'text-slate-600 hover:text-emerald-600' : 'text-slate-300 hover:text-emerald-300'}`}
        >
          <GithubIcon className="w-3.5 h-3.5" />
          <span>GitHub</span>
        </a>
      </div>

      {/* Mobile Navigation - all buttons on the right */}
      <div className="sm:hidden flex items-center gap-2">
        {onNavClick ? (
          <button
            onClick={() => onNavClick('how-it-works')}
            className={`inline-flex items-center gap-1 text-xs px-1.5 py-1 transition-all duration-200 hover:-translate-y-[1px] active:scale-[0.97] cursor-pointer ${activeNav === 'how-it-works'
              ? 'text-emerald-200'
              : `${isLight ? 'text-slate-600 hover:text-emerald-600' : 'text-slate-300 hover:text-emerald-200'}`
              }`}
          >
            <Info className="w-2.5 h-2.5" />
            <span>How it works</span>
          </button>
        ) : (
          <a
            href={assetPath('how-it-works/')}
            className={`inline-flex items-center gap-1 text-xs px-1.5 py-1 transition-all duration-200 hover:-translate-y-[1px] active:scale-[0.97] ${variant === 'info' && activeNav === 'how-it-works'
              ? 'text-emerald-200'
              : `${isLight ? 'text-slate-600 hover:text-emerald-600' : 'text-slate-300 hover:text-emerald-200'}`
              }`}
          >
            <Info className="w-2.5 h-2.5" />
            <span>How it works</span>
          </a>
        )}
        {onNavClick ? (
          <button
            onClick={() => onNavClick('features')}
            className={`inline-flex items-center gap-1 text-xs px-1.5 py-1 transition-all duration-200 hover:-translate-y-[1px] active:scale-[0.97] cursor-pointer ${activeNav === 'features'
              ? 'text-emerald-200'
              : `${isLight ? 'text-slate-600 hover:text-emerald-600' : 'text-slate-300 hover:text-emerald-200'}`
              }`}
          >
            <Sparkles className="w-2.5 h-2.5" />
            <span>Features</span>
          </button>
        ) : (
          <a
            href={assetPath('features/')}
            className={`inline-flex items-center gap-1 text-xs px-1.5 py-1 transition-all duration-200 hover:-translate-y-[1px] active:scale-[0.97] ${variant === 'info' && activeNav === 'features'
              ? 'text-emerald-200'
              : `${isLight ? 'text-slate-600 hover:text-emerald-600' : 'text-slate-300 hover:text-emerald-200'}`
              }`}
          >
            <Sparkles className="w-2.5 h-2.5" />
            <span>Features</span>
          </a>
        )}
        <a href="https://github.com/aree6/LiftShift" target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1 text-xs px-1.5 py-1 transition-all duration-200 hover:-translate-y-[1px] active:scale-[0.97] ${isLight ? 'text-slate-600 hover:text-emerald-600' : 'text-slate-300 hover:text-emerald-200'}`}>
          <GithubIcon className="w-2.5 h-2.5" />
          <span>GitHub</span>
        </a>
      </div>
    </motion.header>
  );
};
