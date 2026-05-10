/**
 * US-style equity tickers for watchlist input (strict, easy to index and query).
 * Allows optional class suffix: BRK.B, BF.B (one dot, single trailing letter).
 * No digits, no slashes, no wildcards (safe for Tensorlake application HTTP args).
 */

export const MAX_TICKERS = 20;

/** 1–5 letters, optional `.` + one letter (class shares). */
const TICKER_TOKEN_RE = /^[A-Z]{1,5}(\.[A-Z])?$/;

export type ParsedTickers =
  | { ok: true; tickers: string[]; csv: string }
  | { ok: false; error: string };

export function parseValidatedTickers(raw: string): ParsedTickers {
  const tokens = raw
    .split(/[\s,]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  if (tokens.length === 0) {
    return { ok: false, error: "Enter at least one ticker (e.g. TSLA, NVDA)." };
  }
  if (tokens.length > MAX_TICKERS) {
    return { ok: false, error: `At most ${MAX_TICKERS} tickers.` };
  }

  for (const t of tokens) {
    if (!TICKER_TOKEN_RE.test(t)) {
      return {
        ok: false,
        error: `Invalid ticker "${t}". Use 1–5 letters A–Z, or class shares like BRK.B (letters and one dot only).`,
      };
    }
  }

  const dedup = [...new Set(tokens)];
  return { ok: true, tickers: dedup, csv: dedup.join(", ") };
}

export const TICKER_INPUT_HINT =
  "Letters A–Z only. Examples: TSLA, NVDA, BRK.B. Separate with commas or spaces.";
