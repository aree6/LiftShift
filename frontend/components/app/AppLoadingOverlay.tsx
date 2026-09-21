import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { SEMI_FANCY_FONT } from '../../utils/ui/uiConstants';
// Deep imports: the csvImport barrel also re-exports CSVImportModal, which must
// not ride along in the boot chunk. The dotlottie player is lazy (CSV-only path).
import { PuzzleLoadingAnimation } from '../modals/csvImport/PuzzleLoadingAnimation';

const CsvLoadingAnimation = lazy(() =>
  import('../modals/csvImport/CsvLoadingAnimation').then((m) => ({
    default: m.CsvLoadingAnimation,
  }))
);

// Degrade gracefully if the animation chunk fails (CDN/stale deploy):
// a blank boot screen is worse than no animation.
class CsvAnimationErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  componentDidCatch(): void {
    // Intentionally silent — the overlay messages already explain the wait.
  }
  render(): React.ReactNode {
    if (this.state.failed) {
      return <div className="mb-6" style={{ width: 160, height: 160 }} />;
    }
    return this.props.children;
  }
}

interface AppLoadingOverlayProps {
  open: boolean;
  isCompleting: boolean;
  onReload?: () => void;
}

// Shown only as a last-resort fallback: normal logins (even cold captcha
// ones) resolve well before this, so firing earlier just cries wolf on
// every login and teaches users to hit reload mid-sync.
const SLOW_LOAD_THRESHOLD_MS = 40 * 1000;

// Single message pool - no phases
const LOADING_MESSAGES = [
  'Warming things up...',
  'Starting services...',
  'Setting up your space...',
  'Preparing the environment...',
  'Loading settings...',
  'Connecting to servers...',
  'Establishing a secure connection...',
  'Requesting your data...',
  'Fetching workout history...',
  'Downloading workout records...',
  'Receiving your workouts...',
  'Processing sets and reps...',
  'Syncing everything...',
  'Building your dashboard...',
  'Creating charts and visuals...',
  'Generating insights...',
  'Preparing workout views...',
  'Calculating display data...',
  'Rendering the interface...',
  'Final touches...',
  'Solving Captcha for you...',
  'Almost ready...',
];

const ROW_HEIGHT = 36;
const VISIBLE_COUNT = 4;
const INTERVAL_MS = 400;
const SLIDE_MS = 100;
const INITIAL_DELAY_MS = 150;

const getVisibleMessages = (baseIndex: number, isCompleting: boolean) => {
  const messages = [] as Array<{
    text: string;
    state: 'completed' | 'active' | 'pending';
    key: string;
  }>;

  const completedCount = isCompleting ? VISIBLE_COUNT : Math.min(2, baseIndex);

  for (let offset = 0; offset < VISIBLE_COUNT; offset++) {
    const msgIndex = baseIndex + offset;
    if (msgIndex >= LOADING_MESSAGES.length) break;
    let state: 'completed' | 'active' | 'pending';
    if (offset < completedCount) state = 'completed';
    else if (offset === completedCount) state = 'active';
    else state = 'pending';

    messages.push({
      text: LOADING_MESSAGES[msgIndex],
      state,
      key: `${msgIndex}-${LOADING_MESSAGES[msgIndex]}`,
    });
  }

  return messages;
};

export const AppLoadingOverlay: React.FC<AppLoadingOverlayProps> = ({
  open,
  isCompleting,
  onReload,
}) => {
  const [baseIndex, setBaseIndex] = useState(0);
  const [slideOffset, setSlideOffset] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showSlowLoadMessage, setShowSlowLoadMessage] = useState(false);
  const slowLoadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) {
      setBaseIndex(0);
      setSlideOffset(0);
      setIsTransitioning(false);
      setShowSlowLoadMessage(false);
      if (slowLoadTimerRef.current) {
        clearTimeout(slowLoadTimerRef.current);
        slowLoadTimerRef.current = null;
      }
      return;
    }

    if (isCompleting) {
      setShowSlowLoadMessage(false);
      if (slowLoadTimerRef.current) {
        clearTimeout(slowLoadTimerRef.current);
        slowLoadTimerRef.current = null;
      }
      return;
    }

    slowLoadTimerRef.current = setTimeout(() => {
      setShowSlowLoadMessage(true);
    }, SLOW_LOAD_THRESHOLD_MS);

    return () => {
      if (slowLoadTimerRef.current) {
        clearTimeout(slowLoadTimerRef.current);
        slowLoadTimerRef.current = null;
      }
    };
  }, [open, isCompleting]);

  useEffect(() => {
    if (!open) return;

    let tickTimeout: number | null = null;
    const advance = () => {
      setIsTransitioning(true);
      setSlideOffset(-ROW_HEIGHT);

      tickTimeout = window.setTimeout(() => {
        const lastWindowStart = Math.max(0, LOADING_MESSAGES.length - VISIBLE_COUNT);
        setBaseIndex((prev) => (prev >= lastWindowStart ? prev : prev + 1));
        setIsTransitioning(false);
        setSlideOffset(0);
      }, SLIDE_MS);
    };

    const initialTimeout = window.setTimeout(advance, INITIAL_DELAY_MS);
    const interval = window.setInterval(() => {
      const lastWindowStart = Math.max(0, LOADING_MESSAGES.length - VISIBLE_COUNT);
      if (baseIndex >= lastWindowStart) {
        return;
      }
      advance();
    }, INTERVAL_MS);

    return () => {
      clearInterval(interval);
      clearTimeout(initialTimeout);
      if (tickTimeout) window.clearTimeout(tickTimeout);
    };
  }, [open, baseIndex]);

  const visibleMessages = getVisibleMessages(baseIndex, isCompleting);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
      className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center px-4 sm:px-6"
    >
      <div className="w-full max-w-md p-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col items-center">
        <CsvAnimationErrorBoundary>
          <Suspense fallback={<div className="mb-6" style={{ width: 160, height: 160 }} />}>
            <CsvLoadingAnimation className="mb-6" size={160} />
          </Suspense>
        </CsvAnimationErrorBoundary>
        <h2 className="text-2xl font-bold text-white mb-2" style={SEMI_FANCY_FONT}>Crunching your numbers</h2>
        <p className="text-slate-400 mb-6 text-center">
          Syncing your workouts and preparing your dashboard.
        </p>

        <div className="w-full space-y-3">
          {/* Sliding message list */}
          <div className="relative h-[144px] overflow-hidden">
            <div
              className="absolute left-0 right-0 top-0"
              style={{
                transform: `translateY(${slideOffset}px)`,
                transition: isTransitioning ? `transform ${SLIDE_MS}ms ease-out` : 'none',
              }}
            >
              {visibleMessages.map((msg) => (
                <div
                  key={msg.key}
                  className={`flex items-center space-x-3 text-sm h-[36px] transition-opacity duration-100 ease-out ${
                    msg.state === 'completed' ? 'opacity-60' : msg.state === 'active' ? 'opacity-100' : 'opacity-40'
                  }`}>
                  {msg.state === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  ) : msg.state === 'active' ? (
                    msg.text.includes('Captcha') ? (
                      <PuzzleLoadingAnimation size={20} />
                    ) : (
                      <Loader2 className="w-5 h-5 text-blue-500 animate-spin flex-shrink-0" />
                    )
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-slate-700 flex-shrink-0" />
                  )}
                  <span className={msg.state === 'pending' ? 'text-slate-600' : 'text-slate-500'}>
                    {msg.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {showSlowLoadMessage && (
            <div className="mt-6 pt-4 animate-in">
              <p className="text-xs text-slate-500 text-center mb-3">
                Taking longer than expected?
              </p>
              <button
                onClick={onReload ?? (() => window.location.reload())}
                className="flex items-center justify-center w-full gap-2 px-4 py-2.5 text-sm font-medium text-slate-400 border border-slate-700 rounded-lg hover:bg-slate-800 hover:text-white hover:border-slate-600 active:bg-slate-700 active:scale-[0.97] transition-[color,background-color,border-color,transform] duration-150"
              >
                <RefreshCw className="w-4 h-4" />
                Reload page
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
