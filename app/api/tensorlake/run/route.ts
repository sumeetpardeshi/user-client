import { NextResponse } from "next/server";

import { getTensorlakeConfig } from "@/lib/env";
import { buildResearchTopicFromSymbols, resolveSymbolsInput } from "@/lib/tensorlake-payload";

interface RunBody {
  symbols: string;
  enableNiaDeep?: boolean;
}

/** Fire one immediate research_sentinel invocation (same payload shape as cron input_base64). */
export async function POST(request: Request) {
  try {
    const { apiKey, apiUrl, application } = getTensorlakeConfig();
    let body: RunBody;
    try {
      body = (await request.json()) as RunBody;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const rawSymbols = (body.symbols ?? "").trim();
    if (!rawSymbols) {
      return NextResponse.json({ error: "symbols is required" }, { status: 400 });
    }

    const parsed = resolveSymbolsInput(rawSymbols);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const invokePayload = {
      research_topic: buildResearchTopicFromSymbols(parsed.csv),
      enable_nia_deep: body.enableNiaDeep !== false,
    };

    const res = await fetch(`${apiUrl}/applications/${application}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(invokePayload),
    });

    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text.slice(0, 4000) };
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: "Tensorlake invoke failed", status: res.status, detail: json },
        { status: res.status },
      );
    }

    return NextResponse.json({ ok: true, result: json });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
