"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { RadarBudgetRow } from "@/lib/budget-radar";
import type { NationalFiscalEnvelope } from "@/lib/national-economy";

const EMPTY_RADAR_ROWS: RadarBudgetRow[] = [];

type Props = {
  radarRows: RadarBudgetRow[];
  fiscalEnvelope: NationalFiscalEnvelope;
  /** From server (logged-in voters only) */
  completedSlugsServer: string[];
  votingMonth: string;
  guestMode: boolean;
  /** Shorter footer (e.g. nation carousel). */
  compactCopy?: boolean;
};

function fmtBillions(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

function fmtTotalAnnual(n: number): string {
  return n.toFixed(1);
}

function fmtPopulationNet(n: number): string {
  const sign = n >= 0 ? "+" : "−";
  const abs = Math.abs(n);
  return `${sign}${abs.toFixed(3)}`;
}

export function CategoryRadar({
  radarRows,
  fiscalEnvelope,
  completedSlugsServer,
  guestMode,
  compactCopy = false,
}: Props) {
  const router = useRouter();
  const rows = Array.isArray(radarRows) ? radarRows : EMPTY_RADAR_ROWS;

  const completed = useMemo(
    () => new Set(completedSlugsServer),
    [completedSlugsServer],
  );

  const data = rows;

  /** Scale radius to the data: largest category sits just inside the outer ring. */
  const radiusDomainMax = useMemo(() => {
    let max = 0;
    for (const row of rows) {
      if (row.pctOfFullBudget > max) max = row.pctOfFullBudget;
    }
    if (max <= 0) return 100;
    // ~6% headroom so the peak spoke reads as “almost” touching the opposite side.
    return max * 1.06;
  }, [rows]);

  const voterLabel = useMemo(
    () => fiscalEnvelope.displayVoterCount.toLocaleString("en-US"),
    [fiscalEnvelope.displayVoterCount],
  );

  const popNetLabel = useMemo(
    () => fmtPopulationNet(fiscalEnvelope.populationNetAnnual),
    [fiscalEnvelope.populationNetAnnual],
  );

  const tickRenderer = useMemo(() => {
    function Tick(props: {
      x?: number | string;
      y?: number | string;
      payload?: { value?: unknown; coordinate?: number };
      textAnchor?: string;
      index?: number;
    }) {
      const x = Number(props.x);
      const y = Number(props.y);
      const textAnchor = String(props.textAnchor ?? "middle");
      const index = props.index;
      const payload = props.payload;
      const label =
        typeof payload === "object" &&
        payload !== null &&
        "value" in payload
          ? String(payload.value)
          : "";

      // Recharts tick `index` often does not match `data` order; resolve by label (category name).
      let row = data.find((r) => r.name === label);
      if (
        !row &&
        typeof index === "number" &&
        index >= 0 &&
        index < data.length
      ) {
        row = data[index];
      }
      if (!row) return null;

      const done = completed.has(row.slug);
      const href = `/categories/${row.slug}`;

      const labelClass = done
        ? "fill-teal-700 decoration-teal-500/50 dark:fill-teal-300 dark:decoration-teal-400/40"
        : "fill-zinc-800 decoration-zinc-400 dark:fill-zinc-100 dark:decoration-zinc-600";

      return (
        <g className="recharts-layer recharts-polar-angle-axis-ticks">
          <a
            href={href}
            onClick={(e) => {
              e.preventDefault();
              router.push(href);
            }}
            className="cursor-pointer outline-none"
          >
            <text
              x={x}
              y={y}
              dy={4}
              textAnchor={textAnchor as "start" | "middle" | "end"}
              className={`cursor-pointer text-[11px] font-semibold underline underline-offset-2 hover:fill-teal-700 dark:hover:fill-teal-300 ${labelClass}`}
            >
              <tspan>{label}</tspan>
              {done ? (
                <tspan
                  className="fill-current text-[9px] font-bold tracking-tight"
                  dx={5}
                  aria-hidden="true"
                >
                  {" voted"}
                </tspan>
              ) : null}
            </text>
          </a>
        </g>
      );
    }
    return Tick;
  }, [completed, data, router]);

  return (
    <div className="relative mx-auto w-full min-w-0 max-w-[min(100%,520px)]">
      <div className="aspect-square w-full min-h-[240px] min-w-0">
        <ResponsiveContainer
          width="100%"
          height="100%"
          minWidth={0}
          minHeight={240}
          initialDimension={{ width: 360, height: 360 }}
        >
          <RadarChart cx="50%" cy="50%" outerRadius="68%" data={data}>
            <PolarGrid
              stroke="currentColor"
              className="text-zinc-200 dark:text-zinc-700"
            />
            <PolarAngleAxis dataKey="name" tick={tickRenderer} />
            <PolarRadiusAxis
              angle={90}
              domain={[0, radiusDomainMax]}
              tickCount={5}
              tickFormatter={(v) => `${Number(v).toFixed(1)}%`}
              stroke="currentColor"
              className="text-[10px] text-zinc-400 dark:text-zinc-500"
            />
            <Tooltip
              formatter={(value) => {
                const n = typeof value === "number" ? value : Number(value);
                const safe = Number.isFinite(n) ? n : 0;
                return [
                  `${safe.toFixed(1)}% of this nation's budget envelope`,
                  "This category",
                ];
              }}
              contentStyle={{
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Radar
              name="Budget share"
              dataKey="pctOfFullBudget"
              stroke="#0d9488"
              fill="#14b8a6"
              fillOpacity={0.35}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 space-y-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
        {compactCopy ? (
          <p>
            This nation&apos;s envelope ≈{" "}
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {fmtTotalAnnual(fiscalEnvelope.totalAnnual)}
            </span>{" "}
            abstract bn/yr from static revenue plus{" "}
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {voterLabel}
            </span>{" "}
            voters here.
            {fiscalEnvelope.usedSyntheticVoterCount ? (
              <>
                {" "}
                <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">
                  REGISTERED_VOTER_COUNT
                </code>{" "}
                split across nations.
              </>
            ) : null}{" "}
            Teal <span className="font-medium text-teal-800 dark:text-teal-200">voted</span> labels
            match your month (
            {guestMode ? "log in to record votes" : "saved when logged in"}).
          </p>
        ) : (
          <>
            <p>
              Spokes use the same budget shares as before; the chart scales the
              outer ring to the largest category so differences read clearly. The
              envelope is{" "}
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                taxes {fmtBillions(fiscalEnvelope.taxesAnnual)}
              </span>
              ,{" "}
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                exports +{fmtBillions(fiscalEnvelope.exportsAnnual)}
              </span>
              ,{" "}
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                imports −{fmtBillions(fiscalEnvelope.importsAnnual)}
              </span>{" "}
              (abstract bn/yr), plus a net{" "}
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {popNetLabel}
              </span>{" "}
              from{" "}
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {voterLabel}
              </span>{" "}
              voters in this nation. New registrations are a short fiscal drag
              until they integrate, then contribution ramps up.
              {fiscalEnvelope.usedSyntheticVoterCount ? (
                <>
                  {" "}
                  <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">
                    REGISTERED_VOTER_COUNT
                  </code>{" "}
                  is overriding the live voter curve (split across nations).
                </>
              ) : null}
            </p>
            <p>
              Total envelope ≈{" "}
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {fmtTotalAnnual(fiscalEnvelope.totalAnnual)}
              </span>{" "}
              abstract bn/yr. Teal labels with{" "}
              <span className="font-medium text-teal-800 dark:text-teal-200">
                voted
              </span>{" "}
              mean you recorded this month; plain labels are still open (
              {guestMode ? "log in to record votes" : "saved when logged in"}).
            </p>
          </>
        )}
      </div>
    </div>
  );
}
