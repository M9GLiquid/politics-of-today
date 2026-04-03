"use client";

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { CategoryRadar } from "@/components/category-radar";
import type { RadarBudgetRow } from "@/lib/budget-radar";
import type { NationalFiscalEnvelope } from "@/lib/national-economy";

export type NationFiscalSnapshot = {
  nationId: string;
  slug: string;
  name: string;
  fiscalEnvelope: NationalFiscalEnvelope;
  radarRows: RadarBudgetRow[];
};

type Props = {
  snapshots: NationFiscalSnapshot[];
  /** Opens this nation on first mount when present. */
  initialNationId?: string | null;
  completedSlugsServer: string[];
  votingMonth: string;
  guestMode: boolean;
};

function startIndexFor(
  list: NationFiscalSnapshot[],
  initialNationId: string | null | undefined,
): number {
  if (list.length === 0) return 0;
  if (initialNationId) {
    const found = list.findIndex((s) => s.nationId === initialNationId);
    if (found >= 0) return found;
  }
  return 0;
}

export function NationFiscalCarousel({
  snapshots,
  initialNationId,
  completedSlugsServer,
  votingMonth,
  guestMode,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(() =>
    startIndexFor(snapshots, initialNationId),
  );

  const snapshotIdsKey = useMemo(
    () => snapshots.map((s) => s.nationId).join(","),
    [snapshots],
  );

  const scrollToIndex = useCallback((next: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(next, snapshots.length - 1));
    const w = el.clientWidth;
    el.scrollTo({ left: clamped * w, behavior: "smooth" });
    setIndex(clamped);
  }, [snapshots.length]);

  useLayoutEffect(() => {
    if (snapshots.length === 0) return;
    const start = startIndexFor(snapshots, initialNationId);
    const el = scrollerRef.current;
    if (el && el.clientWidth > 0) {
      el.scrollLeft = start * el.clientWidth;
    }
    setIndex(start);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-align when nation list or default nation changes, not when radar payload refreshes
  }, [initialNationId, snapshotIdsKey]);

  const onScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || snapshots.length === 0) return;
    const w = el.clientWidth;
    if (w <= 0) return;
    const i = Math.round(el.scrollLeft / w);
    setIndex(Math.max(0, Math.min(i, snapshots.length - 1)));
  }, [snapshots.length]);

  if (snapshots.length === 0) {
    return (
      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        No nations configured.
      </p>
    );
  }

  return (
    <div className="relative mx-auto w-full min-w-0 max-w-[min(100%,520px)]">
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <button
          type="button"
          aria-label="Previous nation"
          onClick={() => scrollToIndex(index - 1)}
          disabled={index <= 0}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-lg text-zinc-700 shadow-sm transition enabled:hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 enabled:dark:hover:bg-zinc-800"
        >
          ‹
        </button>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <p className="truncate text-center text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            {snapshots[index]?.name}
          </p>
          <div className="flex flex-wrap justify-center gap-1.5">
            {snapshots.map((s, i) => (
              <button
                key={s.nationId}
                type="button"
                aria-label={`Show ${s.name}`}
                aria-current={i === index ? "true" : undefined}
                onClick={() => scrollToIndex(i)}
                className={`h-2 w-2 rounded-full transition ${
                  i === index
                    ? "bg-teal-600 dark:bg-teal-400"
                    : "bg-zinc-300 hover:bg-zinc-400 dark:bg-zinc-600 dark:hover:bg-zinc-500"
                }`}
              />
            ))}
          </div>
        </div>
        <button
          type="button"
          aria-label="Next nation"
          onClick={() => scrollToIndex(index + 1)}
          disabled={index >= snapshots.length - 1}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white text-lg text-zinc-700 shadow-sm transition enabled:hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 enabled:dark:hover:bg-zinc-800"
        >
          ›
        </button>
      </div>

      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="flex min-h-[280px] w-full snap-x snap-mandatory overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {snapshots.map((s) => (
          <div
            key={s.nationId}
            className="min-w-0 shrink-0 grow-0 basis-full snap-center snap-always"
          >
            <CategoryRadar
              radarRows={s.radarRows}
              fiscalEnvelope={s.fiscalEnvelope}
              completedSlugsServer={completedSlugsServer}
              votingMonth={votingMonth}
              guestMode={guestMode}
              compactCopy
            />
          </div>
        ))}
      </div>
    </div>
  );
}
