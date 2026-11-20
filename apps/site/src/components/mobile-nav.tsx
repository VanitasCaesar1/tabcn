'use client';

import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'motion/react';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useReducedMotion } from '@/lib/use-reduced-motion';

// The drawer curve: fast out of the edge, settling without overshoot.
const EASE = [0.32, 0.72, 0, 1] as const;
const SLIDE_S = 0.32;
// tabcnSpring (critically damped) for a drag that's let go before it closes.
const SPRING = { type: 'spring', stiffness: 420, damping: 41 } as const;

/** A drag starts once the finger has moved this far sideways. */
const DRAG_START_PX = 8;
/** Let go past this much of the width, or faster than this, and the drawer closes. */
const CLOSE_FRACTION = 0.3;
const CLOSE_VELOCITY = 500;

const OPEN_SEARCH_EVENT = 'tabcn-open-search';
const noop = () => () => {};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

const iconButton =
  'relative grid size-9 shrink-0 touch-manipulation place-items-center rounded-full text-muted outline-hidden transition-[color,background-color] duration-150 ease-out after:absolute after:-inset-1 hover:text-foreground focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-foreground active:bg-foreground/10 active:duration-100 motion-reduce:transition-none';

// The sidebar on screens too narrow for the column: a button in the header slides it in from the
// left. It closes with Escape, a tap on the scrim, a swipe to the left, the close button, or by
// going to another page; focus then returns to the menu button.
export function MobileNav({
  brand,
  footer,
  children,
}: {
  brand: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [dragClosed, setDragClosed] = useState(false);
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const client = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [lastPath, setLastPath] = useState(pathname);
  const x = useMotionValue(0);
  const width = useRef(320);
  // The scrim thins out as the drawer is dragged away.
  // (While the drawer slides in or out on its own, x is a percentage and the scrim stays whole.)
  const scrim = useTransform(x, (v) => {
    const px = typeof v === 'number' ? v : Number.NaN;
    return Number.isFinite(px) ? Math.max(0, Math.min(1, 1 + px / width.current)) : 1;
  });
  const drag = useRef<{
    id: number;
    x0: number;
    y0: number;
    active: boolean;
    samples: { x: number; t: number }[];
  } | null>(null);
  const dragged = useRef(false);

  // Picking a design navigates, and the menu gets out of the way.
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  const close = () => setOpen(false);

  // The search row in the drawer opens the header's search, and the drawer makes way.
  useEffect(() => {
    const onOpenSearch = () => setOpen(false);
    window.addEventListener(OPEN_SEARCH_EVENT, onOpenSearch);
    return () => window.removeEventListener(OPEN_SEARCH_EVENT, onOpenSearch);
  }, []);

  useEffect(() => {
    if (!open) return;
    setDragClosed(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    // The page underneath stays put while the list scrolls.
    const overflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    panelRef.current?.focus();
    const button = buttonRef.current;
    const panel = panelRef.current;
    return () => {
      document.removeEventListener('keydown', onKey);
      document.documentElement.style.overflow = overflow;
      // Back to the menu button, unless something else (the search) has taken focus.
      const now = document.activeElement;
      if (!now || now === document.body || panel?.contains(now)) {
        button?.focus({ preventScroll: true });
      }
    };
  }, [open]);

  // Keeps Tab inside the drawer while it's open.
  const trapTab = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !panelRef.current) return;
    const items = [...panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (el) => el.offsetParent !== null,
    );
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    if (
      e.shiftKey &&
      (document.activeElement === first || document.activeElement === panelRef.current)
    ) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  // Swipe to dismiss: past 8 px sideways the drawer follows the finger, never past its open
  // place. Vertical moves stay with the list (touch-action: pan-y).
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    width.current = panelRef.current?.offsetWidth ?? 320;
    dragged.current = false;
    drag.current = {
      id: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      active: false,
      samples: [{ x: e.clientX, t: e.timeStamp }],
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x0;
    const dy = e.clientY - d.y0;
    if (!d.active) {
      if (Math.abs(dy) > DRAG_START_PX && Math.abs(dy) > Math.abs(dx)) {
        drag.current = null;
        return;
      }
      if (Math.abs(dx) < DRAG_START_PX) return;
      d.active = true;
      dragged.current = true;
      panelRef.current?.setPointerCapture(e.pointerId);
    }
    x.set(Math.min(0, dx));
    d.samples.push({ x: e.clientX, t: e.timeStamp });
    if (d.samples.length > 5) d.samples.shift();
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== e.pointerId || !d.active) return;
    const first = d.samples[0];
    const last = d.samples[d.samples.length - 1];
    const dt = first && last ? (last.t - first.t) / 1000 : 0;
    const velocity = first && last && dt > 0 ? (last.x - first.x) / dt : 0;
    const w = width.current;
    if (-x.get() > w * CLOSE_FRACTION || velocity < -CLOSE_VELOCITY) {
      if (reduceMotion) {
        setDragClosed(true);
        setOpen(false);
        return;
      }
      animate(x, -w, { duration: SLIDE_S * 0.75, ease: EASE }).then(() => {
        setDragClosed(true);
        setOpen(false);
      });
    } else if (reduceMotion) {
      x.set(0);
    } else {
      animate(x, 0, SPRING);
    }
  };

  const drawer = (
    <AnimatePresence custom={dragClosed}>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <motion.div
            aria-hidden
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            onClick={close}
          >
            <motion.div className="absolute inset-0 bg-black/30" style={{ opacity: scrim }} />
          </motion.div>
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            tabIndex={-1}
            onKeyDown={trapTab}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onClickCapture={(e) => {
              // A drag that ends over a link isn't a tap on it.
              if (dragged.current) {
                e.preventDefault();
                e.stopPropagation();
                dragged.current = false;
              }
            }}
            className="absolute inset-y-0 left-0 flex w-[min(320px,88vw)] touch-pan-y flex-col bg-background shadow-raised outline-hidden"
            style={reduceMotion ? undefined : { x }}
            custom={dragClosed}
            variants={{
              hidden: { x: '-100%' },
              shown: { x: 0 },
              exit: (byDrag: boolean) => ({
                x: '-100%',
                transition: byDrag ? { duration: 0 } : { duration: 0.22, ease: [0.4, 0, 1, 1] },
              }),
              fadeHidden: { opacity: 0 },
              fadeShown: { opacity: 1 },
            }}
            initial={reduceMotion ? 'fadeHidden' : 'hidden'}
            animate={reduceMotion ? 'fadeShown' : 'shown'}
            exit={reduceMotion ? 'fadeHidden' : 'exit'}
            transition={reduceMotion ? { duration: 0 } : { duration: SLIDE_S, ease: EASE }}
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-border border-b pr-3 pl-5">
              {brand}
              <button type="button" aria-label="Close menu" onClick={close} className={iconButton}>
                <svg
                  viewBox="0 0 16 16"
                  className="size-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  aria-hidden
                >
                  <path d="m4 4 8 8M12 4l-8 8" />
                </svg>
              </button>
            </div>
            {children}
            <div className="flex h-14 shrink-0 items-center gap-2 border-border border-t px-3">
              {footer}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Menu"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={`-ml-2 lg:hidden ${iconButton}`}
      >
        <svg
          viewBox="0 0 16 16"
          className="size-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          aria-hidden
        >
          <path d="M2.5 5h11M2.5 11h7" />
        </svg>
      </button>
      {/* In <body>, so the header's backdrop blur doesn't become the drawer's frame. */}
      {client && createPortal(drawer, document.body)}
    </>
  );
}
