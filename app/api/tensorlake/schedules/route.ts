import { NextResponse } from "next/server";

import { getTensorlakeConfig } from "@/lib/env";
import { buildResearchTopicFromSymbols, resolveSymbolsInput } from "@/lib/tensorlake-payload";

export async function GET() {
  try {
    const { apiKey, apiUrl, application } = getTensorlakeConfig();
    const res = await fetch(`${apiUrl}/applications/${application}/cron-schedules`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
    });
    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json(
        { error: "Tensorlake list failed", status: res.status, detail: text.slice(0, 2000) },
        { status: res.status },
      );
    }
    const data = JSON.parse(text) as { schedules?: unknown[] };
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

interface CreateBody {
  cronExpression: string;
  symbols: string;
  enableNiaDeep?: boolean;
}

export async function POST(request: Request) {
  try {
    const { apiKey, apiUrl, application } = getTensorlakeConfig();
    let body: CreateBody;
    try {
      body = (await request.json()) as CreateBody;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const cron = (body.cronExpression ?? "").trim();
    if (!cron) {
      return NextResponse.json({ error: "cronExpression is required" }, { status: 400 });
    }

    const rawSymbols = (body.symbols ?? "").trim();
    if (!rawSymbols) {
      return NextResponse.json({ error: "symbols is required (e.g. TSLA, NVDA)" }, { status: 400 });
    }

    const parsed = resolveSymbolsInput(rawSymbols);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const researchTopic = buildResearchTopicFromSymbols(parsed.csv);

    const invokePayload = {
      research_topic: researchTopic,
      enable_nia_deep: body.enableNiaDeep !== false,
    };

    const inputBase64 = Buffer.from(JSON.stringify(invokePayload), "utf-8").toString("base64");

    const payload = {
      cron_expression: cron,
      input_base64: inputBase64,
    };

    const res = await fetch(`${apiUrl}/applications/${application}/cron-schedules`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    if (!res.ok) {
      return NextResponse.json(
        { error: "Tensorlake create failed", status: res.status, detail: text.slice(0, 4000) },
        { status: res.status },
      );
    }

    const data = JSON.parse(text) as { schedule_id?: string; id?: string };
    return NextResponse.json({
      ...data,
      schedule_id: data.schedule_id ?? data.id,
      invoke_preview: invokePayload,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
