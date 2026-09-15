import React, { useEffect, useRef, useState } from 'react';

/** Fires once when the wrapped card scrolls into view — drives the rubber-stamp slam. */
export function useStamped(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [hit, setHit] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setHit(true);
      return;
    }
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setHit(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setHit(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, hit };
}

/** Rubber stamp: drops from big + lifted to its resting rotation with an overshoot ease. */
export function stampAnim(
  hit: boolean,
  base: { rotate: number; opacity: number; y?: string },
  delay: number,
): React.CSSProperties {
  const t = `${base.y ? `${base.y} ` : ''}rotate(${hit ? base.rotate : base.rotate - 16}deg) scale(${hit ? 1 : 2.6})`;
  return {
    opacity: hit ? base.opacity : 0,
    transform: t,
    transition: hit
      ? `opacity 140ms ease-out ${delay}ms, transform 240ms cubic-bezier(0.2, 1.5, 0.35, 1) ${delay}ms`
      : 'none',
  };
}

/**
 * Whole-sheet aging: fine grain + large soft blotches laid over everything.
 * Gentle by design — it patinas the paper without eating the text.
 * Apply with style={{ filter: 'url(#id)' }} on the sheet wrapper.
 */
export const PaperAgeDefs: React.FC<{ id: string }> = ({ id }) => (
  <svg aria-hidden="true" width={0} height={0} style={{ position: 'absolute' }}>
    <defs>
      <filter id={id} x="0%" y="0%" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={5} result="fine" />
        <feColorMatrix
          in="fine"
          type="matrix"
          values="0 0 0 0 0.2  0 0 0 0 0.16  0 0 0 0 0.1  0 0 0 0.6 0"
          result="grain"
        />
        <feTurbulence type="fractalNoise" baseFrequency="0.012 0.016" numOctaves="3" seed={9} result="blotch" />
        <feColorMatrix
          in="blotch"
          type="matrix"
          values="0 0 0 0 0.25  0 0 0 0 0.19  0 0 0 0 0.1  0 0 0 0.55 0"
          result="stain"
        />
        <feComposite in="SourceGraphic" in2="grain" operator="arithmetic" k1="0" k2="1" k3="0.45" k4="0" result="grained" />
        <feComposite in="grained" in2="stain" operator="arithmetic" k1="0" k2="1" k3="0.4" k4="0" />
      </filter>
    </defs>
  </svg>
);

/**
 * Letterpress brand mark: uneven inking with fewer dropouts than a rubber
 * stamp, so the logo stays readable while looking pressed, not printed.
 */
export const LogoPressDefs: React.FC<{ id: string; seed?: number }> = ({ id, seed = 21 }) => (
  <svg aria-hidden="true" width={0} height={0} style={{ position: 'absolute' }}>
    <defs>
      <filter id={id} x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.45" numOctaves="3" seed={seed} result="n" />
        <feColorMatrix
          in="n"
          type="matrix"
          values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.85 0.85 0.85 0 -0.42"
          result="speck"
        />
        <feComposite in="SourceGraphic" in2="speck" operator="in" result="inked" />
        <feDisplacementMap in="inked" in2="n" scale="1.8" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </defs>
  </svg>
);
export const StampGrungeDefs: React.FC<{ id: string; seed?: number }> = ({ id, seed = 11 }) => (
  <svg aria-hidden="true" width={0} height={0} style={{ position: 'absolute' }}>
    <defs>
      <filter id={id} x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="4" seed={seed} result="n" />
        <feColorMatrix
          in="n"
          type="matrix"
          values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.9 0.9 0.9 0 -0.55"
          result="speck"
        />
        <feComposite in="SourceGraphic" in2="speck" operator="in" result="inked" />
        <feDisplacementMap in="inked" in2="n" scale="2.4" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </defs>
  </svg>
);
