'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

/**
 * ThemeColorManager — single owner of the browser-chrome color (iOS notch /
 * status bar "forehead" and toolbar / home-indicator "chin").
 *
 * ## How Safari decides the chrome color (findings, verified in the iOS 26
 * simulator, June 2026)
 *
 * Safari 15–18 used the `<meta name="theme-color">` tag. **Safari/iOS 26
 * dropped support for it** — the tag still parses but the value is ignored.
 * Instead, Safari 26 tints the chrome by SAMPLING the rendered page:
 *
 *   1. It prefers the `background-color` of a `position: fixed` (or `sticky`,
 *      top bar only) element that:
 *        - touches the top or bottom viewport edge,
 *        - spans the full viewport width,
 *        - is at least ~6px tall,
 *        - and is actually VISIBLE: `display:none`, `opacity:0`, or being
 *          painted behind the body background (negative z-index) all
 *          disqualify it. If several fixed elements qualify at the same edge,
 *          which one wins is unreliable — hence our max z-index below.
 *   2. Otherwise it falls back to the `body` (then `html`) background-color.
 *   3. With no information at all it uses the system default (white in light
 *      mode).
 *
 * Crucially, sampling happens AT RENDER TIME and is not reliably re-run when
 * styles change from JavaScript. With a Next.js client-side navigation
 * (history.pushState + DOM swap, no page load) Safari can latch onto the
 * previous page's sample and then ignore every later change. We reproduced
 * this with /work -> /play: the DOM was provably correct after the navigation
 * (meta black, body black) while the chrome stayed grey, and NOTHING
 * unstuck it — meta content changes, meta tag recreation, viewport meta
 * recreation, scroll jiggles, forced reflows, resize/visibilitychange events
 * were all tried and all failed. Minimal standalone pages (same meta/body
 * changes, pushState included) always worked, so the latch is specific to
 * real-world pages with fixed elements at the edges (here: the full-screen
 * WebGL canvas wrapper, fixed nav, overlays).
 *
 * What DOES work on Safari 26 is inserting a FRESH fixed element at the edge:
 * that retriggers sampling. So on every route/color change this manager
 * recreates two invisible 8px "edge strips" pinned to the top and bottom of
 * the viewport with the desired color (see `edgeStrip`). Verified flows:
 * direct loads, /work -> menu -> /play, /play -> menu -> /work, plain
 * router.push both ways.
 *
 * The meta tag and html/body backgrounds are still maintained for Safari
 * 15–18, Chrome/Android, and for overscroll areas.
 *
 * ## Ownership rules
 *
 * - No layout or page may export `themeColor` in its viewport config. Next
 *   would render a second, React-managed meta tag; duplicates make Safari
 *   pick a stale color, and removing React's tag from here crashes React's
 *   own head cleanup on navigation. This manager's tag is marked with
 *   `data-theme-manager` and is the only one.
 * - html/body background colors are set inline here on every route change;
 *   nothing else should write them.
 *
 * ## Related fix (BubbleScene)
 *
 * drei's `<Environment preset="studio">` used to fetch its HDR from a
 * third-party CDN at runtime; when that fetch failed or hung during a
 * client-side navigation it crashed/suspended the canvas mid-transition,
 * which also left Safari's chrome latched on the previous color. The HDR is
 * now self-hosted (public/hdri/) and referenced via `files=`.
 */

// UI layers that visually cover the page (e.g. the white menu overlay) can
// temporarily override the route-based theme color so the iOS notch/status
// bar area matches what is actually on screen. Dispatch with
// `detail: '#ffffff'` to override, or `detail: null` to restore the route color.
export const THEME_COLOR_OVERRIDE_EVENT = 'theme-color-override';

export const overrideThemeColor = (color: string | null) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(THEME_COLOR_OVERRIDE_EVENT, { detail: color }),
  );
};

// Explicit sampling target for Safari 26's chrome tinting (see file header).
// The strip is REMOVED AND RECREATED on every change, never restyled in
// place: Safari samples at render time and ignores in-place style changes on
// existing elements after a client-side navigation, but inserting a fresh
// fixed element at the edge retriggers sampling. Empirical requirements, each
// of which made the strip get ignored when violated:
//   - negative z-index  -> treated as hidden (like opacity:0/display:none),
//     strip ignored entirely;
//   - default z-index   -> can lose to other fixed elements at the same edge
//     (the top edge kept the stale color while the bottom worked);
//   - max z-index       -> reliably wins at both edges.
// The strip always matches the color the page edge is supposed to have, sits
// in the safe-area region, and ignores pointer events, so it is visually and
// functionally imperceptible.
const edgeStrip = (position: 'top' | 'bottom', color: string) => {
  const id = `theme-edge-${position}`;
  document.getElementById(id)?.remove();
  const el = document.createElement('div');
  el.id = id;
  el.setAttribute('aria-hidden', 'true');
  // 8px tall: Safari requires a minimum of ~6px to accept the element as a
  // sampling source.
  el.style.cssText = `position:fixed;${position}:0;left:0;right:0;height:8px;z-index:2147483647;pointer-events:none;background-color:${color};`;
  document.body.appendChild(el);
};

const applyColor = (color: string) => {
  // html/body backgrounds cover overscroll areas and act as Safari 26's
  // sampling fallback when no qualifying fixed element exists.
  document.body.style.backgroundColor = color;
  document.documentElement.style.backgroundColor = color;

  // Primary mechanism for Safari/iOS 26+ (theme-color meta is ignored there).
  edgeStrip('top', color);
  edgeStrip('bottom', color);

  // theme-color meta for Safari 15-18 and other browsers (ignored by Safari
  // 26+). This manager is the ONLY owner of this tag — see ownership rules in
  // the file header.
  let meta = document.querySelector<HTMLMetaElement>(
    'meta[name="theme-color"][data-theme-manager]',
  );
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.setAttribute('data-theme-manager', 'true');
    document.head.appendChild(meta);
  }
  if (meta.content !== color) {
    meta.content = color;
  }
};

export default function ThemeColorManager() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // The override remembers which path it was set on: navigating always
  // dismisses overlay UI (e.g. selecting a page from the menu closes it), so
  // an override only applies while we are still on that path. This must not
  // rely on the overlay's "closed" event alone — that event races the
  // navigation, and if it gets lost or lands while the old pathname is still
  // current, the override would stick (e.g. menu -> PLAY kept a white notch
  // on a black page).
  const [override, setOverride] = useState<{
    color: string;
    path: string;
  } | null>(null);

  useEffect(() => {
    const onOverride = (e: Event) => {
      const color = (e as CustomEvent<string | null>).detail ?? null;
      setOverride(
        color ? { color, path: window.location.pathname } : null,
      );
    };
    window.addEventListener(THEME_COLOR_OVERRIDE_EVENT, onOverride);
    return () =>
      window.removeEventListener(THEME_COLOR_OVERRIDE_EVENT, onOverride);
  }, []);

  const overrideColor =
    override && override.path === pathname ? override.color : null;

  useEffect(() => {
    let color = '#fcfcfc'; // Default for About, Client, Daily, and Detail pages

    const isWork = pathname === '/work' || pathname?.startsWith('/work/');
    const isPlay = pathname === '/play' || pathname?.startsWith('/play/');

    // Detail context exists when the path has a slug or a ?project= param.
    const isWorkRoot = pathname === '/work';
    const isPlayRoot = pathname === '/play';
    const hasProjectParam = searchParams.has('project');
    const hasCardParam = searchParams.has('card');

    if (isWork) {
      if (isWorkRoot && !hasProjectParam && !hasCardParam) {
        color = '#efefef'; // Work Grid
      } else {
        color = '#fcfcfc'; // Work Detail (Slug or Param)
      }
    } else if (isPlay) {
      if (isPlayRoot && !hasProjectParam && !hasCardParam) {
        color = '#000000'; // Play Grid
      } else if (isPlayRoot && hasCardParam && !hasProjectParam) {
        color = '#000000'; // Card preview over the play grid stays black
      } else {
        color = '#fcfcfc'; // Play Detail (Slug or Param)
      }
    } else if (pathname === '/') {
      color = '#efefef';
    }

    applyColor(overrideColor ?? color);
  }, [pathname, searchParams, overrideColor]);

  return null;
}
