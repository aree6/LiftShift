import React, { useEffect, useRef, useState } from 'react';

type RootMargin = `${number}px` | `${number}px ${number}px` | `${number}px ${number}px ${number}px` | `${number}px ${number}px ${number}px ${number}px`;

interface LazyRenderProps {
  children: React.ReactNode;
  placeholder?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  rootMargin?: RootMargin;
  threshold?: number;
  once?: boolean;
  preloadPx?: number;
}

export const LazyRender: React.FC<LazyRenderProps> = ({
  children,
  placeholder,
  className,
  style,
  rootMargin = '400px 0px',
  threshold = 0.01,
  once = true,
  preloadPx = 400,
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (typeof window !== 'undefined') {
      const rect = el.getBoundingClientRect();
      const inPreloadBand = rect.top <= window.innerHeight + preloadPx && rect.bottom >= -preloadPx;
      if (inPreloadBand) {
        setVisible(true);
        if (once) return;
      }
    }

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setVisible(true);
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        const hit = entries.some((e) => e.isIntersecting);
        if (!hit) return;
        setVisible(true);
        if (once) obs.disconnect();
      },
      { root: null, rootMargin, threshold }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [once, preloadPx, rootMargin, threshold]);

  return (
    <div ref={ref} className={className} style={style}>
      {visible ? children : placeholder ?? null}
    </div>
  );
};
