import { NextResponse } from "next/server";

import { getTensorlakeConfig } from "@/lib/env";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: Request, context: RouteParams) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Missing schedule id" }, { status: 400 });
    }
    const { apiKey, apiUrl, application } = getTensorlakeConfig();
    const res = await fetch(`${apiUrl}/applications/${application}/cron-schedules/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: "Tensorlake delete failed", status: res.status, detail: text.slice(0, 2000) },
        { status: res.status },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
