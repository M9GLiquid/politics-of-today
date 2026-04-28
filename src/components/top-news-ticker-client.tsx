"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { UI_CONFIG } from "@/lib/constants";

export type TopTickerItem = {
  id: string;
  href: string;
  label: string;
  tone: "world" | "nation" | "changelog";
  title: string;
  summary: string;
  badge?: {
    label: string;
    className: string;
  } | null;
};

type TopNewsTickerClientProps = {
  items: TopTickerItem[];
};

function toneClasses(tone: TopTickerItem["tone"]) {
  if (tone === "world") {
    return "bg-sky-500/15 text-sky-700 dark:text-sky-300";
  }
  if (tone === "nation") {
    return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300";
  }
  return "bg-violet-500/15 text-violet-700 dark:text-violet-300";
}

export function TopNewsTickerClient({ items }: TopNewsTickerClientProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current) {
        return;
      }

      const target = event.target;
      if (target instanceof Node && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onEscape);

    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onEscape);
    };
  }, [menuOpen]);

  const sequenceRepeatFactor = Math.max(
    2,
    UI_CONFIG.topNewsTicker.sequenceRepeatFactor,
  );

  const renderItems = useMemo(() => {
    return Array.from({ length: sequenceRepeatFactor }, () => items).flat();
  }, [items, sequenceRepeatFactor]);

  if (items.length === 0) {
    return null;
  }

  const durationSec = Math.max(
    items.length * UI_CONFIG.topNewsTicker.secondsPerItem,
    UI_CONFIG.topNewsTicker.minDurationSec,
  );
  const marqueeStyle = {
    ["--ticker-duration" as string]: `${durationSec}s`,
    ["--ticker-total-items" as string]: String(renderItems.length),
    ["--ticker-sequence-repeat-factor" as string]: String(sequenceRepeatFactor),
    ["--ticker-reduced-motion-multiplier" as string]: String(
      UI_CONFIG.topNewsTicker.reducedMotionDurationMultiplier,
    ),
  } as React.CSSProperties;

  const renderSlide = (item: TopTickerItem) => (
    <Link
      href={item.href}
      className="group inline-flex h-11 w-full shrink-0 items-center justify-center rounded-md px-3 py-1.5 text-zinc-700 transition-colors hover:bg-white hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
    >
      <span className="flex min-w-0 max-w-[58rem] items-center gap-2">
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${toneClasses(item.tone)}`}>
          {item.label}
        </span>
        {item.badge ? (
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${item.badge.className}`}
          >
            {item.badge.label}
          </span>
        ) : null}
        <span className="truncate text-xs font-semibold text-zinc-800 dark:text-zinc-100">{item.title}</span>
        <span className="truncate text-[11px] text-zinc-500 dark:text-zinc-400">{item.summary}</span>
      </span>
    </Link>
  );

  return (
    <div
      aria-label="Latest world, nation, and changelog news"
      className="news-ticker relative z-[70] border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="news-ticker-viewport px-2 py-1.5 pr-24">
        <div className="news-marquee" style={marqueeStyle}>
          {renderItems.map((item, idx) => (
            <div className="news-marquee-item" key={`${item.id}-${idx}`}>
              {renderSlide(item)}
            </div>
          ))}
        </div>
      </div>

      <div ref={menuRef} className="absolute right-2 top-1/2 z-40 -translate-y-1/2">
        <button
          type="button"
          aria-label="Choose news feed"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((prev) => !prev)}
          className="flex h-7 cursor-pointer items-center justify-center rounded-md border border-zinc-300 bg-white px-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-700 shadow-sm transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          News
        </button>
        {menuOpen ? (
          <div
            role="menu"
            aria-label="News feeds"
            className="absolute right-0 top-[calc(100%+0.4rem)] w-72 rounded-lg border border-zinc-300 bg-white p-1.5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
          >
            {items.map((item) => (
              <Link
                key={`menu-${item.id}`}
                href={item.href}
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="block rounded-md px-2 py-1.5 text-xs text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/70 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
              >
                <span className="flex items-center gap-2 font-semibold">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${toneClasses(item.tone)}`}>
                    {item.label}
                  </span>
                  {item.badge ? (
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${item.badge.className}`}
                    >
                      {item.badge.label}
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block truncate text-zinc-500 dark:text-zinc-400">
                  {item.title}
                </span>
                <span className="block truncate text-[11px] text-zinc-500/90 dark:text-zinc-400">
                  {item.summary}
                </span>
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      <span className="sr-only">Top news ticker</span>
    </div>
  );
}
