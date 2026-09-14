import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { assetPath } from '../../../constants';
import { useTheme } from '../../theme/ThemeProvider';

const SVG_DIR = '/images/LandingPageSvgAssets';
const BRANDS_DIR = '/images/brands';
const MOCKUPS_DIR = '/images/mockups';

// ============== PLATFORMS ==============
const platforms = [
  { name: 'Hevy',   img: `${BRANDS_DIR}/hevy_small.webp`   },
  { name: 'Strong', img: `${BRANDS_DIR}/Strong_small.webp` },
  { name: 'Lyfta',  img: `${BRANDS_DIR}/lyfta_small.webp`  },
  { name: 'Motra',  img: `${BRANDS_DIR}/motra.webp`        },
  { name: 'CSV',    img: `${SVG_DIR}/csv.svg`                 },
];

// ============== PHONE MOCKUP SCREENSHOTS ==============
const mockupScreenshots = [
  'screenshot-1.avif',
  'screenshot-2.avif',
  'screenshot-3.avif',
  'screenshot-4.avif',
  'screenshot-5.avif',
  'screenshot-6.avif',
];

// ============== SVG PATH DEFINITIONS ==============
// viewBox = "0 0 860 300"
// Coordinate system: (0,0)=top-left, (860,300)=bottom-right, center=(430,150)
// 3 input lines (left platforms → merger at x=395), 1 output line (merger → iPhone)
// Tweak y-starts (second number after M90) to adjust vertical spread.
//
// === DESKTOP PATHS (5 lines, ~53px apart) ===
const desktopInputPaths = [
  'M90 34  C200 34  295 112  395 134',
  'M90 87  C200 87  295 121  395 138',
  'M90 140 C200 140 295 130  395 140',
  'M90 193 C200 193 295 139  395 142',
  'M90 246 C200 246 295 148  395 146',
];
const desktopOutputPath = 'M405 140 C530 115 630 165  775 140';

// === MOBILE PATHS (3 lines, merger shifted left ~42% for narrower screen) ===
const mobileInputPaths = [
  'M90 10  C200 10  270 108  360 132',
  'M90 140 C200 140 270 130  360 140',
  'M90 270 C200 270 270 152  360 148',
];
const mobileOutputPath = 'M370 140 C500 115 620 165  755 140';

// ============== TRAVELING ICONS ==============
// Delays computed for equal spacing: delay_i = i × (duration / count)
const INPUT_DURATION = 10;
const OUTPUT_DURATION = 11;

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

// Shuffled once per page load (not per mount): the illustration remounts on the
// mobile/desktop breakpoint cross (key={isMobile}), and re-dealing icons there
// would visibly reshuffle travelers mid-session.
let cachedInputIcons: string[] | null = null;
let cachedOutputIcons: string[] | null = null;
function getInputIcons(): string[] {
  if (!cachedInputIcons) cachedInputIcons = shuffle(iconSet);
  return cachedInputIcons;
}
function getOutputIcons(): string[] {
  if (!cachedOutputIcons) cachedOutputIcons = shuffle(metricSet);
  return cachedOutputIcons;
}

const iconSet = [
  `${SVG_DIR}/barbell.svg`,
  `${SVG_DIR}/deadlift-emblem.svg`,
  `${SVG_DIR}/dumbbell.svg`,
  `${SVG_DIR}/kettlebell.svg`,
  `${SVG_DIR}/weight-plates.svg`,
  `${SVG_DIR}/treadmill.svg`,
  `${SVG_DIR}/runner.svg`,
  `${SVG_DIR}/running.svg`,
  `${SVG_DIR}/cardio.svg`,
  `${SVG_DIR}/cable-machine.svg`,
  `${SVG_DIR}/gym-machine.svg`,
  `${SVG_DIR}/deadlift.svg`,
  `${SVG_DIR}/ab-crunch.svg`,
  `${SVG_DIR}/chestPress.svg`,
  `${SVG_DIR}/legPress.svg`,
  `${SVG_DIR}/muscle-anatomy2.svg`,
  `${SVG_DIR}/muscle-silhouette.svg`,
  `${SVG_DIR}/bicep.svg`,
  `${SVG_DIR}/strongman.svg`,
  `${SVG_DIR}/grip.svg`,
  `${SVG_DIR}/weighted-run.svg`,
];
const metricSet = [
  `${SVG_DIR}/chart-up.svg`,
  `${SVG_DIR}/bar-chart.svg`,
  `${SVG_DIR}/growth-chart.svg`,
  `${SVG_DIR}/pie-chart.svg`,
  `${SVG_DIR}/trophy1.svg`,
  `${SVG_DIR}/trophy-gold1.svg`,
  `${SVG_DIR}/star-badge.svg`,
  `${SVG_DIR}/medal-necklace.svg`,
  `${SVG_DIR}/medal2.svg`,
];

// ============== SUB-COMPONENTS ==============

function AnimatedSVG({
  isLight,
  inputPaths,
  outputPath,
  iconSize = 20,
}: {
  isLight: boolean;
  inputPaths: string[];
  outputPath: string;
  iconSize?: number;
}) {
  const lineStroke = isLight ? '#cbd5e1' : '#475569';
  // Perpetual SMIL timelines are paused entirely for reduced-motion users.
  const reduceMotion = useReducedMotion();
  // Namespace every SVG id per mount: ids live in the global document scope,
  // so two mounts (StrictMode double-effects, resize remount overlap, future
  // reuse) would otherwise collide and travelers would jump to the wrong path.
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const pathId = (i: number) => `p-in-${uid}-${i}`;
  const outId = `p-out-${uid}`;
  const filterInId = `input-dark-${uid}`;
  const filterGoldLightId = `golden-light-${uid}`;
  const filterGoldDarkId = `golden-dark-${uid}`;

  // ── SVG filters (CSS filter= broken on iOS Safari <image>) ──
  // Dark‑mode input: invert + brighten  (black→white, white→gray)
  // Golden output: replace colour with gold; alpha preserved so strokes stay intact
  const inputFilter = isLight ? undefined : `url(#${filterInId})`;
  const outputFilter = isLight ? `url(#${filterGoldLightId})` : `url(#${filterGoldDarkId})`;

  // ── shuffled icon arrays: dealt once per page load (see module cache) ──
  const inputIcons = React.useMemo(getInputIcons, []);
  const outputIcons = React.useMemo(getOutputIcons, []);

  // ── staggered per‑path phases: each path offset by ½ the icon‑to‑icon gap ──
  // Round‑robin assigns icons to P paths, so gap on same path = P × spacing.
  // Half‑gap stagger: path₁ = 0, path₂ = ½gap, path₃ = gap, …
  const inputPhases = React.useMemo(() => {
    const P = inputPaths.length;
    const halfGap = (P * INPUT_DURATION) / (2 * iconSet.length);
    return Array.from({ length: P }, (_, p) => p * halfGap + Math.random() * halfGap * 0.3);
  }, [inputPaths.length]);
  const outputPhase = React.useMemo(() => Math.random() * OUTPUT_DURATION, []);

  // Freeze the 31 SMIL timelines when scrolled out of view (same IntersectionObserver
  // pattern as LightRays). pauseAnimations() keeps timelines mounted so returning
  // is seamless — no remount jump. The cheap CSS dash is gated by class below.
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [isVisible, setIsVisible] = React.useState(true);
  React.useEffect(() => {
    const el = svgRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) setIsVisible(entry.isIntersecting);
      },
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  React.useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    try {
      if (isVisible) svg.unpauseAnimations();
      else svg.pauseAnimations();
    } catch {
      /* non-SMIL SVG implementations */
    }
  }, [isVisible]);
  const flowPaused = reduceMotion || !isVisible;

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 860 300"
      className="absolute inset-0 w-full h-full pointer-events-none"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {inputPaths.map((d, i) => (
          <path key={`ip${i}`} id={pathId(i)} d={d} />
        ))}
        <path id={outId} d={outputPath} />

        {/* Dark‑mode input icons: invert + brighten (works on iOS Safari) */}
        <filter id={filterInId} color-interpolation-filters="sRGB">
          <feColorMatrix
            type="matrix"
            values="-1 0 0 0 1.5
                     0 -1 0 0 1.5
                     0 0 -1 0 1.5
                     0 0 0 1 0"
          />
        </filter>

        {/* Golden output — light mode: rich golden amber */}
        <filter id={filterGoldLightId} color-interpolation-filters="sRGB">
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.90
                    0 0 0 0 0.58
                    0 0 0 0 0.06
                    0 0 0 1 0"
          />
        </filter>

        {/* Golden output — dark mode: invert + golden */}
        <filter id={filterGoldDarkId} color-interpolation-filters="sRGB">
          <feColorMatrix
            type="matrix"
            result="inv"
            values="-1 0 0 0 1.35
                     0 -1 0 0 1.35
                     0 0 -1 0 1.35
                     0 0 0 1 0"
          />
          <feColorMatrix
            type="matrix"
            in="inv"
            values="0 0 0 0 0.92
                    0 0 0 0 0.62
                    0 0 0 0 0.08
                    0 0 0 1 0"
          />
        </filter>
      </defs>

      <style>{reduceMotion ? '' : `
        @keyframes dash-${uid} { to { stroke-dashoffset: -40; } }
        .flow-line-${uid} { stroke-dasharray: 4 6; animation: dash-${uid} 1.5s linear infinite; }
        .flow-line-slow-${uid} { stroke-dasharray: 4 6; animation: dash-${uid} 2.4s linear infinite; }
      `}</style>

      {/* Dashed connector lines — gentle fade-in so they don't pop under the icons */}
      <motion.g
        stroke={lineStroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
      >
        {inputPaths.map((_, i) => (
          <use key={`u${i}`} href={`#${pathId(i)}`} className={flowPaused ? undefined : (i % 2 === 0 ? `flow-line-${uid}` : `flow-line-slow-${uid}`)} />
        ))}
        <use href={`#${outId}`} className={flowPaused ? undefined : `flow-line-${uid}`} />
      </motion.g>

      {/* Traveling input icons — each path has its own phase offset */}
      {!reduceMotion && inputIcons.map((src, i) => {
        const dur = INPUT_DURATION;
        const spacing = dur / inputIcons.length;
        const pathIdx = i % inputPaths.length;
        const begin = -(i * spacing + inputPhases[pathIdx]);
        return (
          <g key={`ti${i}`} filter={inputFilter}>
            <image href={assetPath(src)} width={iconSize} height={iconSize} x={-iconSize / 2} y={-iconSize / 2}>
              <animate
                attributeName="opacity"
                values="0;1;1;0;0"
                keyTimes="0;0.08;0.8;0.9;1"
                dur={`${dur}s`}
                repeatCount="indefinite"
                begin={`${begin.toFixed(2)}s`}
              />
              <animateMotion
                dur={`${dur}s`}
                repeatCount="indefinite"
                begin={`${begin.toFixed(2)}s`}
              >
                <mpath href={`#${pathId(pathIdx)}`} />
              </animateMotion>
            </image>
          </g>
        );
      })}

      {/* Traveling output icons — golden CSS filter, single output line */}
      {!reduceMotion && outputIcons.map((src, i) => {
        const dur = OUTPUT_DURATION;
        const spacing = dur / outputIcons.length;
        const begin = -(i * spacing + outputPhase);
        return (
          <g key={`to${i}`} filter={outputFilter}>
            <image href={assetPath(src)} width={iconSize} height={iconSize} x={-iconSize / 2} y={-iconSize / 2}>
              <animate
                attributeName="opacity"
                values="0;1;1;0"
                keyTimes="0;0.08;0.85;1"
                dur={`${dur}s`}
                repeatCount="indefinite"
                begin={`${begin.toFixed(2)}s`}
              />
              <animateMotion
                dur={`${dur}s`}
                repeatCount="indefinite"
                begin={`${begin.toFixed(2)}s`}
              >
                <mpath href={`#${outId}`} />
              </animateMotion>
            </image>
          </g>
        );
      })}
    </svg>
  );
}

// ============== PHONE SLIDESHOW ==============

const POSITIONS = [
  { rotate: -10, x: '-25%', scale: 0.88, z: 1 },
  { rotate: 0,   x: '0%',   scale: 1,    z: 3 },
  { rotate: 10,  x: '25%',  scale: 0.88, z: 1 },
];

const spring = { type: 'spring' as const, stiffness: 150, damping: 21, mass: 0.8 };

function PhoneSlideshow() {
  const [images, setImages] = React.useState<number[]>([0, 1, 2]);
  const imagesRef = React.useRef(images);
  const cursorRef = React.useRef(3);
  const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const reduceMotion = useReducedMotion();
  const total = mockupScreenshots.length;

  const startAutoAdvance = React.useCallback(() => {
    if (timerRef.current) return;
    timerRef.current = setInterval(() => {
      const prev = imagesRef.current;
      let next = cursorRef.current % total;
      let attempts = 0;
      while (prev.includes(next) && attempts < total) {
        cursorRef.current += 1;
        next = cursorRef.current % total;
        attempts += 1;
      }
      cursorRef.current += 1;
      const nextImages = [prev[1], prev[2], next];
      imagesRef.current = nextImages;
      setImages(nextImages);
    }, 3000);
  }, [total]);

  const stopAutoAdvance = React.useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  React.useEffect(() => {
    if (total < 3 || reduceMotion) return;
    startAutoAdvance();
    return () => stopAutoAdvance();
  }, [total, reduceMotion, startAutoAdvance, stopAutoAdvance]);

  if (total === 0) return null;

  // With fewer than 3 unique images, use slot-index–based keys so
  // AnimatePresence treats each slot independently instead of
  // fighting over duplicate content keys.
  const getKey = (imgIdx: number, slotIdx: number) =>
    total >= 3 ? imgIdx : `${slotIdx}-${imgIdx}`;

  return (
    <motion.div
      className="absolute inset-y-0 right-0 w-[30%] flex items-center justify-center -translate-y-4 sm:-translate-y-6"
      style={{ perspective: '1200px' }}
      initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: 0.45 }}
      onMouseEnter={stopAutoAdvance}
      onMouseLeave={reduceMotion ? undefined : startAutoAdvance}
    >
      <div className="relative w-[100px] sm:w-[140px] md:w-[180px] h-full flex items-center justify-center">
        <AnimatePresence initial={false}>
          {images.map((imgIdx, slotIdx) => {
            const pos = POSITIONS[slotIdx];
            return (
              <motion.div
                key={getKey(imgIdx, slotIdx)}
                className="absolute w-full"
                style={{ zIndex: pos.z }}
                initial={{ opacity: 0, scale: 0.82, rotate: 22, x: '36%' }}
                animate={{ opacity: 1, scale: pos.scale, rotate: pos.rotate, x: pos.x }}
                exit={{
                  opacity: 0,
                  scale: 0.82,
                  rotate: -18,
                  x: '-26%',
                  transition: { duration: 0.3, ease: 'easeOut' },
                }}
                transition={spring}
              >
                {reduceMotion ? (
                  <img
                    src={assetPath(`${MOCKUPS_DIR}/${mockupScreenshots[imgIdx]}`)}
                    alt="LiftShift dashboard"
                    className="w-full h-auto object-contain drop-shadow-xl"
                    // Center slot is the LCP element: discover + fetch it at high
                    // priority instead of lazy-loading it with the side slots.
                    loading={slotIdx === 1 ? 'eager' : 'lazy'}
                    fetchPriority={slotIdx === 1 ? 'high' : undefined}
                    decoding="async"
                  />
                ) : (
                  <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{
                      duration: 3.5,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: slotIdx * 0.5,
                    }}
                  >
                    <img
                      src={assetPath(`${MOCKUPS_DIR}/${mockupScreenshots[imgIdx]}`)}
                      alt="LiftShift dashboard"
                      className="w-full h-auto object-contain drop-shadow-xl"
                      // Center slot is the LCP element: discover + fetch it at high
                      // priority instead of lazy-loading it with the side slots.
                      loading={slotIdx === 1 ? 'eager' : 'lazy'}
                      fetchPriority={slotIdx === 1 ? 'high' : undefined}
                      decoding="async"
                    />
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export const HeroIllustration: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { mode } = useTheme();
  const isLight = mode === 'light';
  const reduceMotion = useReducedMotion();
  const [isMobile, setIsMobile] = React.useState(true);

  React.useEffect(() => {
    // Same-value guard: without it every resize tick re-renders + reshuffles
    // the slideshow (key={isMobile} remount below).
    const check = () => setIsMobile((prev) => {
      const next = window.innerWidth < 768;
      return prev === next ? prev : next;
    });
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const inputPaths = isMobile ? mobileInputPaths : desktopInputPaths;
  const outputPath = isMobile ? mobileOutputPath : desktopOutputPath;

  return (
    <section className={`relative z-10 px-4 sm:px-6 lg:px-8 pt-12 sm:pt-16 pb-4 ${className}`}>
      <div className="max-w-5xl mx-auto">
        <div className="relative h-[240px] sm:h-[300px] md:h-[380px]">
          {/* SVG layer: connector lines + animated travelers */}
          <AnimatedSVG
            key={isMobile ? 'mobile' : 'desktop'}
            isLight={isLight}
            inputPaths={inputPaths}
            outputPath={outputPath}
            iconSize={isMobile ? 28 : 20}
          />

          {/* ===== LEFT: 5 platform icons ===== */}
          <motion.div
            className="absolute top-0 bottom-0 left-0 flex flex-col justify-center gap-[8px] sm:gap-[12px] md:gap-[15px]"
            initial={reduceMotion ? false : { opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
          >
            {platforms.map((p, i) => (
              <motion.div
                key={p.name}
                className="-translate-y-1 sm:-translate-y-4 flex items-center justify-center w-7 h-7 sm:w-9 sm:h-9 md:w-11 md:h-11"
                initial={reduceMotion ? false : { opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.45 + i * 0.06 }}
              >
                <img
                  src={assetPath(p.img)}
                  alt={p.name}
                  // csv.svg is currentColor (black) with no dark variant — invert it
                  // in dark mode so it doesn't vanish on the dark background.
                  className={`w-5 h-5 sm:w-7 sm:h-7 md:w-9 md:h-9 object-contain rounded-lg ${!isLight && p.name === 'CSV' ? 'invert' : ''}`}
                />
              </motion.div>
            ))}
          </motion.div>

          {/* ===== CENTER: LiftShift logo ===== */}
          <motion.div
            className="absolute top-0 bottom-0 left-[42%] md:left-[46.5%] -translate-x-1/2 flex items-center -translate-y-3"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.65, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex flex-col items-center gap-2 sm:-translate-y-2">
              <img
                src={assetPath('/UI/logo.svg')}
                alt="LiftShift"
                className="w-10 h-10 sm:w-14 sm:h-14 md:w-16 md:h-16 object-contain drop-shadow-md"
              />
            </div>
          </motion.div>

          {/* ===== RIGHT: iPhone slideshow ===== */}
          <PhoneSlideshow />
        </div>
      </div>
    </section>
  );
};

export default HeroIllustration;
