import React from 'react';

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
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm overflow-y-auto overscroll-contain">
      <div className="min-h-full w-full px-3 sm:px-6 py-8 flex items-center justify-center">
        <div className={`w-full ${maxWidthClassName} mx-auto`}>
          <div className="relative bg-black/60 border border-slate-700/50 rounded-2xl p-5 sm:p-6 overflow-hidden backdrop-blur-md flex flex-col h-[min(720px,calc(100vh-5rem))]">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute -top-24 -right-28 w-72 h-72 rounded-full blur-3xl bg-emerald-500/10" />
              <div className="absolute -bottom-28 -left-28 w-72 h-72 rounded-full blur-3xl bg-violet-500/10" />
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/20" />
            </div>

            {header ? <div className="relative flex-shrink-0">{header}</div> : null}

            <div className="relative flex-1 min-h-0 overflow-y-auto">
              {children}
            </div>

            {footer ? <div className="relative flex-shrink-0 pt-4">{footer}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
