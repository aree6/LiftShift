import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useTheme } from '../../theme/ThemeProvider';
import { assetPath } from '../../../constants';
import type { HowItWorksSection, HowItWorksNode } from '../utils/howItWorksDocContent';
import type { HowItWorksCTA } from '../utils/howItWorksTypes';
import { HOW_IT_WORKS_SECTIONS } from '../utils/howItWorksDocContent';

type Props = {
  className?: string;
  showTitle?: boolean;
  linkTarget?: '_self' | '_blank';
};

type FlatNavItem = {
  id: string;
  title: string;
  depth: number;
};

const flattenSections = (sections: HowItWorksSection[], depth: number): FlatNavItem[] => {
  const out: FlatNavItem[] = [];
  for (const s of sections) {
    out.push({ id: s.id, title: s.sidebarTitle ?? s.title, depth });
    if (s.children && s.children.length > 0) out.push(...flattenSections(s.children, depth + 1));
  }
  return out;
};

const getToneClasses = (tone: 'note' | 'warning', isLight: boolean) => {
  if (tone === 'warning') {
    return {
      border: isLight ? 'border-amber-600/25' : 'border-amber-500/25',
      bg: isLight ? 'bg-amber-100/50' : 'bg-amber-500/10',
      title: isLight ? 'text-amber-700' : 'text-amber-200',
      text: isLight ? 'text-slate-700' : 'text-slate-200',
    };
  }
  return {
    border: isLight ? 'border-emerald-600/25' : 'border-emerald-500/25',
    bg: isLight ? 'bg-emerald-100/50' : 'bg-emerald-500/10',
    title: isLight ? 'text-emerald-700' : 'text-emerald-200',
    text: isLight ? 'text-slate-700' : 'text-slate-200',
  };
};

const NodeView: React.FC<{ node: HowItWorksNode; linkTarget: '_self' | '_blank'; isLight: boolean }> = ({ node, linkTarget, isLight }) => {
  if (node.type === 'p') {
    return <p className={`leading-relaxed ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{node.text}</p>;
  }

  if (node.type === 'ul') {
    return (
      <ul className={`list-disc list-inside space-y-1 leading-relaxed ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
        {node.items.map((t, idx) => (
          <li key={idx}>{t}</li>
        ))}
      </ul>
    );
  }

  if (node.type === 'links') {
    return (
      <div className="flex flex-wrap gap-2">
        {node.links.map((l) => (
          <a
            key={l.hrefPath}
            href={assetPath(l.hrefPath)}
            target={linkTarget}
            rel={linkTarget === '_blank' ? 'noopener noreferrer' : undefined}
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${isLight ? 'border-black/10 bg-black/5 text-emerald-700 hover:bg-black/10' : 'border-white/10 bg-white/5 text-emerald-200 hover:bg-white/10'}`}
          >
            {l.label}
          </a>
        ))}
      </div>
    );
  }

  const tone = getToneClasses(node.tone, isLight);
  return (
    <div className={`rounded-2xl border ${tone.border} ${tone.bg} p-4`}>
      <div className={`text-sm font-semibold ${tone.title}`}>{node.title}</div>
      <div className={`mt-2 text-sm ${tone.text} leading-relaxed`}>{node.text}</div>
    </div>
  );
};

const CTAView: React.FC<{ cta: HowItWorksCTA; isLight: boolean }> = ({ cta, isLight }) => (
  <div className={`mt-6 rounded-2xl border ${isLight ? 'border-emerald-500/30 bg-emerald-50/50' : 'border-emerald-500/25 bg-emerald-500/10'} p-4`}>
    <p className={`text-sm font-semibold mb-3 ${isLight ? 'text-emerald-800' : 'text-emerald-200'}`}>
      {cta.text}
    </p>
    <div className="flex flex-wrap gap-2">
      {cta.links.map((l) => (
        <a
          key={l.hrefPath}
          href={assetPath(l.hrefPath)}
          className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${isLight ? 'border-emerald-600/30 bg-emerald-100/50 text-emerald-700 hover:bg-emerald-200/60' : 'border-emerald-500/30 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'}`}
        >
          {l.label}
        </a>
      ))}
    </div>
  </div>
);

const SectionView: React.FC<{ section: HowItWorksSection; level: number; linkTarget: '_self' | '_blank'; flashingId: string | null; isLight: boolean }> = ({ section, level, linkTarget, flashingId, isLight }) => {
  const HeadingTag = level === 2 ? 'h2' : 'h3';
  const isFlashing = flashingId === section.id;
  const isDimmed = flashingId !== null && !isFlashing;
  return (
    <section id={section.id} className="space-y-4 scroll-mt-16">
      <div className={'transition-opacity duration-400' + (isDimmed ? ' opacity-50' : '')}>
        <HeadingTag
          className={[
            'transition-colors duration-200',
            level === 2 ? 'text-xl font-bold' : 'text-lg font-semibold',
            isFlashing ? 'text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]' : (isLight ? 'text-slate-900' : 'text-white'),
          ].join(' ')}
        >
          {section.title}
        </HeadingTag>
        <div className="mt-3 space-y-3">
          {section.nodes.map((n, idx) => (
            <NodeView key={idx} node={n} linkTarget={linkTarget} isLight={isLight} />
          ))}
        </div>
      </div>

      {section.cta ? <CTAView cta={section.cta} isLight={isLight} /> : null}

      {section.children && section.children.length > 0 ? (
        <div className="mt-6 space-y-6">
          {section.children.map((c) => (
            <SectionView key={c.id} section={c} level={3} linkTarget={linkTarget} flashingId={flashingId} isLight={isLight} />
          ))}
        </div>
      ) : null}
    </section>
  );
};

export const HowItWorksDoc: React.FC<Props> = ({ className = '', showTitle = true, linkTarget = '_self' }) => {
  const { mode } = useTheme();
  const isLight = mode === 'light';
  const navItems = useMemo(() => flattenSections(HOW_IT_WORKS_SECTIONS, 0), []);

  const parentMap = useMemo(() => {
    const map: Record<string, string | null> = {};
    const walk = (sections: HowItWorksSection[], parentId: string | null) => {
      for (const s of sections) {
        map[s.id] = parentId;
        if (s.children) walk(s.children, s.id);
      }
    };
    walk(HOW_IT_WORKS_SECTIONS, null);
    return map;
  }, []);

  const resolveParentId = useCallback((id: string): string => parentMap[id] ?? id, [parentMap]);

  const [activeId, setActiveId] = useState<string>(HOW_IT_WORKS_SECTIONS[0]?.id ?? '');
  const contentRef = useRef<HTMLDivElement | null>(null);
  const sidebarRef = useRef<HTMLElement | null>(null);
  const flexRef = useRef<HTMLDivElement | null>(null);
  const [paneHeight, setPaneHeight] = useState(0);
  const [flashingId, setFlashingId] = useState<string | null>(null);
  const [mobileTocOpen, setMobileTocOpen] = useState(false);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const observerSuppressed = useRef(false);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mobile renders one top-level section at a time on the plain page scroll
  // (no inner scroll pane). Selections funnel through here so the section can
  // render first and the page scrolls to the anchor right after.
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window === 'undefined'
      ? true
      : (window.matchMedia?.('(min-width: 1024px)')?.matches ?? true),
  );
  const [mobileSectionId, setMobileSectionId] = useState<string>(HOW_IT_WORKS_SECTIONS[0]?.id ?? '');
  const mobileScrollTarget = useRef<{ id: string } | null>(null);
  const mobileTopRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mq = window.matchMedia?.('(min-width: 1024px)');
    if (!mq) return;
    const onChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const flashId = useCallback((id: string) => {
    setFlashingId(id);
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setFlashingId(null), 2000);
  }, []);

  const smoothBehavior = (): ScrollBehavior =>
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ? 'auto' : 'smooth';

  useLayoutEffect(() => {
    // Desktop only: the inner pane is sized to the sidebar. Mobile renders on
    // the plain page scroll and needs no measured pane.
    if (!isDesktop || !sidebarRef.current || !contentRef.current) return;
    const h = sidebarRef.current.getBoundingClientRect().height;
    if (h > 0) {
      setPaneHeight(h);
    } else {
      const top = contentRef.current.getBoundingClientRect().top;
      setPaneHeight(window.innerHeight - top);
    }
  }, [isDesktop]);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, []);

  // Mobile: after the selected section renders, scroll the page to the queued
  // anchor (section top on chip tap, subsection on dropdown tap).
  useEffect(() => {
    if (isDesktop) return;
    const t = mobileScrollTarget.current;
    if (!t) return;
    mobileScrollTarget.current = null;
    const behavior = smoothBehavior();
    requestAnimationFrame(() => {
      document.getElementById(t.id)?.scrollIntoView({ behavior, block: 'start' });
    });
    flashId(t.id);
  }, [mobileSectionId, isDesktop, flashId]);

  // Mobile: close the contents dropdown on Escape.
  useEffect(() => {
    if (!mobileTocOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileTocOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileTocOpen]);

  const scrollToIdInPane = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;

    const heading = el.querySelector('h2, h3') ?? el;
    const pane = contentRef.current;
    if (pane) {
      const paneRect = pane.getBoundingClientRect();
      const headingRect = heading.getBoundingClientRect();
      const visibleTop = Math.max(paneRect.top, 0);
      const visibleHeight = Math.min(paneRect.bottom, window.innerHeight) - visibleTop;
      const visibleCenterY = visibleTop + visibleHeight / 2;
      const headingCenterY = headingRect.top + headingRect.height / 2;
      pane.scrollBy({ top: headingCenterY - visibleCenterY, behavior: 'smooth' });
    }
  };

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();

    observerSuppressed.current = true;
    clearTimeout(scrollTimerRef.current ?? undefined);
    scrollTimerRef.current = setTimeout(() => { observerSuppressed.current = false; }, 800);

    setActiveId(resolveParentId(id));
    scrollToIdInPane(id);

    flashId(id);
  };

  // Mobile: show one section at a time. Chip taps land on the section top,
  // dropdown taps land on the exact subsection anchor.
  const handleMobileSelect = (id: string) => {
    const parentId = resolveParentId(id);
    setMobileTocOpen(false);
    try {
      window.history.replaceState(null, '', `#${id}`);
    } catch {
      // hash update is a nicety; never break navigation
    }
    if (parentId !== mobileSectionId) {
      mobileScrollTarget.current = { id };
      setMobileSectionId(parentId);
    } else {
      mobileScrollTarget.current = { id };
      const behavior = smoothBehavior();
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ behavior, block: 'start' });
      });
      flashId(id);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.location.hash || '';
    const id = raw.startsWith('#') ? raw.slice(1) : raw;
    if (!id) return;
    if (!document.getElementById(id)) return;

    if (!isDesktop) {
      setMobileSectionId(resolveParentId(id));
      mobileScrollTarget.current = { id };
    } else {
      scrollToIdInPane(id);
      setActiveId(resolveParentId(id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !isDesktop) return;

    const parentIds = navItems.filter(i => i.depth === 0).map(i => i.id);

    const handleIntersect = () => {
      if (observerSuppressed.current) return;

      const cr = contentRef.current!.getBoundingClientRect();
      const centerY = cr.top + cr.height / 2;

      let closestDist = Infinity;
      let closestId: string | null = null;

      for (const id of parentIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.bottom < cr.top || rect.top > cr.bottom) continue;
        const dist = Math.abs(rect.top - centerY);
        if (dist < closestDist) {
          closestDist = dist;
          closestId = id;
        }
      }

      if (closestId) setActiveId(resolveParentId(closestId));
    };

    const observer = new IntersectionObserver(handleIntersect, {
      root: contentRef.current,
      rootMargin: '-10% 0px -30% 0px',
      threshold: [0],
    });

    for (const id of parentIds) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [navItems]);

  const mobileSection = HOW_IT_WORKS_SECTIONS.find((s) => s.id === mobileSectionId) ?? HOW_IT_WORKS_SECTIONS[0];

  return (
    <div className={`space-y-2 ${className}`}>

      {/* Mobile: sticky section chips + full-contents dropdown. The section
          itself renders on the plain page scroll below, with no inner scroll pane. */}
      <div className="lg:hidden sticky top-0 z-20 -mx-1 px-1 pt-1">
        <div className={`flex items-center gap-2 rounded-2xl border px-2 py-2 backdrop-blur-md ${isLight ? 'border-black/10 bg-white/90' : 'border-white/10 bg-[#0b0f16]/90'}`}>
          <div className="flex flex-1 gap-2 overflow-x-auto py-0.5" style={{ scrollbarWidth: 'none' }}>
            {HOW_IT_WORKS_SECTIONS.map((s) => {
              const isActive = s.id === mobileSectionId;
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-current={isActive ? 'true' : undefined}
                  onClick={() => handleMobileSelect(s.id)}
                  className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    isActive
                      ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-200'
                      : isLight
                        ? 'border-black/10 bg-black/5 text-slate-600'
                        : 'border-white/10 bg-white/5 text-slate-300'
                  }`}
                >
                  {s.sidebarTitle ?? s.title}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            aria-expanded={mobileTocOpen}
            aria-label="All sections"
            onClick={() => setMobileTocOpen((prev) => !prev)}
            className={`shrink-0 p-2.5 rounded-xl border-2 transition-colors ${
              isLight
                ? 'border-black/30 text-slate-600 hover:bg-black/5'
                : 'border-white/30 text-slate-300 hover:bg-white/5'
            }`}
          >
            {mobileTocOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile contents sheet */}
      {mobileTocOpen ? (
        <div className="lg:hidden">
          <button
            type="button"
            aria-label="Close sections"
            onClick={() => setMobileTocOpen(false)}
            className="fixed inset-0 z-40 cursor-default bg-black/50"
          />
          <div className={`fixed inset-x-4 top-20 z-50 max-h-[65dvh] overflow-y-auto rounded-2xl border p-2 ${isLight ? 'border-black/10 bg-white' : 'border-white/10 bg-[#111722]'}`}>
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Contents</span>
              <button
                type="button"
                aria-label="Close sections"
                onClick={() => setMobileTocOpen(false)}
                className={`p-1.5 rounded-lg transition-colors ${isLight ? 'text-slate-500 hover:bg-black/5' : 'text-slate-300 hover:bg-white/5'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav>
              {navItems.map((i) => {
                const isActive = i.id === mobileSectionId || i.id === flashingId;
                return (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => handleMobileSelect(i.id)}
                    className={[
                      'block w-full text-left transition-colors py-2.5 leading-snug border-b last:border-0',
                      i.depth === 0 ? '' : i.depth === 1 ? 'pl-5' : 'pl-10',
                      i.depth === 0
                        ? 'text-[13px] font-semibold tracking-wide text-emerald-400'
                        : `text-[13px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`,
                      isActive ? 'text-emerald-300' : '',
                      isLight ? 'border-slate-200/60' : 'border-slate-800/40',
                    ].join(' ')}
                  >
                    {i.title}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      ) : null}

      {/* Mobile: one section at a time on the page scroll, footer stays close */}
      <div ref={mobileTopRef} className="lg:hidden max-w-3xl mx-auto px-5 py-6">
        {mobileSection ? (
          <SectionView key={mobileSection.id} section={mobileSection} level={2} linkTarget={linkTarget} flashingId={flashingId} isLight={isLight} />
        ) : null}
      </div>

      {/* Docs layout: sidebar (left) + content (right) — desktop only */}
      <div ref={flexRef} className="hidden lg:flex items-start">
        {/* Sidebar */}
        <aside ref={sidebarRef} className={`hidden lg:flex lg:flex-col w-[280px] shrink-0  sticky top-0 self-start ${isLight ? 'border-slate-300/50' : 'border-slate-800/40'}`}>
          <div className={`sticky top-0 z-10 shrink-0 px-5 py-3.5 `}>
            <span className={`text-xs font-bold uppercase tracking-widest ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Contents</span>
          </div>
          <nav className="py-3 space-y-0">
            {navItems.map((i) => {
              const isActive = i.id === activeId;
              const isParent = i.depth === 0;
              return (
                <a
                  key={i.id}
                  href={`#${i.id}`}
                  onClick={(e) => handleNavClick(e, i.id)}
                  className={[
                    'block transition-colors rounded-r-lg',
                    isParent ? 'mt-2 first:mt-0' : '',
                    i.depth === 0 ? 'pl-5' : i.depth === 1 ? 'pl-8' : 'pl-12',
                    'pr-4 py-1.5 text-sm leading-snug',
                    isParent ? 'text-[13px] font-semibold tracking-wide text-emerald-400' : `text-[13px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`,
                    isActive
                      ? `text-emerald-200 bg-emerald-500/8`
                      : `${isLight ? 'hover:text-emerald-600 hover:bg-black/[0.03]' : 'hover:text-emerald-300 hover:bg-white/[0.03]'}`,
                  ].join(' ')}
                >
                  {i.title}
                </a>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <div ref={contentRef} className={`flex-1 overflow-y-auto min-w-0 scroll-pt-8 relative rounded-xl border ${isLight ? 'border-slate-300/40' : 'border-white/15'}`} style={paneHeight > 0 ? { maxHeight: paneHeight } : undefined}>
          <div className="max-w-3xl mx-auto px-8 py-10 space-y-14">
            {HOW_IT_WORKS_SECTIONS.map((s) => (
              <SectionView key={s.id} section={s} level={2} linkTarget={linkTarget} flashingId={flashingId} isLight={isLight} />
            ))}
            <div className="pb-16" />
          </div>
        </div>
      </div>
    </div>
  );
};
