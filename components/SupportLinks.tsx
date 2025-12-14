import React from 'react';
import StarOnGithubButton from './StarOnGithubButton';
import { Coffee, HeartHandshake, Mail, UserRound } from 'lucide-react';

type SupportLinksVariant = 'primary' | 'secondary' | 'all';
type SupportLinksLayout = 'footer' | 'header';

export const SupportLinks: React.FC<{
  variant?: SupportLinksVariant;
  layout?: SupportLinksLayout;
  className?: string;
  primaryMiddleSlot?: React.ReactNode;
  primaryRightSlot?: React.ReactNode;
}> = ({ variant = 'all', layout = 'footer', className, primaryMiddleSlot, primaryRightSlot }) => {
  const uniformButtonClass =
    layout === 'header'
      ? 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-xs font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 px-3 py-1.5 bg-transparent border border-black/70 text-slate-200 hover:border-white hover:text-white hover:bg-white/5 transition-all duration-200'
      : 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-10 px-4 py-2 bg-transparent border border-black/70 text-slate-200 hover:border-white hover:text-white hover:bg-white/5 transition-all duration-200 flex-1 sm:flex-none min-w-[140px] sm:min-w-0';

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
          <StarOnGithubButton
            showCount={layout !== 'header'}
            variant={layout === 'header' ? 'outline' : 'solid'}
            className={layout === 'header' ? '' : 'flex-1 sm:flex-none min-w-[140px] sm:min-w-0'}
          />

          <button
            type="button"
            onClick={() => window.open('https://www.buymeacoffee.com/aree6', '_blank', 'noopener,noreferrer')}
            className={`${uniformButtonClass} gap-2`}
          >
            <Coffee className="w-4 h-4" />
            <span>Buy Me a Coffee</span>
          </button>

          {primaryMiddleSlot}

          <button
            type="button"
            onClick={() => window.open('https://ko-fi.com/aree6', '_blank', 'noopener,noreferrer')}
            className={`${uniformButtonClass} gap-2`}
          >
            <HeartHandshake className="w-4 h-4" />
            <span>Ko-fi</span>
          </button>

          {primaryRightSlot ? (
            <div className="ml-10 pr-2 shrink-0">
              {primaryRightSlot}
            </div>
          ) : null}
        </div>
      )}

      {showSecondary && (
        <div className={secondaryContainerClass}>
          <button
            type="button"
            onClick={() => window.open('mailto:mohammadar336@gmail.com')}
            className={`${uniformButtonClass} gap-2`}
          >
            <Mail className="w-4 h-4 text-white" />
            <span className="text-white">Email</span>
          </button>

          <button
            type="button"
            onClick={() => window.open('https://github.com/aree6', '_blank', 'noopener,noreferrer')}
            className={`${uniformButtonClass} gap-2`}
          >
            <UserRound className="w-4 h-4 text-white" />
            <span className="text-white">GitHub Profile</span>
          </button>
        </div>
      )}
    </>
  );

  if (layout === 'header') {
    return <div className={className}>{content}</div>;
  }

  return (
    <div className={`mt-6 pt-4 border-t border-slate-800/70 ${className ?? ''}`.trim()}>
      <div className="flex flex-col items-stretch gap-4">
        <div className="flex flex-col items-stretch justify-center gap-3">{content}</div>
      </div>
    </div>
  );
};
