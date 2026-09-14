import React, { useCallback, useMemo, useEffect, useRef } from 'react';
import { ArrowBigUp, Reply, Share2, Award } from 'lucide-react';

const AVATAR_COLORS = [
  '#FF4500', '#0079D3', '#46D160', '#DDBD37', '#FF585B',
  '#7193FF', '#0DD3BB', '#FF8717', '#A06EE1', '#E063B6',
];

const SUBREDDITS = ['Hevy', 'Strong', 'Lyfta', 'Motra', 'fitness', 'workout', 'Gym', 'bodybuilding', 'strength_training', 'powerlifting'] as const;
const TIMES = ['1h', '2h', '3h', '4h', '5h', '6h', '8h', '10h', '12h', '14h', '16h', '1d', '2d', '3d'];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i);
  return Math.abs(h);
}

export function getColor(username: string): string {
  return AVATAR_COLORS[hashString(username) % AVATAR_COLORS.length];
}

export function getUpvotes(username: string): number {
  return 2 + (hashString(username + 'up') % 9);
}

export function getSubreddit(username: string, quote: string): string {
  const lower = `${username} ${quote}`.toLowerCase();
  if (lower.includes('hevy')) return 'Hevy';
  if (lower.includes('strong')) return 'Strong';
  if (lower.includes('lyfta')) return 'Lyfta';
  if (lower.includes('motra')) return 'Motra';
  if (lower.includes('bodybuilding') || lower.includes('muscle')) return 'bodybuilding';
  if (lower.includes('powerlifting') || lower.includes('pr ') || lower.includes('bench')) return 'powerlifting';
  if (lower.includes('gym') || lower.includes('workout')) return 'Gym';
  return SUBREDDITS[hashString(username) % SUBREDDITS.length];
}

export function getTimeAgo(username: string): string {
  return TIMES[hashString(username + 'time') % TIMES.length];
}

export function SnooAvatar({ color, size = 16 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
      <ellipse cx="12" cy="1.5" rx="1.5" ry="1.5" fill={color} />
      <line x1="12" y1="3" x2="12" y2="5.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <ellipse cx="12" cy="15" rx="10" ry="8" fill={color} />
      <circle cx="8.5" cy="13.5" r="1.8" fill="#fff" />
      <circle cx="15.5" cy="13.5" r="1.8" fill="#fff" />
      <path d="M8.5 17 Q12 20 15.5 17" fill="none" stroke="#fff" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

// ── Shared card face styling ──
export function cardFaceClass(isLight: boolean) {
  return isLight
    ? 'bg-white/35'
    : 'bg-black/35';
}

interface RedditCardProps {
  username: string;
  quote: string;
  src: string;
  isLight: boolean;
  cardId: string;
  isFlipped: boolean;
  onFlip: (cardId: string) => void;
  /**
   * false → pure content (desktop: the outer marquee wrapper owns the
   * button semantics; this avoids nested interactive elements).
   */
  interactive?: boolean;
  /**
   * false → removed from tab order + hidden from AT (marquee clones, so
   * screen readers and keyboard users meet each review once).
   */
  focusable?: boolean;
}

export const RedditCard: React.FC<RedditCardProps> = React.memo(({ username, quote, src, isLight, cardId, isFlipped, onFlip, interactive = true, focusable = true }) => {
  const upvotes = useMemo(() => getUpvotes(username), [username]);
  const subreddit = useMemo(() => getSubreddit(username, quote), [username, quote]);
  const color = useMemo(() => getColor(username), [username]);
  const timeAgo = useMemo(() => getTimeAgo(username), [username]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fireFlip = useCallback(() => onFlip(cardId), [onFlip, cardId]);

  const startFlipTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(fireFlip, 1000);
  }, [fireFlip]);

  const clearFlipTimer = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  useEffect(() => {
    if (!isFlipped) clearFlipTimer();
    return clearFlipTimer;
  }, [isFlipped, clearFlipTimer]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    fireFlip();
  }, [fireFlip]);

  const faces = (
    <>
        {/* ── Front face: Reddit comment card ── */}
        <div
          className={`absolute inset-0 rounded-xl overflow-hidden flex flex-col px-3.5 py-3 gap-2 ${cardFaceClass(isLight)}`}
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="flex items-center gap-1.5 text-xs">
            <SnooAvatar color={color} size={16} />
            <span className={`font-medium ${isLight ? 'text-black/80' : 'text-neutral-200'}`}>
              r/{subreddit}
            </span>
            <span className={isLight ? 'text-slate-400' : 'text-neutral-600'}>·</span>
            <span className={isLight ? 'text-slate-500' : 'text-neutral-500'}>u/{username}</span>
            <span className={isLight ? 'text-slate-400' : 'text-neutral-600'}>·</span>
            <span className={isLight ? 'text-slate-400' : 'text-neutral-500'}>{timeAgo}</span>
          </div>

          <p className={`flex-1 text-[13px] sm:text-sm leading-relaxed line-clamp-3 ${
            isLight ? 'text-slate-800' : 'text-neutral-300'
          }`}>
            {quote.split(' / ').map((part, i) => (
              <React.Fragment key={i}>
                {i > 0 && <br />}
                {part}
              </React.Fragment>
            ))}
          </p>

          <div className="flex items-center gap-1.5 text-xs">
            <ArrowBigUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FF4500]" fill="#FF4500" />
            <span className={`font-bold tabular-nums -ml-0.5 ${isLight ? 'text-slate-700' : 'text-neutral-400'}`}>{upvotes}</span>
            <span className={`ml-auto flex items-center gap-1 ${isLight ? 'text-slate-400' : 'text-neutral-600'}`}>
              <Reply className="w-3 h-3 sm:w-3.5 sm:h-3.5" />Reply
            </span>
            <span className={`flex items-center gap-1 ${isLight ? 'text-slate-400' : 'text-neutral-600'}`}>
              <Share2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />Share
            </span>
            <span className={`flex items-center gap-1 ${isLight ? 'text-slate-400' : 'text-neutral-600'}`}>
              <Award className="w-3 h-3 sm:w-3.5 sm:h-3.5" />Award
            </span>
          </div>
        </div>

        {/* ── Back face: screenshot ── */}
        <div
          className={`absolute inset-0 rounded-xl overflow-hidden ${cardFaceClass(isLight)}`}
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <img
            src={src}
            alt={`Screenshot of ${username}'s Reddit comment`}
            className="w-full h-full object-contain p-2"
            draggable={false}
            loading="lazy"
            decoding="async"
          />
        </div>
    </>
  );

  if (!interactive) {
    return (
      <div
        className="w-[300px] sm:w-[340px] h-[160px] sm:h-[140px] select-none"
        style={{ perspective: '800px' }}
      >
        <div
          className="relative w-full h-full"
          style={{
            transformStyle: 'preserve-3d',
            transition: 'transform 0.5s ease',
            transform: 'rotateY(0deg)',
          }}
        >
          {faces}
        </div>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={focusable ? 0 : -1}
      aria-hidden={focusable ? undefined : true}
      aria-label={`Flip review card from ${username}`}
      className="w-[300px] sm:w-[340px] h-[160px] sm:h-[140px] cursor-pointer select-none"
      style={{ perspective: '800px' }}
      onClick={fireFlip}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => { if (isFlipped) clearFlipTimer(); }}
      onMouseLeave={() => { if (isFlipped) startFlipTimer(); }}
    >
      <div
        className="relative w-full h-full"
        style={{
          transformStyle: 'preserve-3d',
          transition: 'transform 0.5s ease',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {faces}
      </div>
    </div>
  );
});

RedditCard.displayName = 'RedditCard';

export default RedditCard;
