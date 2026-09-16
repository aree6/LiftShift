import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { ArrowUp } from 'lucide-react';
import type { DataSourceChoice } from '../../../utils/storage/dataSourceStorage';
import { useTheme } from '../../theme/ThemeProvider';
import { Navigation } from '../../layout/Navigation';
import PlatformDock from './PlatformDock';
import { ReviewsCarousel } from './ReviewsCarousel';
import { HeroIllustration } from './HeroIllustration';
import LightRays from '../lightRays/LightRays';
import { Flame, CalendarDays, Trophy, BarChart3, Activity, Bone, Scale } from 'lucide-react';
import { FANCY_FONT } from '../../../utils/ui/uiConstants';
import { PopIn } from '../../ui/PopIn';
import { Reveal } from '../../ui/Reveal';
import { assetPath } from '../../../constants';
import lightBgImage from '../../../src/assets/images/misc/light-bg1.avif';
import darkBgImage from '../../../src/assets/images/misc/dark-bg5.avif';

interface LandingPageProps {
  onSelectPlatform: (source: DataSourceChoice) => void;
  onTryDemo?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSelectPlatform, onTryDemo }) => {
  const { mode } = useTheme();
  const isLight = mode === 'light';
  const reduceMotion = useReducedMotion();

  React.useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.showBg = 'true';
    return () => { delete root.dataset.showBg; };
  }, []);

  const [showScrollTop, setShowScrollTop] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Handle scroll to top visibility
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // Check both scrollTop (standard) and if there's any other scroll behavior
      const scrollY = container.scrollTop;
      // Only setState when the threshold actually flips — avoids a render per pixel.
      setShowScrollTop((prev) => (scrollY > 300) !== prev ? scrollY > 300 : prev);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle platform deep link from URL query param
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const platform = params.get('platform');
    if (!platform) return;
    const validPlatforms: DataSourceChoice[] = ['hevy', 'strong', 'lyfta', 'other', 'motra'];
    if (!(validPlatforms as string[]).includes(platform)) return;

    onSelectPlatform(platform as DataSourceChoice);

    params.delete('platform');
    const nextSearch = params.toString();
    const newUrl = window.location.pathname + (nextSearch ? `?${nextSearch}` : '');
    window.history.replaceState(null, '', newUrl);
  }, []);

  const scrollToTop = () => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Platform dock items
  const platformDockItems = [
    {
      name: 'Hevy',
      image: assetPath('/images/brands/hevy_small.webp'),
      onClick: () => onSelectPlatform('hevy'),
      badge: 'Recommended'
    },
    {
      name: 'Strong',
      image: assetPath('/images/brands/Strong_small.webp'),
      onClick: () => onSelectPlatform('strong'),
      badge: 'CSV'
    },
    {
      name: 'Lyfta',
      image: assetPath('/images/brands/lyfta_small.webp'),
      onClick: () => onSelectPlatform('lyfta'),
      badge: 'API'
    },
    {
      name: 'Motra',
      image: assetPath('/images/brands/motra.webp'),
      onClick: () => onSelectPlatform('motra'),
      badge: 'CSV',
      className: 'hidden sm:inline-flex',
    },
    {
      name: 'Other',
      image: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 15 15' fill='none'><rect x='2' y='5' width='12' height='8' fill='%232ea44f'/><path fill-rule='evenodd' clip-rule='evenodd' d='M1 1.5C1 0.671573 1.67157 0 2.5 0H10.7071L14 3.29289V13.5C14 14.3284 13.3284 15 12.5 15H2.5C1.67157 15 1 14.3284 1 13.5V1.5ZM3 5H4.2V7H3V5ZM3.4 5.4H3.8V6.6H3.4V5.4ZM5 5H6.2V5.4H5.8V7H5.4V5.4H5V5ZM7 5H7.4V5.8H8V5H8.4V7H8V6.2H7.4V7H7V5ZM9.2 5H10.4V5.4H9.6V5.8H10.2V6.2H9.6V6.6H10.4V7H9.2V5ZM11 5H12V6H11.5L12.1 7H11.6L11.1 6.1V7H10.7V5H11ZM11.1 5.4V5.7H11.5V5.4H11.1ZM2.5 11H3.5V12H2.5V11ZM4.5 9H6.5V10H5.2V11H6.5V12H4.5V9ZM7.5 9H9.5V10H8.2V10.3H9.5V12H7.5V11H8.8V10.7H7.5V9ZM10.5 9H11.3L11.8 11L12.3 9H13.1L12.2 12H11.4L10.5 9Z' fill='%23000000'/></svg>",
      badge: 'CSV',
      onClick: () => onSelectPlatform('other'),
    },
  ];

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`overflow-y-auto overflow-x-hidden font-sans ${isLight ? 'text-slate-900' : 'text-slate-200'}`}
    >
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

      {/* Light Rays Effect - dark mode only */}
      {!isLight && (
        <div className="fixed inset-0 z-[1] pointer-events-none">
          <LightRays
            raysOrigin="top-center"
            raysColor="#ef4444"
            raysSpeed={0.8}
            lightSpread={1.2}
            rayLength={1.5}
            followMouse={true}
            mouseInfluence={0.08}
            noiseAmount={0.05}
            distortion={0.03}
            fadeDistance={1.2}
            saturation={0.9}
          />
        </div>
      )}
      {/* Navigation */}
      <div className="relative z-10 max-w-6xl mx-auto w-full pt-2">
        <Navigation
          variant="landing"
          className="px-4 sm:px-6 lg:px-8"
        />
      </div>

      {/* ========== HERO SECTION ========== */}
          <section className="relative z-10 flex flex-col pt-2 mb-8 sm:mb-12">
            <div className="max-w-6xl mx-auto w-full">
              {/* Hero Content */}
              <div className="text-center max-w-5xl mx-auto">

                {/* Main Headline */}
                <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight mb-8 mt-10 mr-1 ml-1 leading-[1.15]">
                  <motion.span
                    className={`block ${isLight ? 'text-slate-600' : 'text-slate-400'} text-2xl sm:text-2xl lg:text-3xl xl:text-4xl mb-4`}
                    style={FANCY_FONT}
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
                  >
                    Your workout app logs,
                  </motion.span>
                  <motion.span
                    className="block bg-gradient-to-r from-emerald-300 via-emerald-400 to-green-400 bg-clip-text text-transparent pb-2"
                    style={FANCY_FONT}
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: 0.18 }}
                  >
                    LiftShift answers.
                  </motion.span>
                  <motion.span
                    className={`block ${isLight ? 'text-slate-600' : 'text-slate-400'} text-2xl sm:text-2xl lg:text-3xl xl:text-4xl mt-2`}
                    style={FANCY_FONT}
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: 0.26 }}
                  >
                    Free & open-source.
                  </motion.span>
                </h1>

                {/* Subheadline */}
                <motion.p
                  className={`${isLight ? 'text-slate-600' : 'text-slate-400'} text-base sm:text-lg max-w-2xl mx-auto mb-8 leading-relaxed`}
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: 0.36 }}
                >
                  Connect Hevy, Strong, Lyfta, Motra, or any CSV in seconds. Track training volume, personal records, and exercise progress with interactive muscle heatmaps. Get plateau detection, set-by-set feedback, and AI-ready analysis. All processed on your device, nothing stored on our servers.
                </motion.p>

                {/* Demo CTA Button */}
                {onTryDemo && (
                  <motion.div
                    className="mb-8"
                    initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: 0.46 }}
                  >
                    <button
                      onClick={onTryDemo}
                      className={`group cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-semibold h-11 px-8 border transition-[color,background-color,border-color,translate,scale,box-shadow] duration-200 active:scale-[0.97] hover:-translate-y-px hover:shadow-lg hover:shadow-emerald-500/20 ${isLight ? 'bg-emerald-50/40 hover:bg-emerald-100/50 border-emerald-300/50 text-slate-600 hover:border-emerald-600 hover:text-emerald-600' : 'bg-emerald-950/30 hover:bg-emerald-950/50 border-emerald-400/30 text-slate-400 hover:border-emerald-400 hover:text-emerald-300'}`}
                    >
                      <span>Try it with sample data</span>
                    </button>
                  </motion.div>
                )}
              </div>
            </div>
          </section>

          {/* ========== HERO ILLUSTRATION ========== */}
          <HeroIllustration />

          {/* ========== REVIEWS SECTION ========== */}
          <section id="reviews" className="relative z-10 py-0 sm:py-0">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <ReviewsCarousel />
            </div>
          </section>

          {/* ========== WHY LIFTSHIFT SECTION ========== */}
          <section id="why-liftshift" className="relative z-10 px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-16">
                <h2 className={`text-3xl sm:text-4xl font-bold tracking-tight mb-4 ${isLight ? 'text-slate-900' : 'text-slate-200'}`} style={FANCY_FONT}>
                  <PopIn
                    text="What your workout app doesn't tell you"
                    animateOnView
                    overshoot={1.12}
                  />
                </h2>
                <p className={`max-w-2xl mx-auto text-lg ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Hevy, Strong, Lyfta, and Motra are great at logging. But their built-in charts leave you guessing. LiftShift gives you the answers you actually want.
                </p>
              </div>

              {/* Muscle heatmaps, image: 1.avif */}
              <Reveal variant="pop" className="grid lg:grid-cols-2 gap-12 items-center mb-24">
                <div className="lg:order-2 rounded-2xl overflow-hidden aspect-[1/1]">
                  <img src={assetPath('/images/misc/weeklyset.avif')} alt="LiftShift interactive muscle heatmap with exercise drill-down" loading="lazy" className={`w-full h-full object-contain ${isLight ? 'invert' : ''}`} />
                </div>
                <div className="lg:order-1">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center mb-4">
                    <Flame className="w-5 h-5 text-orange-400" />
                  </div>
                  <h3 className={`text-2xl font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'} mb-3`}><PopIn text="Interactive muscle heatmaps" animateOnView overshoot={1.12} /></h3>
                  <p className={`${isLight ? 'text-slate-600' : 'text-slate-400'} leading-relaxed mb-3`}>
                    Click any muscle to see exactly which exercises built it, with primary and secondary sets weighted separately. Rolling 7-day windows match your body&apos;s real recovery patterns.
                  </p>
                  <p className="text-slate-500 text-sm">
                    Hypertrophy score &middot; Volume zones &middot; Radar chart &middot; Per-muscle drill-down
                  </p>
                </div>
              </Reveal>

              {/* Plateau detection, image: 2.avif */}
              <Reveal variant="pop" className="grid lg:grid-cols-2 gap-12 items-center mb-24">
                <div className="lg:order-1 rounded-2xl overflow-hidden aspect-[4/3]">
                  <img src={assetPath('/images/misc/plateau.avif')} alt="LiftShift exercise status: Getting stronger, Plateauing, Taking a dip" loading="lazy" className={`w-full h-full object-contain ${isLight ? 'invert' : ''}`} />
                </div>
                <div className="lg:order-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center mb-4">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                  </div>
                  <h3 className={`text-2xl font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'} mb-3`}><PopIn text="Plateau detection that actually helps" animateOnView overshoot={1.12} /></h3>
                  <p className={`${isLight ? 'text-slate-600' : 'text-slate-400'} leading-relaxed mb-3`}>
                    Every exercise gets a clear status, Getting stronger, Plateauing, or Taking a dip, with confidence levels. When you&apos;re stuck, LiftShift suggests exactly what to change: add 1 rep, bump 2.5 kg, or deload.
                  </p>
                  <p className="text-slate-500 text-sm">
                    Static vs general plateaus &middot; Per-exercise trend analysis &middot; Evidence badges
                  </p>
                </div>
              </Reveal>

              {/* Set-by-set, image: 5.avif */}
              <Reveal variant="pop" className="grid lg:grid-cols-2 gap-12 items-center mb-24">
                <div className="lg:order-2 rounded-2xl overflow-hidden aspect-[4/3]">
                  <img src={assetPath('/images/misc/setbyset.avif')} alt="LiftShift set-by-set coaching feedback on each set" loading="lazy" className={`w-full h-full object-contain ${isLight ? 'invert' : ''}`} />
                </div>
                <div className="lg:order-1">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center mb-4">
                    <BarChart3 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className={`text-2xl font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'} mb-3`}><PopIn text="Set-by-set coaching feedback" animateOnView overshoot={1.12} /></h3>
                  <p className={`${isLight ? 'text-slate-600' : 'text-slate-400'} leading-relaxed mb-3`}>
                    Open any past workout. LiftShift analyzes every set across 19 scenarios, normal fatigue, premature weight jumps, effective back-off sets, with plain-English badges and improvement suggestions.
                  </p>
                  <p className="text-slate-500 text-sm">
                    19 feedback scenarios &middot; Weight-up/down suggestions &middot; Drop set &amp; AMRAP detection
                  </p>
                </div>
              </Reveal>

              {/* Injury risk, image: injury-risk.avif */}
              <Reveal variant="pop" className="grid lg:grid-cols-2 gap-12 items-center mb-24">
                <div className="lg:order-1 rounded-2xl overflow-hidden aspect-[4/3]">
                  <img src={assetPath('/images/misc/injury-risk.avif')} alt="LiftShift per-joint injury risk scoring card" loading="lazy" className={`w-full h-full object-contain scale-[1.3] ${isLight ? 'invert' : ''}`} />
                </div>
                <div className="lg:order-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center mb-4">
                    <Bone className="w-5 h-5 text-amber-400" />
                  </div>
                  <h3 className={`text-2xl font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'} mb-3`}><PopIn text="Per-joint injury risk" animateOnView overshoot={1.12} /></h3>
                  <p className={`${isLight ? 'text-slate-600' : 'text-slate-400'} leading-relaxed mb-3`}>
                    LiftShift scores every joint from 0 to 100 percent, combining your workload ratio (this week vs. your 4-week average), back-to-back recovery days, and antagonist muscle balance. A spike above 40 is a cue to consider a deload &mdash; a load-management hint, not a diagnosis.
                  </p>
                  <p className="text-slate-500 text-sm">
                    Workload ratio &middot; Recovery days &middot; Antagonist balance &middot; 0-100 risk score
                  </p>
                </div>
              </Reveal>

              {/* Strength imbalance, image: strength-imbalance.avif */}
              <Reveal variant="pop" className="grid lg:grid-cols-2 gap-12 items-center mb-24">
                <div className="lg:order-2 rounded-2xl overflow-hidden aspect-[4/3]">
                  <img src={assetPath('/images/misc/strength-imbalance.avif')} alt="LiftShift strength imbalance trend chart with typical band" loading="lazy" className={`w-full h-full object-contain scale-[1.3] ${isLight ? 'invert' : ''}`} />
                </div>
                <div className="lg:order-1">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center mb-4">
                    <Scale className="w-5 h-5 text-red-400" />
                  </div>
                  <h3 className={`text-2xl font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'} mb-3`}><PopIn text="Strength imbalance detection" animateOnView overshoot={1.12} /></h3>
                  <p className={`${isLight ? 'text-slate-600' : 'text-slate-400'} leading-relaxed mb-3`}>
                    Compares your strength across 13 related exercise pairs &mdash; bench vs. press, rows vs. bench, legs vs. back &mdash; against population statistics. See your weekly trend against the typical band and whether the gap is closing or widening over the last month.
                  </p>
                  <p className="text-slate-500 text-sm">
                    13 ratio pairs &middot; Typical band &middot; Monthly gap trend &middot; A hint, not a diagnosis
                  </p>
                </div>
              </Reveal>

              {/* AI export, image: AI.avif */}
              <Reveal variant="pop" className="grid lg:grid-cols-2 gap-12 items-center mb-24">
                <div className="lg:order-1 rounded-2xl overflow-hidden aspect-[1/1]">
                  <img src={assetPath('/images/misc/AI.avif')} alt="LiftShift AI analysis prompt generator" loading="lazy" className={`w-full h-full object-contain ${isLight ? 'invert' : ''}`} />
                </div>
                <div className="lg:order-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center mb-4">
                    <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a4 4 0 0 0-4 4v1H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3V6a4 4 0 0 0-4-4z"/><path d="M12 11v4"/><path d="M8 11v4"/><path d="M16 11v4"/></svg>
                  </div>
                  <h3 className={`text-2xl font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'} mb-3`}><PopIn text="AI-ready analysis export" animateOnView overshoot={1.12} /></h3>
                  <p className={`${isLight ? 'text-slate-600' : 'text-slate-400'} leading-relaxed mb-3`}>
                    Export your structured training data in one click. Choose from 8 built-in analysis modules, junk volume audit, structural balance, joint health, or write your own prompt. Paste into any AI.
                  </p>
                  <p className="text-slate-500 text-sm">
                    8 analysis modules &middot; Custom prompts &middot; Timeframe selection &middot; Runs in your browser
                  </p>
                </div>
              </Reveal>

              {/* Hypertrophy scatter, image: hypertrophy.avif */}
              <Reveal variant="pop" className="grid lg:grid-cols-2 gap-12 items-center mb-24">
                <div className="lg:order-2 rounded-2xl overflow-hidden aspect-[1/1]">
                  <img src={assetPath('/images/misc/hypertrophy.avif')} alt="LiftShift hypertrophy scatter plot showing volume vs progressive overload by muscle" loading="lazy" className={`w-full h-full object-contain ${isLight ? 'invert' : ''}`} />
                </div>
                <div className="lg:order-1">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center mb-4">
                    <Activity className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className={`text-2xl font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'} mb-3`}><PopIn text="Volume vs progressive overload" animateOnView overshoot={1.12} /></h3>
                  <p className={`${isLight ? 'text-slate-600' : 'text-slate-400'} leading-relaxed mb-3`}>
                    Are you doing enough volume, or just going through the motions? The hypertrophy scatter plot maps every muscle across four quadrants, efficiency zone, optimal growth, neglected, and volume focus, so you see exactly which muscles need more stimulus and which need progressive overload.
                  </p>
                  <p className="text-slate-500 text-sm">
                    Per-muscle scatter plot &middot; 4-zone quadrant analysis &middot; Actionable recommendations
                  </p>
                </div>
              </Reveal>

              {/* Calendar filtering, image: calender.avif */}
              <Reveal variant="pop" className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="lg:order-1 rounded-2xl overflow-hidden aspect-[1/1]">
                  <img src={assetPath('/images/misc/calender.avif')} alt="LiftShift calendar filtering with date range selection and filtered dashboard" loading="lazy" className={`w-full h-full object-contain ${isLight ? 'invert' : ''}`} />
                </div>
                <div className="lg:order-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center mb-4">
                    <CalendarDays className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className={`text-2xl font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'} mb-3`}><PopIn text="Calendar filtering that rebuilds everything" animateOnView overshoot={1.12} /></h3>
                  <p className={`${isLight ? 'text-slate-600' : 'text-slate-400'} leading-relaxed mb-3`}>
                    Pick any date range, last month, all of 2025, a single week. Every chart, metric, and insight recalculates for just that window. Compare training blocks in seconds.
                  </p>
                  <p className="text-slate-500 text-sm">
                    Day / week / month / year selection &middot; Multi-range picker &middot; Instant recalculation
                  </p>
                </div>
              </Reveal>
            </div>
          </section>

          {/* ========== PLATFORM DOCK ========== */}
          <PlatformDock items={platformDockItems} />

      {/* ========== FOOTER ========== */}
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
              <li><a href={assetPath('ai/')} className={`${isLight ? 'text-slate-600 hover:text-emerald-600' : 'text-slate-400 hover:text-emerald-400'} transition-colors duration-200`}>AI reference</a></li>
            </ul>
          </div>
          <div>
            <h3 className={`font-semibold mb-3 ${isLight ? 'text-slate-900' : 'text-white'}`}>Compare</h3>
            <ul className="space-y-2">
              <li><a href={assetPath('hevy-vs-lyfta/')} className={`${isLight ? 'text-slate-600 hover:text-emerald-600' : 'text-slate-400 hover:text-emerald-400'} transition-colors duration-200`}>Hevy vs Lyfta vs Strong</a></li>
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

      {/* Back to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToTop}
            className={`fixed bottom-6 right-6 z-[101] p-3 rounded-full border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-colors shadow-lg backdrop-blur-sm ${isLight ? 'bg-white/80' : 'bg-slate-900/80'}`}
            aria-label="Scroll to top"
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Feature tag component
interface FeatureTagProps {
  icon: React.ReactNode;
  text: string;
}

const FeatureTag: React.FC<FeatureTagProps> = ({ icon, text }) => (
  <span className="inline-flex items-center gap-1.5 text-sm">
    {icon}
    <span>{text}</span>
  </span>
);

export default LandingPage;
