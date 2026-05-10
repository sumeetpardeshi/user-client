# Research Sentinel — client (Vercel)

Small **Next.js** dashboard: save ticker watchlists, create **Tensorlake cron schedules** (with per-run `research_topic` via [`input_base64`](https://docs.tensorlake.ai/applications/cron-scheduler)), run the agent once, and read **`research_sentinel_findings`** from **Supabase** for a morning-style briefing UI.

## Setup

```bash
cd user-client
npm install
cp .env.example .env.local
# fill TENSORLAKE_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
npm run dev
```

## Vercel

1. Import repo / connect Git; set **Root Directory** to `user-client` (or deploy this folder as its own project).
2. **Environment variables** (Production + Preview):

   | Name | Notes |
   |------|--------|
   | `TENSORLAKE_API_KEY` | Same key you use for `tl deploy` |
   | `TENSORLAKE_API_URL` | Optional, default `https://api.tensorlake.ai` |
   | `TENSORLAKE_APPLICATION_NAME` | Optional, default `research_sentinel` |
   | `SUPABASE_URL` | `https://<ref>.supabase.co` |
   | `SUPABASE_SERVICE_ROLE_KEY` | **Server only** — never expose to the browser |
   | `SUPABASE_FINDINGS_TABLE` | Optional, default `research_sentinel_findings` |

3. Deploy. Open the production URL.

**Security:** All Tensorlake and Supabase credentials stay in **Route Handlers** (`app/api/**`). The React UI only calls same-origin `/api/...`.

## Backend assumptions

- [`research-sentinel`](../research-sentinel) is deployed on Tensorlake as **`research_sentinel`** and accepts JSON body overrides (`research_topic`, `enable_nia_deep`) per your `tensorlake_app.py`.
- Cron `input_base64` is UTF-8 JSON, base64-encoded, matching Tensorlake’s [cron scheduler](https://docs.tensorlake.ai/applications/cron-scheduler) docs.
- Supabase table exists (see `research-sentinel/scripts/supabase_research_sentinel_findings.sql`). Service role bypasses RLS for reads/writes from the agent; this app uses the same key **only on the server** for the dashboard.

**Tensorlake note:** Application HTTP inputs must not include **`/`** or **`*`** in serialized arguments ([concepts](https://docs.tensorlake.ai/applications/concepts)). The API routes strip those from tickers and avoid them in generated `research_topic` text.

## API routes

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/findings` | Latest rows from Supabase |
| `GET` / `POST` | `/api/tensorlake/schedules` | List / create cron (body: `cronExpression`, `symbols`, `enableNiaDeep`) |
| `DELETE` | `/api/tensorlake/schedules/[id]` | Remove schedule |
| `POST` | `/api/tensorlake/run` | One-shot invoke with symbols |
