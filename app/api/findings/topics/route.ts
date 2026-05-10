import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { getSupabaseConfig } from "@/lib/env";

export async function GET() {
  try {
    const { url, serviceRoleKey, briefRunsTable } = getSupabaseConfig();
    const sb = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await sb
      .from(briefRunsTable)
      .select("research_topic, inserted_at")
      .not("research_topic", "is", null)
      .order("inserted_at", { ascending: false })
      .limit(80);

    if (error) {
      return NextResponse.json({ topics: [] as string[] });
    }

    const seen = new Set<string>();
    const topics: string[] = [];
    for (const row of data ?? []) {
      const t = typeof row.research_topic === "string" ? row.research_topic.trim() : "";
      if (t && !seen.has(t)) {
        seen.add(t);
        topics.push(t);
      }
    }

    return NextResponse.json({ topics });
  } catch {
    return NextResponse.json({ topics: [] as string[] });
  }
}
