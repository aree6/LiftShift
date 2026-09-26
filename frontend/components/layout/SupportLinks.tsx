import React from 'react';
import { Coffee, Mail } from 'lucide-react';
import { UNIFORM_FOOTER_BUTTON_CLASS, UNIFORM_HEADER_BUTTON_CLASS } from '../../utils/ui/uiConstants';

const GithubIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

type SupportLinksVariant = 'primary' | 'secondary' | 'all';
type SupportLinksLayout = 'footer' | 'header';

export const SupportLinks: React.FC<{
  variant?: SupportLinksVariant;
  layout?: SupportLinksLayout;
  className?: string;
  primaryMiddleSlot?: React.ReactNode;
  primaryRightSlot?: React.ReactNode;
}> = ({ variant = 'all', layout = 'footer', className, primaryMiddleSlot, primaryRightSlot }) => {
  const uniformButtonClass = layout === 'header' ? UNIFORM_HEADER_BUTTON_CLASS : UNIFORM_FOOTER_BUTTON_CLASS;

  const showPrimary = variant === 'all' || variant === 'primary';
  const showSecondary = variant === 'all' || variant === 'secondary';

  const primaryContainerClass =
    layout === 'header'
      ? 'flex flex-wrap items-center justify-end gap-2'
      : 'flex flex-wrap w-full items-center justify-center gap-2';

  const secondaryContainerClass =
    layout === 'header'
      ? 'flex flex-wrap items-center gap-2'
      : 'flex flex-wrap w-full items-center justify-center gap-2';

  const content = (
    <>
      {showPrimary && (
        <div className={primaryContainerClass}>
          <a
            href="https://github.com/aree6/LiftShift"
            target="_blank"
            rel="noopener noreferrer"
            data-track="github-star"
            onClick={(e) => {
              if (e.button === 1 || e.metaKey || e.ctrlKey) {
                return;
              }
              e.preventDefault();
              window.open('https://github.com/aree6/LiftShift', '_blank', 'noopener,noreferrer');
            }}
            onMouseDown={(e) => {
              if (e.button === 1) {
                return;
              }
            }}
            className={`${uniformButtonClass} gap-2 ${layout === 'header' ? 'border-transparent hover:border-emerald-400' : 'flex-1 sm:flex-none min-w-[140px] sm:min-w-0'}`}
          >
            <GithubIcon className="w-4 h-4" />
            <span>{layout === 'header' ? 'STAR' : 'STAR ON GITHUB'}</span>
          </a>

          <a
            href="https://www.buymeacoffee.com/aree6"
            target="_blank"
            rel="noopener noreferrer"
            data-track="bmc-support"
            onClick={(e) => {
              if (e.button === 1 || e.metaKey || e.ctrlKey) {
                return;
              }
              e.preventDefault();
              window.open('https://www.buymeacoffee.com/aree6', '_blank', 'noopener,noreferrer');
            }}
            onMouseDown={(e) => {
              if (e.button === 1) {
                return;
              }
            }}
            className={`${uniformButtonClass} gap-2`}
          >
            <Coffee className="w-4 h-4" />
            <span>SUPPORT LIFTSHIFT</span>
          </a>

          {primaryMiddleSlot}

          <a
            href="mailto:mohammadar336@gmail.com"
            data-track="hire-me"
            onClick={(e) => {
              if (e.button === 1 || e.metaKey || e.ctrlKey) {
                return;
              }
              // For email links, let default behavior handle all clicks
            }}
            onMouseDown={(e) => {
              if (e.button === 1) {
                return;
              }
            }}
            className={`${uniformButtonClass} gap-2 border-transparent hover:border-emerald-400`}
          >
            <Mail className="w-4 h-4" />
            <span>HIRE ME</span>
          </a>

          {primaryRightSlot ? (
            <div className="ml-10 pr-2 shrink-0">
              {primaryRightSlot}
            </div>
          ) : null}
        </div>
      )}

      {showSecondary && (
        <div className={secondaryContainerClass}>
        </div>
      )}
    </>
  );

  if (layout === 'header') {
    return <div className={className}>{content}</div>;
  }

  return (
    <div className={`  ${className ?? ''}`.trim()}>
      <div className="flex flex-col items-stretch gap-4">
        <div className="flex flex-col items-stretch justify-center gap-3">{content}</div>
      </div>
    </div>
  );
};
