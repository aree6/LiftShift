import React from 'react';
import { ThemedBackground } from '../ThemedBackground';
import { Navigation } from '../Navigation';
import { assetPath } from '../../constants';
import { clientOnly } from 'vike-react/clientOnly';

const LightRays = clientOnly(() => import('../landing/LightRays'));
const PlatformDock = clientOnly(() => import('../landing/PlatformDock'));

type InfoShellProps = {
  activeNav?: 'how-it-works' | 'features' | null;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export const InfoShell: React.FC<InfoShellProps> = ({ activeNav = null, title, subtitle, children }) => {
  const platformDockItems = [
    {
      name: 'Hevy',
      image: assetPath('/hevy_small.webp'),
      onClick: () => {
        window.location.assign(assetPath(`/?platform=hevy`));
      },
      badge: 'Recommended',
    },
    {
      name: 'Strong',
      image: assetPath('/Strong_small.webp'),
      onClick: () => {
        window.location.assign(assetPath(`/?platform=strong`));
      },
      badge: 'CSV',
    },
    {
      name: 'Lyfta',
      image: assetPath('/lyfta_small.webp'),
      onClick: () => {
        window.location.assign(assetPath(`/?platform=lyfta`));
      },
      badge: 'CSV',
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
    <div className="min-h-screen bg-[#030712] text-white font-sans">
      <ThemedBackground />

      <div className="fixed inset-0 z-[1] pointer-events-none">
        <LightRays
          fallback={null}
          raysOrigin="top-center"
          raysColor="#10b981"
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

      {/* Navigation */}
      <Navigation variant="info" activeNav={activeNav} className="px-4 sm:px-6 lg:px-8" />

      <main className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-8 pb-44">
        <div className="rounded-3xl border border-white/10 bg-black/25 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.45)] overflow-hidden">
          <div className="p-6 sm:p-8">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{title}</h1>
            {subtitle ? <p className="mt-3 text-slate-300">{subtitle}</p> : null}
            <div className="mt-8 space-y-7">{children}</div>
          </div>
        </div>
      </main>

      <PlatformDock fallback={null} items={platformDockItems} />
    </div>
  );
};
