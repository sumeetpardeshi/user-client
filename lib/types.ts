export interface BriefRunRow {
  id: number;
  inserted_at: string;
  run_count: number;
  research_topic: string | null;
  key_takeaway: string;
  confidence_0_100: number;
  openai_model: string | null;
}

export interface ResearchFindingRow {
  id: number;
  inserted_at: string;
  run_count: number;
  last_checked_iso: string | null;
  research_topic: string | null;
  source: string;
  title: string;
  url: string | null;
  summary: string | null;
  fetched_at: string | null;
  raw: Record<string, unknown> | null;
  brief_run_id?: number | null;
  event_category?: string | null;
  sentiment?: string | null;
  event_at?: string | null;
}

export interface CronSchedule {
  id: string;
  application_name?: string;
  cron_expression: string;
  next_fire_time_ms?: number;
  last_fired_at_ms?: number | null;
  created_at?: number;
  enabled?: boolean;
}

/** One cron tick: brief header + findings linked by `brief_run_id`. */
export interface BriefRunWithFindings {
  brief: BriefRunRow;
  findings: ResearchFindingRow[];
}

export interface FindingsApiResponse {
  runs: BriefRunWithFindings[];
  /** Rows with no `brief_run_id` (older pipeline), within `hours` window. */
  legacy_findings: ResearchFindingRow[];
}
