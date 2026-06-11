'use client';

import React, { useState, useRef } from 'react';
import { ClientData } from '@/types/client';
import { useMotionValue } from 'framer-motion';
import { useIsMobile } from '@/hooks/useIsMobile';
import { ImageTrailOverlay } from './ui/ImageTrailOverlay';

interface ClientListProps {
  clients: ClientData[];
}

interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

const BUFFER = 100;
// Prohibits a line break, used to keep the dot glued to the last word
const WORD_JOINER = '\u2060';
// Invisible break opportunity; renders a "-" only when the line breaks there
const SOFT_HYPHEN = '\u00AD';
// Words at least this long get soft hyphens so they can break mid-word
const LONG_WORD_LENGTH = 8;

const withBreakPoints = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map((word) =>
      word.length >= LONG_WORD_LENGTH
        ? word.split('').join(SOFT_HYPHEN)
        : word,
    )
    .join(' ');

// A serif copy of one line fragment of the hovered name, painted absolutely
// over the (transparent) sans text so it never participates in layout.
interface OverlayFragment {
  text: string;
  left: number;
  top: number;
  lineHeight: number;
}

export default function ClientList({ clients }: ClientListProps) {
  const [hoveredClientId, setHoveredClientId] = useState<string | null>(null);
  const [hoverOverlay, setHoverOverlay] = useState<OverlayFragment[] | null>(
    null,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const isMobile = useIsMobile();

  // Shared mouse values (relative to container)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // State for the current interaction
  const [interactionState, setInteractionState] = useState<{
    initialX: number;
    initialY: number;
    bounds: Bounds;
  } | null>(null);

  // Measures one text in both fonts on a shared baseline (inheriting the
  // container's size/tracking). topDiff converts a sans fragment top into
  // the serif top for the same baseline; serifHeight is the serif content
  // height, used as line-height so the overlay box starts at its glyph top.
  const measureFragment = (text: string) => {
    const el = measureRef.current;
    if (!el) return { sans: 0, serif: 0, topDiff: 0, serifHeight: 0 };

    el.textContent = '';
    const make = (family: string) => {
      const span = document.createElement('span');
      span.style.fontFamily = family;
      span.style.fontWeight = '500';
      span.textContent = text;
      el.appendChild(span);
      return span;
    };
    const sansRect = make("'Value Sans'").getBoundingClientRect();
    const serifRect = make("'Value Serif'").getBoundingClientRect();
    el.textContent = '';

    return {
      sans: sansRect.width,
      serif: serifRect.width,
      topDiff: serifRect.top - sansRect.top,
      serifHeight: serifRect.height,
    };
  };

  // Tolerance when matching a measured candidate width against a fragment
  // rect width. Adjacent candidates differ by at least a character, so a
  // few pixels of slack (letter-spacing quirks, subpixels) are safe.
  const WIDTH_MATCH_TOLERANCE = 8;

  // Splits the rendered name into its current line fragments (text + box),
  // flagging fragments that end in a soft-hyphen line break.
  // Everything is derived from the element's own fragment rects (one border
  // box per line fragment, per CSSOM) plus our own width measurements:
  // Range-based geometry is unreliable around hyphenation points, so it is
  // not used at all. The text split per line is found by measuring which
  // break candidate (soft hyphen or space) reproduces the fragment's width.
  // Returns null when no candidate matches, so the caller can skip the
  // overlay instead of painting something wrong.
  const collectFragments = (el: HTMLElement, text: string) => {
    // Group the span's fragment rects into one box per line
    const rects = Array.from(el.getClientRects()).filter(
      (rect) => rect.width > 0,
    );
    const lineRects: {
      left: number;
      right: number;
      top: number;
      height: number;
    }[] = [];
    for (const rect of rects) {
      const last = lineRects[lineRects.length - 1];
      if (last && rect.top < last.top + last.height / 2) {
        last.left = Math.min(last.left, rect.left);
        last.right = Math.max(last.right, rect.right);
      } else {
        lineRects.push({
          left: rect.left,
          right: rect.right,
          top: rect.top,
          height: rect.height,
        });
      }
    }

    if (lineRects.length === 0) return null;
    if (lineRects.length === 1) {
      return [
        {
          text: text.replaceAll(SOFT_HYPHEN, ''),
          hyphen: false,
          left: lineRects[0].left,
          top: lineRects[0].top,
        },
      ];
    }

    // All positions where the browser may have broken the line
    const candidates: { end: number; nextStart: number; hyphen: boolean }[] =
      [];
    for (let i = 0; i < text.length; i++) {
      if (text[i] === SOFT_HYPHEN) {
        candidates.push({ end: i, nextStart: i + 1, hyphen: true });
      } else if (text[i] === ' ') {
        candidates.push({ end: i, nextStart: i + 1, hyphen: false });
      }
    }

    const fragments: {
      text: string;
      hyphen: boolean;
      left: number;
      top: number;
    }[] = [];
    let start = 0;

    for (let line = 0; line < lineRects.length; line++) {
      const { left, right, top } = lineRects[line];

      if (line === lineRects.length - 1) {
        fragments.push({
          text: text.slice(start).replaceAll(SOFT_HYPHEN, ''),
          hyphen: false,
          left,
          top,
        });
        break;
      }

      // Pick the break candidate whose rendered sans width matches this
      // line fragment's actual width.
      const target = right - left;
      let best: {
        candidate: (typeof candidates)[number];
        fragmentText: string;
        diff: number;
      } | null = null;
      for (const candidate of candidates) {
        if (candidate.end <= start) continue;
        const fragmentText = text
          .slice(start, candidate.end)
          .replaceAll(SOFT_HYPHEN, '');
        const rendered = fragmentText + (candidate.hyphen ? '-' : '');
        const diff = Math.abs(measureFragment(rendered).sans - target);
        if (!best || diff < best.diff) {
          best = { candidate, fragmentText, diff };
        }
      }
      if (!best || best.diff > WIDTH_MATCH_TOLERANCE) return null;

      fragments.push({
        text: best.fragmentText,
        hyphen: best.candidate.hyphen,
        left,
        top,
      });
      start = best.candidate.nextStart;
    }

    return fragments;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      mouseX.set(e.clientX - rect.left);
      mouseY.set(e.clientY - rect.top);
    }
  };

  const activateClient = (e: React.MouseEvent, client: ClientData) => {
    const container = containerRef.current;
    if (!container) return;

    const el = e.currentTarget as HTMLElement;
    const containerRect = container.getBoundingClientRect();
    const itemRect = el.getBoundingClientRect();

    // Calculate relative position
    const relX = e.clientX - containerRect.left;
    const relY = e.clientY - containerRect.top;

    // Update shared mouse values immediately
    mouseX.set(relX);
    mouseY.set(relY);

    // Calculate bounds relative to container
    const itemLeft = itemRect.left - containerRect.left;
    const itemTop = itemRect.top - containerRect.top;
    const itemRight = itemLeft + itemRect.width;
    const itemBottom = itemTop + itemRect.height;

    const bounds: Bounds = {
      minX: itemLeft - BUFFER,
      maxX: itemRight + BUFFER,
      minY: itemTop - BUFFER,
      maxY: itemBottom + BUFFER,
    };

    // Build the serif overlay from the current (sans) line fragments.
    // Every fragment is centered within its own slot so the hovered text
    // visually grows/shrinks from its center on each line.
    const displayName = withBreakPoints(client.clientName);
    const fragments = collectFragments(el, displayName);
    const overlay = fragments
      ? fragments.map((fragment) => {
          const m = measureFragment(fragment.text);
          const centerShift = (m.sans - m.serif) / 2;
          return {
            text: fragment.text + (fragment.hyphen ? '-' : ''),
            left: fragment.left - containerRect.left + centerShift,
            top: fragment.top - containerRect.top + m.topDiff,
            lineHeight: m.serifHeight,
          };
        })
      : null;

    setHoverOverlay(overlay);
    setInteractionState({
      initialX: relX,
      initialY: relY,
      bounds,
    });
    setHoveredClientId(client.id);
  };

  const handleMouseEnterClient = (e: React.MouseEvent, client: ClientData) => {
    if (isMobile) return;
    activateClient(e, client);
  };

  const handleClientClick = (e: React.MouseEvent, client: ClientData) => {
    if (!isMobile) return;

    // If clicking the already selected client, toggle off
    if (hoveredClientId === client.id) {
      setHoveredClientId(null);
      return;
    }

    activateClient(e, client);
  };

  const hoveredClient = clients.find((c) => c.id === hoveredClientId);

  return (
    <div
      ref={containerRef}
      className="relative block text-left text-xl md:text-2xl lg:text-3xl font-bold leading-normal tracking-wider text-gray-400"
      onMouseMove={handleMouseMove}
    >
      {/* Hidden measuring element (inherits font size / tracking) */}
      <span
        ref={measureRef}
        aria-hidden="true"
        className="invisible absolute left-0 top-0 whitespace-nowrap pointer-events-none"
      />

      {/* Overlay Component */}
      {hoveredClient && interactionState && hoveredClient.thumbnails && (
        <ImageTrailOverlay
          key={hoveredClient.id} // Re-mount on client change to reset springs
          images={hoveredClient.thumbnails}
          initialX={interactionState.initialX}
          initialY={interactionState.initialY}
          mouseX={mouseX}
          mouseY={mouseY}
          bounds={interactionState.bounds}
        />
      )}

      {/* Serif copy of the hovered name, painted over the transparent sans
          text. It is absolutely positioned, so the layout (and therefore the
          rest of the paragraph and the hover hit area) never changes. */}
      {hoveredClient &&
        hoverOverlay &&
        hoverOverlay.map((fragment, i) => (
          <span
            key={i}
            aria-hidden="true"
            className="absolute z-20 pointer-events-none whitespace-nowrap font-['Value_Serif'] font-medium text-[#B6B6B6]"
            style={{
              left: fragment.left,
              top: fragment.top,
              lineHeight: `${fragment.lineHeight}px`,
            }}
          >
            {fragment.text}
          </span>
        ))}

      {/* List Items.
          Plain inline text: left-aligns and wraps like a paragraph, and long
          words carry soft hyphens so they can break with a "-" at the line
          end. The hovered name only becomes transparent (the serif overlay
          above paints instead), so hovering never reflows anything. */}
      {clients.map((client) => {
        const isHovered = hoveredClientId === client.id;
        const displayName = withBreakPoints(client.clientName);

        return (
          <React.Fragment key={client.id}>
            <span
              className="relative z-20 text-[#B6B6B6] font-['Value_Sans'] font-medium"
              style={
                isHovered && hoverOverlay ? { color: 'transparent' } : undefined
              }
              onMouseEnter={(e) => handleMouseEnterClient(e, client)}
              onMouseLeave={() => !isMobile && setHoveredClientId(null)}
              onClick={(e) => handleClientClick(e, client)}
            >
              {displayName}
            </span>
            {WORD_JOINER}
            {/* The trailing space adds to the right-side gap, so the right
                margin is smaller to keep the dot visually centered */}
            <span className="relative z-20 ml-2 mr-0.5 md:ml-3 md:mr-1 text-[#B6B6B6] font-bold">
              .
            </span>{' '}
          </React.Fragment>
        );
      })}
      {/* No extra left margin: the preceding dot + space already provide
          the same gap the client names get */}
      <span className="relative z-20 text-[#B6B6B6] font-['Value_Sans'] font-medium">
        ETC...
      </span>
    </div>
  );
}
