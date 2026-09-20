import React from 'react';
import { motion } from 'motion/react';
import { resolveDarkBgByMode, resolveLightBg } from '../../../src/assets/images/misc/bgConfig';
import { useTheme } from '../../theme/ThemeProvider';
import { useAppPreferences } from '../../../hooks/app';

type OnboardingModalShellProps = {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  /** Optional max width of the card. Defaults to a consistent onboarding width. */
  maxWidthClassName?: string;
};

export function OnboardingModalShell({
  children,
  header,
  footer,
  maxWidthClassName = 'max-w-xl',
}: OnboardingModalShellProps) {
  const { mode } = useTheme();
  const { darkBgChoice, lightBgChoice } = useAppPreferences();
  const isLightTheme = mode === 'light';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
      className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm overflow-y-auto overscroll-contain"
    >
      <div className="min-h-full w-full px-3 sm:px-6 py-8 flex items-center justify-center">
        <div className={`w-full ${maxWidthClassName} mx-auto`}>
          <div className="relative bg-black/60 border border-slate-700/50 rounded-2xl p-5 sm:p-6 overflow-hidden flex flex-col min-h-[500px] max-h-[min(720px,calc(100vh-5rem))]">
            {!isLightTheme ? (
              <img
                src={resolveDarkBgByMode(mode, darkBgChoice)}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none"
              />
            ) : (
              <img
                src={resolveLightBg(lightBgChoice)}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover opacity-60 pointer-events-none"
              />
            )}

            {header ? <div className="relative flex-shrink-0">{header}</div> : null}

            <div className="relative flex-auto min-h-0 overflow-y-scroll flex flex-col justify-center">
              {children}
            </div>

            {footer ? <div className="relative flex-shrink-0 pt-4">{footer}</div> : null}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
