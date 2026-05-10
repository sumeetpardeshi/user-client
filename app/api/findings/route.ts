import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { getSupabaseConfig } from "@/lib/env";
import type { BriefRunRow, BriefRunWithFindings, ResearchFindingRow } from "@/lib/types";

const FINDING_COLUMNS =
  "id, inserted_at, run_count, last_checked_iso, research_topic, source, title, url, summary, fetched_at, raw, brief_run_id, event_category, sentiment, event_at";

function findingTimeMs(f: ResearchFindingRow): number {
  const t = f.event_at ?? f.inserted_at;
  const d = t ? new Date(t).getTime() : 0;
  return Number.isNaN(d) ? 0 : d;
}

function sortFindingsChronological(rows: ResearchFindingRow[]): ResearchFindingRow[] {
  return [...rows].sort((a, b) => findingTimeMs(a) - findingTimeMs(b));
}

export async function GET(request: Request) {
  try {
    const { url, serviceRoleKey, findingsTable, briefRunsTable } = getSupabaseConfig();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit") ?? "120") || 120, 200);
    const hours = Math.min(Math.max(Number(searchParams.get("hours") ?? "168") || 168, 1), 720);
    const runsLimit = Math.min(Number(searchParams.get("runs_limit") ?? "30") || 30, 60);
    const category = (searchParams.get("category") ?? "all").trim().toLowerCase();

    const sb = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const sinceIso = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const briefRes = await sb
      .from(briefRunsTable)
      .select("id, inserted_at, run_count, research_topic, key_takeaway, confidence_0_100, openai_model")
      .order("inserted_at", { ascending: false })
      .limit(runsLimit);

    const briefRows = (!briefRes.error && briefRes.data ? briefRes.data : []) as BriefRunRow[];
    const briefIds = briefRows.map((b) => b.id).filter((id) => typeof id === "number");

    const runs: BriefRunWithFindings[] = [];

    if (briefIds.length > 0) {
      let findingsQuery = sb.from(findingsTable).select(FINDING_COLUMNS).in("brief_run_id", briefIds);

      if (category && category !== "all") {
        findingsQuery = findingsQuery.eq("event_category", category);
      }

      const { data: linkedFindings, error: findingsError } = await findingsQuery.limit(limit);

      if (findingsError) {
        return NextResponse.json({ error: findingsError.message }, { status: 500 });
      }

      const byBrief = new Map<number, ResearchFindingRow[]>();
      for (const row of (linkedFindings ?? []) as ResearchFindingRow[]) {
        const bid = row.brief_run_id;
        if (bid == null) continue;
        const list = byBrief.get(bid) ?? [];
        list.push(row);
        byBrief.set(bid, list);
      }

      for (const brief of briefRows) {
        const raw = byBrief.get(brief.id) ?? [];
        const findings = sortFindingsChronological(raw);
        runs.push({ brief, findings });
      }
    }

    let legacyQuery = sb
      .from(findingsTable)
      .select(FINDING_COLUMNS)
      .is("brief_run_id", null)
      .gte("inserted_at", sinceIso)
      .order("inserted_at", { ascending: false })
      .limit(Math.min(limit, 80));

    if (category && category !== "all") {
      legacyQuery = legacyQuery.eq("event_category", category);
    }

    const { data: legacyData, error: legacyError } = await legacyQuery;

    if (legacyError) {
      return NextResponse.json({ error: legacyError.message }, { status: 500 });
    }

    const legacy_findings = (legacyData ?? []) as ResearchFindingRow[];

    const body = {
      runs,
      legacy_findings,
    };

    return NextResponse.json(body);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
