import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ArrowBigUp, Reply, Share2, Award } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { useTheme } from '../../theme/ThemeProvider';
import { FANCY_FONT } from '../../../utils/ui/uiConstants';
import { assetPath } from '../../../constants';
import {
  RedditCard,
  SnooAvatar,
  getUpvotes,
  getSubreddit,
  getColor,
  getTimeAgo,
} from './RedditCard';

// ── Data ──
interface ReviewData {
  src: string;
  label: string;
  username: string;
  quote: string;
}

const REVIEWS: ReviewData[] = [
  { src: assetPath('/carousel/7.avif'), label: 'RhubarbArtistic1335: "This is so well made. its simply incredible. Hard to believe your not a Hevy Dev. Lol / Keep it up my man !"' },
  { src: assetPath('/carousel/6.avif'), label: 'suikyo1: "Amazing work, my friend. Some time ago I had suggested that they make Hevy\'s home page very similan to what you did. It turned out really good. That part of the exercises showing which ones you\'re in overload and which ones you\'re in plateau is amazing, very well done."' },
  { src: assetPath('/carousel/4.avif'), label: 'marlon1310: "Oh wow. I didn\'t even realize you built it. I thought you were just sharing it. / Crazy stuff bro!! / Post it in hevy subreddit, I\'m sure there\'s so many people who\'d benefit from this."' },
  { src: assetPath('/carousel/11.avif'), label: '_Calegos: "Wow, simply wow! Finally a project that I find easy to use, no mandatory usage of api key or login (bless you for CSV import!), not yet tested the AI analyze but nonetheless this app is so cool, starred in an instant. / Other than that, kudos!"' },
  { src: assetPath('/carousel/10.avif'), label: 'cipherninjabyte: "This is outstanding.. it decoded my hevy app data and gave me nice suggestions."' },
  { src: assetPath('/carousel/14.avif'), label: 'JustOneNodeOfMany: "Excellent app, just what I have been waiting for and dreaming about, especially being able to see the exercise history easily. I love the way it throws up warnings re plateaus, etc. / Awesome app, thank you for developing."' },
  { src: assetPath('/carousel/1.avif'), label: 'WearyStatus3898: "keep it up man. Insane work. I loved the ui and also the theme."' },
  { src: assetPath('/carousel/2.avif'), label: 'harshhat18: "Bro this shit is crazy!!!! Now off to spend my next hour analysing my workouts on liftshift"' },
  { src: assetPath('/carousel/5.avif'), label: 'marlon1310: "I just tried it for a minute. This is damn amazing OP!!! I bought Hevy premium at Black Friday sale for the advanced analytics but even that doesn\'t do a good of a job like this app does. / For someone obsessed with numbers, this is a blessing!!!! / Blessing you with a lot of gains!!"' },
  { src: assetPath('/carousel/8.avif'), label: 'Rasphy_2009: "This is so useful!! Thank you for your hard work. I\'m definitely going to use it a lot"' },
  { src: assetPath('/carousel/12.avif'), label: 'wakaokami: "A good initiative and a great way to visualize progress. 🙌 / I was just wondering how you\'re handling passwords for the login feature, and how you\'re ensuring user privacy. / I haven\'t had time to go through the code yet, but I\'d like to contribute as well."' },
  { src: assetPath('/carousel/3.avif'), label: 'malicious08: "This is crazy bhai!"' },
  { src: assetPath('/carousel/9.avif'), label: 'Constant_play0: "Super cool! Thanks a lot for this"' },
  { src: assetPath('/carousel/15.avif'), label: '1AML3G10N: "Just checked this out. Excellent work!"' },
  { src: assetPath('/carousel/13.avif'), label: 'Conflicted_Gemini: "Look man. I don\'t need an analytical tool to tell me I\'ve beg lazy this week 😂😂😂"' },
  { src: assetPath('/carousel/16.avif'), label: 'Illustrious-Tear-542: "Very nice analytics."' },
].map((r) => {
  const match = r.label.match(/^(.+?):\s*"(.*)"$/);
  return {
    ...r,
    username: match ? match[1] : r.label,
    quote: match ? match[2] : r.label,
  };
});

const ROWS_DESKTOP = [REVIEWS.slice(0, 6), REVIEWS.slice(6, 11), REVIEWS.slice(11)];
const ROWS_MOBILE = [REVIEWS.slice(0, 8), REVIEWS.slice(8)];

// Stable no-op: desktop inner cards aren't interactive (the outer wrapper owns
// the button semantics), and a module-level fn keeps RedditCard's memo intact.
const noopFlip = (_id: string) => {};

// ── Types ──
interface ExpandedCardState {
  review: ReviewData;
  id: string;
  originalRect: DOMRect;
  containerRect: DOMRect;
}

// ── Marquee Row ──
function MarqueeRow({
  direction,
  items,
  isLight,
  speed = 40,
  expandedCardId,
  isPaused,
  onExpand,
  isMobile,
  flippedId,
  onFlip,
  isClosing,
}: {
  direction: 'left' | 'right';
  items: ReviewData[];
  isLight: boolean;
  speed?: number;
  expandedCardId: string | null;
  isPaused: boolean;
  onExpand: (id: string, review: ReviewData, rect: DOMRect) => void;
  isMobile: boolean;
  flippedId: string | null;
  onFlip: (id: string) => void;
  isClosing: boolean;
}) {
  const uid = useRef(`mq-${Math.random().toString(36).slice(2, 8)}`).current;
  const from = direction === 'left' ? '0' : '-50';
  const to = direction === 'left' ? '-50' : '0';
  const duration = `${Math.max(30, 110 - speed)}s`;
  const reduceMotion = useReducedMotion();

  // Pause everything when the row scrolls out of view (rAF loop + CSS below).
  const rootRef = useRef<HTMLDivElement>(null);
  const [rowVisible, setRowVisible] = useState(true);
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) setRowVisible(entry.isIntersecting);
      },
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Mobile auto-scroll state
  const scrollRef = useRef<HTMLDivElement>(null);
  const isInteractingRef = useRef(false);
  const accumulatedRef = useRef(0);
  const lastTsRef = useRef(0);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleUpRef = useRef<(() => void) | null>(null);

  const syncAccumulated = () => {
    const el = scrollRef.current;
    if (!el) return;
    const halfWidth = el.scrollWidth / 2;
    if (halfWidth <= 0) return;
    accumulatedRef.current =
      ((el.scrollLeft % halfWidth) + halfWidth) % halfWidth;
    lastTsRef.current = performance.now();
  };

  const onStartInteraction = () => {
    isInteractingRef.current = true;
    if (resumeTimerRef.current) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }

    if (handleUpRef.current) {
      document.removeEventListener('pointerup', handleUpRef.current);
      document.removeEventListener('pointercancel', handleUpRef.current);
    }

    const handleUp = () => {
      document.removeEventListener('pointerup', handleUp);
      document.removeEventListener('pointercancel', handleUp);
      handleUpRef.current = null;
      resumeTimerRef.current = setTimeout(() => {
        isInteractingRef.current = false;
        syncAccumulated();
        resumeTimerRef.current = null;
      }, 1000);
    };
    handleUpRef.current = handleUp;
    document.addEventListener('pointerup', handleUp);
    document.addEventListener('pointercancel', handleUp);
  };

  useEffect(() => {
    return () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      if (handleUpRef.current) {
        document.removeEventListener('pointerup', handleUpRef.current);
        document.removeEventListener('pointercancel', handleUpRef.current);
      }
    };
  }, []);

  // Cache half the track width (measure once + on resize) — reading
  // scrollWidth inside the rAF tick forced layout 60×/s per row.
  const halfWidthRef = useRef(0);
  useEffect(() => {
    if (!isMobile) return;
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => {
      const hw = el.scrollWidth / 2;
      if (hw > 0) halfWidthRef.current = hw;
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isMobile, items.length]);

  useEffect(() => {
    if (!isMobile || reduceMotion || !rowVisible) return;
    const el = scrollRef.current;
    if (!el) return;
    let rafId = 0;
    lastTsRef.current = performance.now();
    const pxPerSec = 30;
    const dir = direction === 'left' ? 1 : -1;

    const halfWidth = halfWidthRef.current || el.scrollWidth / 2;
    if (halfWidth > 0 && dir === -1) {
      accumulatedRef.current = halfWidth;
    }
    el.scrollLeft = accumulatedRef.current;

    const tick = (ts: number) => {
      if (!isInteractingRef.current) {
        const hw = halfWidthRef.current;
        if (hw > 0) {
          const dt = (ts - lastTsRef.current) / 1000;
          lastTsRef.current = ts;
          accumulatedRef.current += dir * pxPerSec * dt;
          if (accumulatedRef.current >= hw) {
            accumulatedRef.current -= hw;
          } else if (accumulatedRef.current < 0) {
            accumulatedRef.current += hw;
          }
          el.scrollLeft = accumulatedRef.current;
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isMobile, direction, rowVisible, reduceMotion]);

  const expandFromTarget = (target: HTMLElement, review: ReviewData) => {
    const rect = target.getBoundingClientRect();
    onExpand(review.src, review, rect);
  };

  const card = (review: ReviewData, key: string, isClone = false) => {
    if (isMobile) {
      return (
        <div key={key} className="mx-2 sm:mx-3 shrink-0">
          <RedditCard
            username={review.username}
            quote={review.quote}
            src={review.src}
            isLight={isLight}
            cardId={key}
            isFlipped={flippedId === key}
            onFlip={onFlip}
            focusable={!isClone}
          />
        </div>
      );
    }

    const isHidden =
      expandedCardId !== null &&
      (key === expandedCardId || key === `${expandedCardId}-clone`);

    const cardStyle: React.CSSProperties = isHidden
      ? { opacity: 0, pointerEvents: 'none' }
      : isClosing
        ? { opacity: 1, transition: 'opacity 100ms ease 200ms' }
        : { opacity: 1 };

    // Clones are duplicates: hidden from AT + out of tab order so each review
    // is met once. The expanded (invisible) card leaves tab order too.
    const untabbable = isClone || isHidden;

    return (
      <div
        key={key}
        className="mx-2 sm:mx-3 shrink-0"
        style={cardStyle}
        role="button"
        tabIndex={untabbable ? -1 : 0}
        aria-hidden={isClone || undefined}
        aria-label={`Expand review from ${review.username}`}
        onClickCapture={(e) => {
          e.stopPropagation();
          expandFromTarget(e.currentTarget, review);
        }}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          e.preventDefault();
          e.stopPropagation();
          expandFromTarget(e.currentTarget, review);
        }}
      >
        <RedditCard
          username={review.username}
          quote={review.quote}
          src={review.src}
          isLight={isLight}
          cardId={key}
          isFlipped={false}
          onFlip={noopFlip}
          interactive={false}
        />
      </div>
    );
  };

  // Reduced motion: a plain natively-scrollable row, no rAF loop.
  // (Single set — clones only exist to make the loop seamless.)
  if (isMobile && reduceMotion) {
    return (
      <div ref={rootRef} className="relative overflow-hidden">
        <div
          className="overflow-x-auto overflow-y-hidden"
          style={{
            scrollPaddingLeft: '0.5rem',
            touchAction: 'pan-x',
          }}
        >
          <div className="flex w-max py-1">
            {items.map((r, i) => card(r, `${r.src}-${i}`))}
          </div>
        </div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div ref={rootRef} className="relative overflow-hidden">
        <div
          ref={scrollRef}
          className="overflow-x-auto overflow-y-hidden"
          onPointerDown={onStartInteraction}
          style={{
            scrollPaddingLeft: '0.5rem',
            touchAction: 'pan-x',
          }}
        >
          {/* No trailing padding: the wrap point is exactly half the track,
              so any asymmetry shows up as a jump every loop. */}
          <div className="flex w-max py-1">
            {items.map((r, i) => card(r, `${r.src}-${i}`))}
            {items.map((r, i) => card(r, `${r.src}-clone-${i}`, true))}
          </div>
        </div>
      </div>
    );
  }

  // Reduced motion: static row, no keyframes at all.
  if (reduceMotion) {
    return (
      <div ref={rootRef} className="relative overflow-hidden">
        <div className="flex w-max py-1">
          {items.map((r) => card(r, r.src))}
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative overflow-hidden">
      <style>{`
        @keyframes ${uid} {
          0%   { transform: translate3d(${from}%, 0, 0); }
          100% { transform: translate3d(${to}%, 0, 0); }
        }
        .${uid} {
          display: flex;
          width: fit-content;
          animation: ${uid} ${duration} linear infinite;
          backface-visibility: hidden;
        }
        .${uid}:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div
        className={uid}
        style={isPaused || !rowVisible ? { animationPlayState: 'paused' } : undefined}
      >
        {items.map((r) => card(r, r.src))}
        {items.map((r) => card(r, `${r.src}-clone`, true))}
      </div>
    </div>
  );
}

// ── Expanded Card Overlay ──
const ExpandedCardOverlay: React.FC<{
  expandedCard: ExpandedCardState;
  isLight: boolean;
  onClose: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}> = ({ expandedCard, isLight, onClose, containerRef }) => {
  const { review, originalRect, containerRect } = expandedCard;
  const reduceMotion = useReducedMotion();
  // Re-render on window resize so the card re-centers instead of freezing mid-air.
  const [win, setWin] = useState(0);
  useEffect(() => {
    const onResize = () => setWin((w) => w + 1);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const { targetLeft, targetTop, expandedWidth, expandedHeight } =
    useMemo(() => {
      // Live rect when available (identical values on first render), so resize
      // recomputes from truth instead of a stale snapshot.
      const live = containerRef.current?.getBoundingClientRect() ?? containerRect;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const scaleX = (vw * 0.6) / originalRect.width;
      const scaleY = (vh * 0.65) / originalRect.height;
      const s = Math.max(1.6, Math.min(scaleX, scaleY, 2.5));
      const ew = originalRect.width * s;
      const eh = originalRect.height * s;
      const cx = live.left + live.width / 2;
      const cy = live.top + live.height / 2;
      return {
        targetLeft: cx - ew / 2,
        targetTop: cy - eh / 2,
        expandedWidth: ew,
        expandedHeight: eh,
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [originalRect, containerRect, containerRef, win]);

  const upvotes = useMemo(() => getUpvotes(review.username), [review.username]);
  const subreddit = useMemo(
    () => getSubreddit(review.username, review.quote),
    [review.username, review.quote],
  );
  const color = useMemo(() => getColor(review.username), [review.username]);
  const timeAgo = useMemo(
    () => getTimeAgo(review.username),
    [review.username],
  );

  const expandedFaceClass = isLight
    ? 'bg-white/35 shadow-lg'
    : 'bg-black/35 shadow-lg shadow-black/40';

  return createPortal(
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.3 }}
        className="fixed inset-0 z-[100] bg-black/70"
        onClick={onClose}
      />

      {/* Expanded card */}
      <motion.div
        initial={{
          position: 'fixed',
          left: originalRect.left,
          top: originalRect.top,
          width: originalRect.width,
          height: originalRect.height,
          rotateY: 0,
          zIndex: 101,
        }}
        animate={{
          left: targetLeft,
          top: targetTop,
          width: expandedWidth,
          height: expandedHeight,
          rotateY: 180,
        }}
        exit={{
          left: originalRect.left,
          top: originalRect.top,
          width: originalRect.width,
          height: originalRect.height,
          rotateY: 0,
          opacity: 0,
          transition: {
            opacity: { duration: 0.1, delay: 0.2 },
            default: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
          },
        }}
        transition={{ duration: reduceMotion ? 0 : 0.55, ease: [0.34, 1.56, 0.64, 1] }}
        style={{
          perspective: '1200px',
          transformStyle: 'preserve-3d',
          pointerEvents: 'none',
        }}
      >
        {/* ── Front face: Reddit comment ── */}
        <div
          className={`absolute inset-0 rounded-xl flex flex-col px-4 py-3.5 gap-2 overflow-hidden ${expandedFaceClass}`}
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="flex items-center gap-1.5 text-xs sm:text-sm">
            <SnooAvatar color={color} size={20} />
            <span
              className={`font-medium ${isLight ? 'text-black/80' : 'text-neutral-200'}`}
            >
              r/{subreddit}
            </span>
            <span className={isLight ? 'text-slate-400' : 'text-neutral-600'}>
              ·
            </span>
            <span className={isLight ? 'text-slate-500' : 'text-neutral-500'}>
              u/{review.username}
            </span>
            <span className={isLight ? 'text-slate-400' : 'text-neutral-600'}>
              ·
            </span>
            <span className={isLight ? 'text-slate-400' : 'text-neutral-500'}>
              {timeAgo}
            </span>
          </div>

          <p
            className={`flex-1 text-sm sm:text-base leading-relaxed ${isLight ? 'text-slate-800' : 'text-neutral-300'}`}
          >
            {review.quote.split(' / ').map((part, i) => (
              <React.Fragment key={i}>
                {i > 0 && <br />}
                {part}
              </React.Fragment>
            ))}
          </p>

          <div className="flex items-center gap-1.5 text-xs sm:text-sm">
            <ArrowBigUp
              className="w-4 h-4 text-[#FF4500]"
              fill="#FF4500"
            />
            <span
              className={`font-bold tabular-nums -ml-0.5 ${isLight ? 'text-slate-700' : 'text-neutral-400'}`}
            >
              {upvotes}
            </span>
            <span
              className={`ml-auto flex items-center gap-1 ${isLight ? 'text-slate-400' : 'text-neutral-600'}`}
            >
              <Reply className="w-3.5 h-3.5" />
              Reply
            </span>
            <span
              className={`flex items-center gap-1 ${isLight ? 'text-slate-400' : 'text-neutral-600'}`}
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </span>
            <span
              className={`flex items-center gap-1 ${isLight ? 'text-slate-400' : 'text-neutral-600'}`}
            >
              <Award className="w-3.5 h-3.5" />
              Award
            </span>
          </div>
        </div>

        {/* ── Back face: screenshot ── */}
        <div
          className={`absolute inset-0 rounded-xl overflow-hidden ${expandedFaceClass}`}
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <img
            src={review.src}
            alt={`Screenshot of ${review.username}'s Reddit comment`}
            className="w-full h-full object-contain p-4"
            draggable={false}
            loading="lazy"
            decoding="async"
          />
        </div>

      </motion.div>
    </>,
    document.body,
  );
};

// ── Main component ──
export const ReviewsCarousel: React.FC<{ className?: string }> = ({
  className = '',
}) => {
  const { mode } = useTheme();
  const isLight = mode === 'light';
  const [isMobile, setIsMobile] = useState(false);
  const [expandedCard, setExpandedCard] = useState<ExpandedCardState | null>(
    null,
  );
  const [isMarqueePaused, setIsMarqueePaused] = useState(false);
  const [flippedId, setFlippedId] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const expandedCardRef = useRef(expandedCard);
  expandedCardRef.current = expandedCard;

  // Scroll lock while expanded
  useEffect(() => {
    if (!expandedCard) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // The landing page scrolls in an inner overflow container, not <body> —
    // walk up to the real scroller and freeze it too.
    let scroller: HTMLElement | null = containerRef.current?.parentElement ?? null;
    while (scroller) {
      if (scroller.scrollHeight > scroller.clientHeight + 1) break;
      scroller = scroller.parentElement;
    }
    if (scroller && scroller.scrollHeight <= scroller.clientHeight + 1) scroller = null;
    const prevScrollerOverflow = scroller?.style.overflow;
    if (scroller) scroller.style.overflow = 'hidden';

    const preventScroll = (e: WheelEvent | TouchEvent) => e.preventDefault();
    // Keyboard scroll (Space/arrows/PageUp/PageDown) bypasses wheel/touch guards.
    const preventKeys = (e: KeyboardEvent) => {
      if ([' ', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key)) {
        e.preventDefault();
      }
    };
    document.addEventListener('wheel', preventScroll, { passive: false });
    document.addEventListener('touchmove', preventScroll, { passive: false });
    document.addEventListener('keydown', preventKeys);
    return () => {
      document.body.style.overflow = prevOverflow;
      if (scroller && prevScrollerOverflow !== undefined) scroller.style.overflow = prevScrollerOverflow;
      document.removeEventListener('wheel', preventScroll);
      document.removeEventListener('touchmove', preventScroll);
      document.removeEventListener('keydown', preventKeys);
    };
  }, [expandedCard]);

  // Pause marquee when any card is expanded
  useEffect(() => {
    if (expandedCard !== null) {
      setIsMarqueePaused(true);
    }
  }, [expandedCard]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const update = (e: MediaQueryListEvent | MediaQueryList) =>
      setIsMobile(e.matches);
    update(mq);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const rows = isMobile ? ROWS_MOBILE : ROWS_DESKTOP;

  const handleExpand = useCallback(
    (id: string, review: ReviewData, rect: DOMRect) => {
      setExpandedCard((prev) => {
        if (prev?.id === id) return null;
        const container = containerRef.current;
        if (!container) return prev;
        const containerRect = container.getBoundingClientRect();
        return { review, id, originalRect: rect, containerRect };
      });
    },
    [],
  );

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setExpandedCard(null);
  }, []);

  const handleFlip = useCallback((id: string) => {
    setFlippedId((prev) => (prev === id ? null : id));
  }, []);

  const handleExitComplete = useCallback(() => {
    if (!expandedCardRef.current) {
      setIsMarqueePaused(false);
      setIsClosing(false);
    }
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Header section */}
      <section
        className="mb-9"
        aria-label="User reviews of LiftShift from Reddit"
      >
        <h2 className="sr-only">LiftShift reviews from Reddit users</h2>
        <ul className="sr-only">
          {REVIEWS.map((review, i) => (
            <li key={i}>
              <blockquote>
                <p>{review.label}</p>
              </blockquote>
            </li>
          ))}
        </ul>

        <div className="text-center">
          
          <h2
            className={`text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4 ${isLight ? 'text-slate-900' : ''}`}
          >
            Loved by{' '}
            <span className="text-emerald-400" style={FANCY_FONT}>
              Lifters
            </span>{' '}
            Worldwide
          </h2>
          <p
            className={`text-lg max-w-2xl mx-auto ${isLight ? 'text-slate-600' : 'text-slate-400'}`}
          >
            See what the fitness community is saying about LiftShift on Reddit
          </p>
        </div>
      </section>

      {/* Full-width marquee */}
      <div
        className="relative"
        style={{
          width: '100vw',
          marginLeft: 'calc(-50vw + 50%)',
          maskImage:
            'linear-gradient(to right, transparent, black 18vw, black 82vw, transparent)',
          WebkitMaskImage:
            'linear-gradient(to right, transparent, black 18vw, black 82vw, transparent)',
        }}
      >
        <div className="space-y-3 sm:space-y-4">
          {rows.map((row, i) => (
            <MarqueeRow
              key={i}
              direction={i % 2 === 0 ? 'left' : 'right'}
              isLight={isLight}
              speed={25 + i * 5}
              items={row}
              expandedCardId={expandedCard?.id ?? null}
              isPaused={isMarqueePaused}
              onExpand={handleExpand}
              isMobile={isMobile}
              flippedId={flippedId}
              onFlip={handleFlip}
              isClosing={isClosing}
            />
          ))}
        </div>
      </div>

      {/* Expanded card overlay — desktop only */}
      {!isMobile && (
        <AnimatePresence onExitComplete={handleExitComplete}>
          {expandedCard && (
            <ExpandedCardOverlay
              key={expandedCard.id}
              expandedCard={expandedCard}
              isLight={isLight}
              onClose={handleClose}
              containerRef={containerRef}
            />
          )}
        </AnimatePresence>
      )}
    </div>
  );
};

export default ReviewsCarousel;
