import React from 'react';
import StarOnGithubButton from './StarOnGithubButton';
import { Coffee, HeartHandshake, Mail, UserRound } from 'lucide-react';
import { UNIFORM_FOOTER_BUTTON_CLASS, UNIFORM_HEADER_BUTTON_CLASS } from '../utils/ui/uiConstants';

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
