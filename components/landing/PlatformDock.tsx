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
};

// Fast, snappy spring config
const SPRING_CONFIG = { mass: 0.05, stiffness: 400, damping: 15 };
const BASE_SIZE = 64;
const MAGNIFICATION = 80;
const DISTANCE = 120;

function DockItem({ item, mouseX }: DockItemProps) {
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

  return (
    <motion.button
      ref={ref}
      type="button"
      onClick={item.disabled ? undefined : item.onClick}
      disabled={item.disabled}
      style={{ width: size, height: size }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
  );
}

export default function PlatformDock({ items, className = '' }: PlatformDockProps) {
  const mouseX = useMotionValue(Infinity);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] ${className}`}>
      <motion.div
        onMouseMove={(e) => mouseX.set(e.pageX)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          mouseX.set(Infinity);
          setIsHovered(false);
        }}
        onTouchStart={() => setIsHovered(true)}
        onTouchEnd={() => setIsHovered(false)}
        className="flex items-center gap-2"
      >
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-emerald-500/40 bg-slate-950/95 backdrop-blur-xs px-5 py-3 shadow-2xl shadow-black/50">
          {/* Dock items */}
          <div className="flex items-end gap-2">
            {items.map((item, index) => (
              <DockItem
                key={index}
                item={item}
                mouseX={mouseX}
              />
            ))}
          </div>
          
          {/* Choose your platform text */}
          <div
            className={`text-xs ${FANCY_FONT} text-emerald-400/80 select-none transition-opacity duration-300 ${isHovered ? 'opacity-0' : 'opacity-50'}`}
          >
            Choose your platform
          </div>
        </div>
      </motion.div>
    </div>
  );
}
