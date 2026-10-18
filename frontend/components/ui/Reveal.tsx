import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { REVEAL_TUNING, type RevealVariant } from './revealTuning';

interface RevealProps {
  className?: string;
  children: React.ReactNode;
  /** Extra delay before the entrance starts (seconds). */
  delay?: number;
  style?: React.CSSProperties;
  id?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  /**
   * 'subtle' (default): short soft fade with a hint of scale, no bounce.
   * For app screens whose cards already move on their own (skeletons,
   * chart draws, count-ups) — the entrance must not compete with them.
   * 'pop': the original pronounced version (scale 0.9, back.out snap).
   * For marketing surfaces like the landing page.
   */
  variant?: RevealVariant;
  /**
   * Set false to render the children immediately, with no entrance.
   *
   * Required for anything inside a HORIZONTAL scroll container (the flex card
   * carousel): `whileInView` measures against the viewport, so a slide parked
   * off to the left/right never intersects and stays at `opacity: 0` until you
   * drag it in — which reads as blank cards while you swipe. Animate the
   * scroller once instead and leave the slides static.
   */
  animate?: boolean;
}

/**
 * Scroll-triggered card entrance.
 * Started from the GSAP reference (scale 0.7, 0.8s, back.out) but deliberately
 * toned down to a whisper: the cards already have plenty of motion of their own
 * (lazy placeholders, chart draws, count-ups), so the entrance is a short soft
 * fade with a hint of scale and NO overshoot bounce — overshoot reads as a
 * second movement when content keeps rendering underneath.
 *
 * - `once: true` + ~20% viewport amount ~= ScrollTrigger `start: "top 85%", once`.
 * - Respects prefers-reduced-motion (renders static content).
 * - Tune values in ./revealTuning.ts (REVEAL_TUNING).
 */

export const Reveal: React.FC<RevealProps> = ({ className, children, delay = 0, style, id, onClick, variant = 'subtle', animate = true }) => {
  const reduceMotion = useReducedMotion();
  const preset = REVEAL_TUNING[variant];

  if (reduceMotion || !animate) {
    return (
      <div className={className} style={style} id={id} onClick={onClick}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      style={style}
      id={id}
      onClick={onClick}
      initial={{ scale: preset.scale, opacity: 0 }}
      whileInView={{ scale: 1, opacity: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: preset.duration, delay, ease: preset.ease }}
    >
      {children}
    </motion.div>
  );
};

export default Reveal;
