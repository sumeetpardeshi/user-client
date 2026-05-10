function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return v;
}

export function getTensorlakeConfig() {
  return {
    apiKey: requireEnv("TENSORLAKE_API_KEY"),
    apiUrl: (process.env.TENSORLAKE_API_URL ?? "https://api.tensorlake.ai").replace(/\/$/, ""),
    application: (process.env.TENSORLAKE_APPLICATION_NAME ?? "research_sentinel").trim(),
  };
}

export function getSupabaseConfig() {
  return {
    url: requireEnv("SUPABASE_URL").replace(/\/$/, ""),
    serviceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    findingsTable: (process.env.SUPABASE_FINDINGS_TABLE ?? "research_sentinel_findings").trim(),
    briefRunsTable: (process.env.SUPABASE_BRIEF_RUNS_TABLE ?? "research_sentinel_brief_runs").trim(),
  };
}
