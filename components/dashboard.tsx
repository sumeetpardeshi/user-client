"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { BriefRunWithFindings, CronSchedule, ResearchFindingRow } from "@/lib/types";
import { parseValidatedTickers, TICKER_INPUT_HINT } from "@/lib/tickers";

const CRON_PRESETS: { label: string; value: string }[] = [
  { label: "Every hour", value: "0 * * * *" },
  { label: "Every 6 hours", value: "0 */6 * * *" },
  { label: "Daily 6:00 UTC", value: "0 6 * * *" },
  { label: "Daily 12:00 UTC", value: "0 12 * * *" },
  { label: "Weekdays 7:00 UTC", value: "0 7 * * 1-5" },
];

function formatTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const CATEGORY_FILTERS = ["all", "market", "regulation", "company", "macro", "other"] as const;

function categoryFilterLabel(c: (typeof CATEGORY_FILTERS)[number]) {
  if (c === "all") return "All events";
  return c.charAt(0).toUpperCase() + c.slice(1);
}

function confidenceLabel(score: number) {
  if (score >= 85) return "High";
  if (score >= 70) return "Moderate–high";
  if (score >= 55) return "Moderate";
  if (score >= 40) return "Moderate–low";
  return "Low";
}

/** Overview timeline: green (solid), grey (uncertain), red (weak). */
function confidenceBand(score: number): "high" | "mid" | "low" {
  if (score >= 70) return "high";
  if (score < 45) return "low";
  return "mid";
}

function confidenceBadgeClass(score: number) {
  switch (confidenceBand(score)) {
    case "high":
      return "border-emerald-200 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-200/90 shadow-sm shadow-emerald-900/5";
    case "low":
      return "border-rose-200 bg-rose-50 text-rose-950 ring-1 ring-rose-200/90 shadow-sm shadow-rose-900/5";
    default:
      return "border-zinc-300 bg-zinc-100 text-zinc-800 ring-1 ring-zinc-200/80 shadow-sm shadow-zinc-900/5";
  }
}

function confidenceCaptionClass(score: number) {
  switch (confidenceBand(score)) {
    case "high":
      return "text-emerald-800";
    case "low":
      return "text-rose-800";
    default:
      return "text-zinc-600";
  }
}

function sourceStyle(source: string) {
  if (source.includes("merge")) return "bg-teal-100 text-teal-900 ring-teal-200";
  if (source.includes("deep")) return "bg-violet-100 text-violet-900 ring-violet-200";
  if (source.includes("web")) return "bg-sky-100 text-sky-900 ring-sky-200";
  return "bg-amber-100 text-amber-950 ring-amber-200";
}

function sentimentPillClass(s: string | null | undefined) {
  const v = (s ?? "").toLowerCase();
  if (v === "positive") return "bg-emerald-100 text-emerald-900 ring-emerald-200";
  if (v === "negative") return "bg-rose-100 text-rose-900 ring-rose-200";
  return "bg-zinc-100 text-zinc-700 ring-zinc-200";
}

function ChevronRight({ expanded, className }: { expanded: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
      className={`size-5 shrink-0 text-zinc-400 transition-transform duration-200 ${expanded ? "rotate-90" : ""} ${className ?? ""}`}
    >
      <path
        fillRule="evenodd"
        d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function TimelineFindingRow({ f }: { f: ResearchFindingRow }) {
  return (
    <div className="relative pl-6">
      <span
        className="absolute left-0 top-2 size-2.5 rounded-full bg-amber-500 shadow-[0_0_0_3px_rgba(245,158,11,0.25)]"
        aria-hidden
      />
      <p className="font-mono text-xs text-zinc-500">{formatTime(f.event_at ?? f.inserted_at)}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {f.event_category ? (
          <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-700 ring-1 ring-zinc-200">
            {f.event_category}
          </span>
        ) : null}
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ${sourceStyle(f.source)}`}>
          {f.source}
        </span>
        {f.sentiment ? (
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium capitalize ring-1 ${sentimentPillClass(f.sentiment)}`}
          >
            {f.sentiment}
          </span>
        ) : null}
      </div>
      <h4 className="mt-2 font-[family-name:var(--font-fraunces)] text-lg leading-snug text-zinc-900">{f.title}</h4>
      {f.summary ? (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-600">{f.summary}</p>
      ) : null}
      {f.url ? (
        <a
          href={f.url}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-xs font-medium text-amber-800 underline-offset-2 hover:underline"
        >
          Open source
        </a>
      ) : null}
    </div>
  );
}

function BriefingVideoPlaceholder() {
  return (
    <aside
      className="w-full max-w-xl lg:max-w-none lg:justify-self-end"
      aria-label="Video briefing placeholder"
    >
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-br from-zinc-100 to-zinc-200/80 shadow-inner ring-1 ring-zinc-900/5">
        <div className="relative flex aspect-video w-full flex-col items-center justify-center gap-2 px-6 py-8">
          <div
            className="flex size-14 items-center justify-center rounded-full border border-zinc-300/80 bg-white/90 text-zinc-500 shadow-sm"
            aria-hidden
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 size-7">
              <path d="M8 5v14l11-7L8 5z" />
            </svg>
          </div>
          <p className="font-[family-name:var(--font-fraunces)] text-base font-medium text-zinc-700">
            Video briefing
          </p>
          <p className="max-w-[16rem] text-center text-xs leading-relaxed text-zinc-500">
            Placeholder for a future narrated morning readout.
          </p>
        </div>
      </div>
    </aside>
  );
}

export function Dashboard() {
  const [symbols, setSymbols] = useState("TSLA");
  const [cron, setCron] = useState(CRON_PRESETS[0].value);
  const [enableDeep, setEnableDeep] = useState(true);
  const [runHistory, setRunHistory] = useState<BriefRunWithFindings[]>([]);
  const [legacyFindings, setLegacyFindings] = useState<ResearchFindingRow[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<(typeof CATEGORY_FILTERS)[number]>("all");
  const [schedules, setSchedules] = useState<CronSchedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Accordion: one brief run expanded at a time; newest by default when data changes. */
  const [openRunId, setOpenRunId] = useState<number | null>(null);

  useEffect(() => {
    setOpenRunId((prev) => {
      if (runHistory.length === 0) return null;
      if (prev && runHistory.some((r) => r.brief.id === prev)) return prev;
      return runHistory[0].brief.id;
    });
  }, [runHistory]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const totalEvents = useMemo(
    () =>
      runHistory.reduce((n, r) => n + r.findings.length, 0) +
      legacyFindings.length,
    [runHistory, legacyFindings],
  );

  const loadFindings = useCallback(async () => {
    setError(null);
    const params = new URLSearchParams({
      hours: "168",
      runs_limit: "40",
      category: categoryFilter,
      limit: "150",
    });
    const res = await fetch(`/api/findings?${params.toString()}`);
    const data = (await res.json()) as {
      runs?: BriefRunWithFindings[];
      legacy_findings?: ResearchFindingRow[];
      error?: string;
    };
    if (!res.ok) {
      setError(data.error ?? "Could not load findings");
      setRunHistory([]);
      setLegacyFindings([]);
      return;
    }
    setRunHistory(Array.isArray(data.runs) ? data.runs : []);
    setLegacyFindings(Array.isArray(data.legacy_findings) ? data.legacy_findings : []);
  }, [categoryFilter]);

  const loadTopics = useCallback(async () => {
    const res = await fetch("/api/findings/topics");
    const data = (await res.json()) as { topics?: string[] };
    if (res.ok && Array.isArray(data.topics)) setTopics(data.topics);
  }, []);

  const loadSchedules = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/tensorlake/schedules");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? data.detail ?? "Could not list schedules");
      setSchedules([]);
      return;
    }
    const list = Array.isArray(data) ? data : ((data.schedules ?? data) as CronSchedule[]);
    setSchedules(Array.isArray(list) ? list : []);
  }, []);

  useEffect(() => {
    void loadFindings();
    void loadSchedules();
    void loadTopics();
  }, [loadFindings, loadSchedules, loadTopics]);

  const guardTickers = useCallback((): boolean => {
    const r = parseValidatedTickers(symbols);
    if (!r.ok) {
      setError(r.error);
      return false;
    }
    return true;
  }, [symbols]);

  async function createSchedule() {
    if (!guardTickers()) return;
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/tensorlake/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cronExpression: cron,
          symbols,
          enableNiaDeep: enableDeep,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg =
          (typeof data.error === "string" && data.error) ||
          (typeof data.detail === "string"
            ? data.detail
            : data.detail != null
              ? JSON.stringify(data.detail)
              : "Schedule failed");
        setError(msg);
        return;
      }
      setMessage(`Scheduled. id: ${data.schedule_id ?? data.id ?? "ok"}`);
      await loadSchedules();
    } finally {
      setLoading(false);
    }
  }

  async function runNow() {
    if (!guardTickers()) return;
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/tensorlake/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols, enableNiaDeep: enableDeep }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg =
          (typeof data.error === "string" && data.error) ||
          (typeof data.detail === "string"
            ? data.detail
            : data.detail != null
              ? JSON.stringify(data.detail)
              : "Run failed");
        setError(msg);
        return;
      }
      setMessage("Research tick started. Refresh in a few minutes for new rows.");
      setTimeout(() => void loadFindings(), 8000);
    } finally {
      setLoading(false);
    }
  }

  async function deleteSchedule(id: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tensorlake/schedules/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Delete failed");
        return;
      }
      setMessage("Schedule removed.");
      await loadSchedules();
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="animate-rise mb-12 border-b border-zinc-200 pb-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,36%)] lg:items-center lg:gap-10">
          <div>
            <p className="font-[family-name:var(--font-fraunces)] text-sm tracking-[0.2em] text-amber-800 uppercase">
              Research brief
            </p>
            <h1 className="font-[family-name:var(--font-fraunces)] mt-2 text-4xl font-medium tracking-tight text-zinc-900 sm:text-5xl">
              {greeting}
            </h1>
            <p className="mt-3 max-w-2xl text-lg text-zinc-600">
              Set your tickers before bed. Cron wakes the agent; by morning, Supabase rows land here in a calm,
              scannable layout.
            </p>
          </div>
          <BriefingVideoPlaceholder />
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,340px)_1fr]">
        <section className="animate-rise space-y-6 rounded-2xl border border-zinc-200 bg-white/90 p-6 shadow-sm shadow-zinc-900/5 backdrop-blur-md [animation-delay:80ms]">
          <h2 className="font-[family-name:var(--font-fraunces)] text-xl text-zinc-900">Tonight&apos;s watchlist</h2>
          <label className="block text-sm text-zinc-600">
            Ticker symbols (comma or space)
            <textarea
              value={symbols}
              onChange={(e) => {
                setSymbols(e.target.value);
                setError(null);
              }}
              rows={3}
              autoComplete="off"
              spellCheck={false}
              className="mt-2 w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-sm tracking-wide text-zinc-900 outline-none ring-amber-400/0 transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
              placeholder="TSLA NVDA BRK.B"
            />
            <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">{TICKER_INPUT_HINT}</p>
          </label>

          <label className="block text-sm text-zinc-600">
            Cadence
            <select
              value={cron}
              onChange={(e) => setCron(e.target.value)}
              className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-zinc-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
            >
              {CRON_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label} ({p.value})
                </option>
              ))}
            </select>
          </label>

          <label className="flex cursor-pointer items-center gap-3 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={enableDeep}
              onChange={(e) => setEnableDeep(e.target.checked)}
              className="size-4 rounded border-zinc-300 bg-white accent-amber-600"
            />
            Include Nia deep research (slower, richer)
          </label>

          <div className="flex flex-col gap-3 pt-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => void createSchedule()}
              className="rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-amber-900/20 transition hover:brightness-105 disabled:opacity-50"
            >
              Save &amp; attach cron schedule
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => void runNow()}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 disabled:opacity-50"
            >
              Run once now
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => void loadFindings()}
              className="text-sm text-amber-800 underline-offset-4 hover:underline"
            >
              Refresh findings
            </button>
          </div>

          {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
          {error ? <p className="text-sm text-rose-700">{error}</p> : null}

          <div className="border-t border-zinc-200 pt-6">
            <h3 className="text-sm font-medium text-zinc-600">Recent brief topics</h3>
            <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs text-zinc-600">
              {topics.length === 0 ? (
                <li className="text-zinc-400">Topics appear after your first brief run.</li>
              ) : (
                topics.slice(0, 12).map((t) => (
                  <li key={t} className="truncate border-l border-amber-400 pl-2">
                    {t}
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="border-t border-zinc-200 pt-6">
            <h3 className="text-sm font-medium text-zinc-600">Active schedules</h3>
            <ul className="mt-3 space-y-2 text-sm text-zinc-700">
              {schedules.length === 0 ? (
                <li className="text-zinc-400">None yet — create one above.</li>
              ) : (
                schedules.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-start justify-between gap-2 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2"
                  >
                    <div>
                      <p className="font-mono text-xs text-amber-800">{s.cron_expression}</p>
                      {s.next_fire_time_ms ? (
                        <p className="text-xs text-zinc-500">
                          Next: {formatTime(new Date(s.next_fire_time_ms).toISOString())}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="shrink-0 text-xs text-rose-700 hover:underline"
                      onClick={() => void deleteSchedule(s.id)}
                    >
                      Remove
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </section>

        <section className="animate-rise min-w-0 space-y-5 [animation-delay:140ms]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-amber-800">
                Overnight brief history
              </p>
              <h2 className="font-[family-name:var(--font-fraunces)] mt-1 text-2xl text-zinc-900 sm:text-3xl">
                Scrollable runs
              </h2>
              <p className="mt-2 max-w-xl text-xs text-zinc-500">
                Newest tick first. Loads up to 40 brief runs plus legacy rows (no brief link) from the last 7
                days. Use filters to narrow categories.
              </p>
            </div>
            <span className="shrink-0 text-xs text-zinc-400">
              {runHistory.length} runs · {totalEvents} events
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {CATEGORY_FILTERS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategoryFilter(c)}
                className={
                  categoryFilter === c
                    ? "rounded-full bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-950 ring-1 ring-amber-300"
                    : "rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-600 ring-1 ring-zinc-200 transition hover:bg-zinc-200/80"
                }
              >
                {categoryFilterLabel(c)}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-1 border-b border-zinc-200 pb-3 sm:flex-row sm:items-end sm:justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Overview timeline</h3>
            <p className="text-[11px] text-zinc-400">
              Tap a run to expand. Green 70+, grey 45–69, red under 45 confidence.
            </p>
          </div>

          <div className="max-h-[min(70vh,56rem)] overflow-y-auto overscroll-y-contain rounded-2xl border border-zinc-200 bg-zinc-50/90 p-3 shadow-inner sm:p-4 [scrollbar-gutter:stable]">
            {runHistory.length === 0 && legacyFindings.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center text-zinc-500">
                No runs yet. After the agent writes briefs to Supabase, refresh — history appears here.
              </div>
            ) : (
              <div className="space-y-2">
                {runHistory.map((run) => {
                  const isOpen = openRunId === run.brief.id;
                  const topic = run.brief.research_topic?.trim() || "Research brief";
                  const n = run.findings.length;
                  const score = run.brief.confidence_0_100;
                  return (
                    <article
                      key={run.brief.id}
                      className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
                    >
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        onClick={() =>
                          setOpenRunId((cur) => (cur === run.brief.id ? null : run.brief.id))
                        }
                        className="flex w-full items-start gap-3 px-3 py-3 text-left transition hover:bg-zinc-50 sm:gap-4 sm:px-4 sm:py-3.5"
                      >
                        <span className="mt-0.5">
                          <ChevronRight expanded={isOpen} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-medium uppercase tracking-wider text-amber-800">
                            Run #{run.brief.run_count}
                          </p>
                          <h4 className="font-[family-name:var(--font-fraunces)] mt-0.5 line-clamp-2 text-base leading-snug text-zinc-900 sm:text-lg">
                            {topic}
                          </h4>
                          <p className="mt-1 text-xs text-zinc-500">{formatTime(run.brief.inserted_at)}</p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                          <span
                            className={`rounded-lg px-2 py-1 font-mono text-xs tabular-nums ${confidenceBadgeClass(score)}`}
                          >
                            {score}
                            <span className="opacity-[0.65]">/100</span>
                          </span>
                          <span className="text-[11px] text-zinc-400">
                            {n} event{n === 1 ? "" : "s"}
                          </span>
                        </div>
                      </button>
                      {isOpen ? (
                        <div className="border-t border-zinc-200 px-3 pb-4 pt-1 sm:px-4">
                          <p className="mt-3 text-[11px] text-zinc-500">
                            Confidence{" "}
                            <span className={`font-semibold ${confidenceCaptionClass(score)}`}>
                              {confidenceLabel(score)}
                            </span>
                          </p>
                          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-4">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-900/80">
                              Key takeaway
                            </p>
                            <p className="mt-2 text-sm leading-relaxed text-zinc-800">{run.brief.key_takeaway}</p>
                          </div>
                          <div className="mt-5 space-y-8">
                            {n === 0 ? (
                              <p className="text-sm text-zinc-500">
                                No findings for this run
                                {categoryFilter !== "all" ? " in this category" : ""}.
                              </p>
                            ) : (
                              run.findings.map((f) => <TimelineFindingRow key={`${run.brief.id}-${f.id}`} f={f} />)
                            )}
                          </div>
                        </div>
                      ) : null}
                    </article>
                  );
                })}

                {legacyFindings.length > 0 ? (
                  <details className="group rounded-xl border border-dashed border-zinc-300 bg-zinc-50">
                    <summary className="cursor-pointer list-none px-3 py-3 marker:hidden sm:px-4 [&::-webkit-details-marker]:hidden">
                      <div className="flex items-center gap-3">
                        <ChevronRight expanded={false} className="group-open:rotate-90" />
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-semibold uppercase tracking-wider text-zinc-600">
                            Legacy rows
                          </h4>
                          <p className="mt-0.5 text-xs text-zinc-500">
                            {legacyFindings.length} finding{legacyFindings.length === 1 ? "" : "s"} without a brief
                            link
                          </p>
                        </div>
                      </div>
                    </summary>
                    <div className="border-t border-zinc-200 px-3 pb-4 pt-2 sm:px-4">
                      <p className="text-xs text-zinc-500">
                        Older pipeline or pre-migration rows — same filters apply.
                      </p>
                      <div className="mt-5 space-y-8">
                        {legacyFindings.map((f) => (
                          <TimelineFindingRow key={`legacy-${f.id}-${f.inserted_at}`} f={f} />
                        ))}
                      </div>
                    </div>
                  </details>
                ) : null}
              </div>
            )}
          </div>
        </section>
      </div>

      <footer className="mt-16 border-t border-zinc-200 pt-8 text-center text-xs text-zinc-400">
        Server holds API keys only — never ship Tensorlake or Supabase service keys to the browser.
      </footer>
    </main>
  );
}
