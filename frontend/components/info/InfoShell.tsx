import React from 'react';
import { Navigation } from '../layout/Navigation';
import { PopIn } from '../ui/PopIn';
import { useTheme } from '../theme/ThemeProvider';
import { assetPath } from '../../constants';
import { initGA, trackPageView } from '../../utils/integrations/ga';
import { clientOnly } from 'vike-react/clientOnly';
import lightBgImage from '../../src/assets/images/misc/light-bg1.avif';
import darkBgImage from '../../src/assets/images/misc/dark-bg5.avif';

const LightRays = clientOnly(() => import('../landing/lightRays/LightRays'));
const PlatformDock = clientOnly(() => import('../landing/ui/PlatformDock'));

type InfoShellProps = {
  activeNav?: 'how-it-works' | 'features' | null;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export const InfoShell: React.FC<InfoShellProps> = ({ activeNav = null, title, subtitle, children }) => {
  const { mode } = useTheme();
  const isLight = mode === 'light';

  React.useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.showBg = 'true';
    return () => { delete root.dataset.showBg; };
  }, []);

  // Info/comparison pages previously sent zero analytics (only index + app
  // initialized it) — the entire SEO engine was invisible in PostHog while
  // Search Console shows ~1.6k clicks/yr landing here. Pageview-only;
  // initGA + click capture are double-init guarded. No visual change.
  React.useEffect(() => {
    initGA();
    trackPageView(`${window.location.pathname || '/'}${window.location.search || ''}`);
  }, []);

  const platformDockItems = [
    {
      name: 'Hevy',
      image: assetPath('/images/brands/hevy_small.webp'),
      onClick: () => {
        window.location.assign(assetPath(`/?platform=hevy`));
      },
      badge: 'Recommended',
    },
    {
      name: 'Strong',
      image: assetPath('/images/brands/Strong_small.webp'),
      onClick: () => {
        window.location.assign(assetPath(`/?platform=strong`));
      },
      badge: 'CSV',
    },
    {
      name: 'Lyfta',
      image: assetPath('/images/brands/lyfta_small.webp'),
      onClick: () => {
        window.location.assign(assetPath(`/?platform=lyfta`));
      },
      badge: 'CSV',
    },
    {
      name: 'Motra',
      image: assetPath('/images/brands/motra.webp'),
      onClick: () => {
        window.location.assign(assetPath(`/?platform=motra`));
      },
      badge: 'CSV',
      className: 'hidden sm:inline-flex',
    },
    {
      name: 'Other',
      image:
        "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 15 15' fill='none'><rect x='2' y='5' width='12' height='8' fill='%232ea44f'/><path fill-rule='evenodd' clip-rule='evenodd' d='M1 1.5C1 0.671573 1.67157 0 2.5 0H10.7071L14 3.29289V13.5C14 14.3284 13.3284 15 12.5 15H2.5C1.67157 15 1 14.3284 1 13.5V1.5ZM3 5H4.2V7H3V5ZM3.4 5.4H3.8V6.6H3.4V5.4ZM5 5H6.2V5.4H5.8V7H5.4V5.4H5V5ZM7 5H7.4V5.8H8V5H8.4V7H8V6.2H7.4V7H7V5ZM9.2 5H10.4V5.4H9.6V5.8H10.2V6.2H9.6V6.6H10.4V7H9.2V5ZM11 5H12V6H11.5L12.1 7H11.6L11.1 6.1V7H10.7V5H11ZM11.1 5.4V5.7H11.5V5.4H11.1ZM2.5 11H3.5V12H2.5V11ZM4.5 9H6.5V10H5.2V11H6.5V12H4.5V9ZM7.5 9H9.5V10H8.2V10.3H9.5V12H7.5V11H8.8V10.7H7.5V9ZM10.5 9H11.3L11.8 11L12.3 9H13.1L12.2 12H11.4L10.5 9Z' fill='%23000000'/></svg>",
      onClick: () => {
        window.location.assign(assetPath(`/?platform=other`));
      },
      badge: 'CSV',
    },
  ];

  return (
    <div className={`min-h-screen font-sans ${isLight ? 'text-slate-900' : 'text-white'}`}>
      {/* Background image for light mode */}
      {isLight && (
        <img
          src={lightBgImage}
          alt=""
          aria-hidden="true"
          className="fixed inset-0 w-full h-full object-cover z-[-1] pointer-events-none"
          loading="lazy"
        />
      )}
      {/* Background image for dark mode */}
      {!isLight && (
        <img
          src={darkBgImage}
          alt=""
          aria-hidden="true"
          className="fixed inset-0 w-full h-full object-cover z-[-1] pointer-events-none opacity-10"
          loading="lazy"
        />
      )}
      {/* Light rays - dark mode only */}
      {!isLight && (
        <div className="fixed inset-0 z-[1] pointer-events-none">
          <LightRays
            fallback={null}
            raysOrigin="top-center"
            raysColor="#ef4444"
            raysSpeed={0.75}
            lightSpread={1.2}
            rayLength={1.5}
            followMouse={true}
            mouseInfluence={0.06}
            noiseAmount={0.05}
            distortion={0.03}
            fadeDistance={1.2}
            saturation={0.9}
          />
        </div>
      )}

      {/* Navigation */}
      <div className="relative z-10 mx-auto max-w-6xl w-full pt-2">
        <Navigation variant="info" activeNav={activeNav} className="px-4 sm:px-6 lg:px-8" />
      </div>

      <main className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-8 pb-44">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          <PopIn key={title} text={title} />
        </h1>
        {subtitle ? <p className={`mt-3 ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>{subtitle}</p> : null}
        <div className="mt-8 space-y-7">{children}</div>
      </main>

      <PlatformDock fallback={null} items={platformDockItems} />

      <footer className={`relative z-10 border-t mt-16 px-4 sm:px-6 lg:px-8 py-10 ${isLight ? 'border-black/10' : 'border-white/10'}`}>
        <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 text-sm">
          <div>
            <h3 className={`font-semibold mb-3 ${isLight ? 'text-slate-900' : 'text-white'}`}>Product</h3>
            <ul className="space-y-2">
              <li><a href={assetPath('about/')} className={`${isLight ? 'text-slate-600 hover:text-emerald-600' : 'text-slate-400 hover:text-emerald-400'} transition-colors duration-200`}>About</a></li>
              <li><a href={assetPath('how-it-works/')} className={`${isLight ? 'text-slate-600 hover:text-emerald-600' : 'text-slate-400 hover:text-emerald-400'} transition-colors duration-200`}>How it works</a></li>
              <li><a href={assetPath('features/')} className={`${isLight ? 'text-slate-600 hover:text-emerald-600' : 'text-slate-400 hover:text-emerald-400'} transition-colors duration-200`}>Features</a></li>
              <li><a href={assetPath('faq/')} className={`${isLight ? 'text-slate-600 hover:text-emerald-600' : 'text-slate-400 hover:text-emerald-400'} transition-colors duration-200`}>FAQ</a></li>
            </ul>
          </div>
          <div>
            <h3 className={`font-semibold mb-3 ${isLight ? 'text-slate-900' : 'text-white'}`}>Resources</h3>
            <ul className="space-y-2">
              <li><a href={assetPath('supported-apps/')} className={`${isLight ? 'text-slate-600 hover:text-emerald-600' : 'text-slate-400 hover:text-emerald-400'} transition-colors duration-200`}>Supported apps</a></li>
              <li><a href={assetPath('metrics/')} className={`${isLight ? 'text-slate-600 hover:text-emerald-600' : 'text-slate-400 hover:text-emerald-400'} transition-colors duration-200`}>Metrics glossary</a></li>
              <li><a href={assetPath('hevy-vs-lyfta/')} className={`${isLight ? 'text-slate-600 hover:text-emerald-600' : 'text-slate-400 hover:text-emerald-400'} transition-colors duration-200`}>Hevy vs Lyfta vs Strong</a></li>
              <li><a href={assetPath('ai/')} className={`${isLight ? 'text-slate-600 hover:text-emerald-600' : 'text-slate-400 hover:text-emerald-400'} transition-colors duration-200`}>AI reference</a></li>
            </ul>
          </div>
          <div>
            <h3 className={`font-semibold mb-3 ${isLight ? 'text-slate-900' : 'text-white'}`}>Company</h3>
            <ul className="space-y-2">
              <li><a href={assetPath('privacy/')} className={`${isLight ? 'text-slate-600 hover:text-emerald-600' : 'text-slate-400 hover:text-emerald-400'} transition-colors duration-200`}>Privacy</a></li>
              <li><a href="https://github.com/aree6/LiftShift" target="_blank" rel="noopener noreferrer" className={`${isLight ? 'text-slate-600 hover:text-emerald-600' : 'text-slate-400 hover:text-emerald-400'} transition-colors duration-200`}>GitHub</a></li>
              <li><a href="https://github.com/aree6/LiftShift/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className={`${isLight ? 'text-slate-600 hover:text-emerald-600' : 'text-slate-400 hover:text-emerald-400'} transition-colors duration-200`}>License (AGPL-3.0)</a></li>
            </ul>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <h3 className={`font-semibold mb-3 ${isLight ? 'text-slate-900' : 'text-white'}`}>LiftShift</h3>
            <p className="text-slate-500 leading-relaxed text-xs">
              Free and open source workout analytics. No account needed. Runs locally in your browser.
            </p>
          </div>
        </div>
        <div className={`max-w-6xl mx-auto mt-8 pt-6 border-t text-center text-xs ${isLight ? 'border-black/5 text-slate-500' : 'border-white/5 text-slate-600'}`}>
          &copy; {new Date().getFullYear()} LiftShift. Open source under AGPL-3.0.
        </div>
      </footer>
    </div>
  );
};
