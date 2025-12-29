import {
  motion,
  MotionValue,
  useMotionValue,
  useSpring,
  useTransform,
} from 'motion/react';
import React, { useRef, useState } from 'react';
import { FANCY_FONT } from '../../utils/ui/uiConstants';

export type PlatformDockItem = {
  name: string;
  image: string;
  onClick: () => void;
  disabled?: boolean;
  badge?: string;
};

export type PlatformDockProps = {
  items: PlatformDockItem[];
  className?: string;
};

type DockItemProps = {
  item: PlatformDockItem;
  mouseX: MotionValue<number>;
  onHoverStart?: (name: string) => void;
  onHoverEnd?: () => void;
  key?: React.Key;
  index?: number;
  totalItems?: number;
};

// Spring config matching reference dock feel
const SPRING_CONFIG = { mass: 0.05, stiffness: 400, damping: 20 };
const BASE_SIZE = 64;
const MAGNIFICATION = 80;
const DISTANCE = 120;

function DockItem({ item, mouseX, onHoverStart, onHoverEnd, index = 0, totalItems = 1 }: DockItemProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const mouseDistance = useTransform(mouseX, (val) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return Infinity;
    return val - rect.x - rect.width / 2;
  });

  const size = useSpring(
    useTransform(mouseDistance, [-DISTANCE, 0, DISTANCE], [BASE_SIZE, MAGNIFICATION, BASE_SIZE]),
    SPRING_CONFIG
  );

  // Calculate spacing based on hover state
  const spacing = useSpring(
    useTransform(mouseDistance, [-DISTANCE, 0, DISTANCE], [8, 16, 8]),
    { mass: 0.05, stiffness: 500, damping: 25 }
  );

  const marginLeft = useSpring(
    useTransform(mouseDistance, [-DISTANCE, 0, DISTANCE], [4, index > 0 ? 12 : 4, 4]),
    { mass: 0.05, stiffness: 500, damping: 25 }
  );

  const marginRight = useSpring(
    useTransform(mouseDistance, [-DISTANCE, 0, DISTANCE], [4, index < totalItems - 1 ? 12 : 4, 4]),
    { mass: 0.05, stiffness: 500, damping: 25 }
  );

  return (
    <motion.div
      style={{ marginLeft, marginRight }}
    >
      <motion.button
        ref={ref}
        type="button"
        onClick={item.disabled ? undefined : item.onClick}
        disabled={item.disabled}
        style={{ width: size, height: size }}
        onMouseEnter={() => {
          if (item.disabled) return;
          setIsHovered(true);
          onHoverStart?.(item.name);
        }}
        onMouseLeave={() => {
          if (item.disabled) return;
          setIsHovered(false);
          onHoverEnd?.();
        }}
        onTouchStart={() => { if (!item.disabled) onHoverStart?.(item.name); }}
        onTouchEnd={() => { if (!item.disabled) onHoverEnd?.(); }}
        onFocus={() => { if (!item.disabled) { setIsHovered(true); onHoverStart?.(item.name); } }}
        onBlur={() => { if (!item.disabled) { setIsHovered(false); onHoverEnd?.(); } }}
        className={`relative inline-flex items-center justify-center rounded-2xl overflow-hidden transition-all duration-100 ${
          item.disabled 
            ? 'opacity-40 cursor-not-allowed border border-slate-700/30 bg-slate-900/50' 
            : `cursor-pointer bg-black/70 shadow-lg ${isHovered ? 'border-2 border-emerald-400 shadow-emerald-400/40' : 'border border-emerald-500/40 shadow-emerald-500/20'}`
        }`}
      >
        <img
          src={item.image}
          alt={item.name}
          className="w-3/4 h-3/4 object-contain pointer-events-none"
          draggable={false}
        />
      </motion.button>
    </motion.div>
  );
}

export default function PlatformDock({ items, className = '' }: PlatformDockProps) {
  const mouseX = useMotionValue(Infinity);
  const [isHovered, setIsHovered] = useState(false);
  const [activeName, setActiveName] = useState<string | null>(null);

  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] ${className}`}>
      <motion.div
        onMouseMove={(e) => mouseX.set(e.pageX)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          mouseX.set(Infinity);
          setIsHovered(false);
          setActiveName(null);
        }}
        onTouchStart={() => setIsHovered(true)}
        onTouchEnd={() => { setIsHovered(false); setActiveName(null); }}
        className="flex items-center gap-2"
      >
        <div className="flex flex-col items-center gap-3 rounded-2xl px-5 py-3">
          <div className="flex items-end">
            {items.map((item, index) => (
              <DockItem
                key={index}
                item={item}
                mouseX={mouseX}
                index={index}
                totalItems={items.length}
                onHoverStart={(name) => setActiveName(name)}
                onHoverEnd={() => setActiveName(null)}
              />
            ))}
          </div>
          
          {/* Choose your platform text (crossfades to hovered platform name) */}
          <div className="relative h-5 w-full select-none">
            <span
              className={`absolute inset-0 flex items-center justify-center text-xs ${FANCY_FONT} text-emerald-400/80 transition-all duration-300 mix-blend-difference drop-shadow-lg ${activeName ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'}`}
              aria-hidden={!!activeName}
            >
              Choose your platform
            </span>

            <span
              className={`absolute inset-0 flex items-center justify-center text-xs ${FANCY_FONT} text-emerald-400/80 transition-all duration-300 delay-75 mix-blend-difference drop-shadow-lg ${activeName ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'}`}
              aria-live="polite"
            >
              {activeName ?? ''}
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
