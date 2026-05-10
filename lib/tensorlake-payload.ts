/**
 * Tensorlake application HTTP inputs must not contain `/` or `*` in arguments
 * (see https://docs.tensorlake.ai/applications/concepts).
 */

import { parseValidatedTickers, type ParsedTickers } from "@/lib/tickers";

export function resolveSymbolsInput(raw: string): ParsedTickers {
  return parseValidatedTickers(raw);
}

/** Human-readable list for the Nia query (already validated tickers only). */
export function buildResearchTopicFromSymbols(tickersCsv: string): string {
  return (
    `Equities brief for ${tickersCsv}. ` +
    `Horizon: last two trading sessions. ` +
    `Deliver: (1) what moved price and volume, (2) material earnings or guidance changes, ` +
    `(3) notable analyst or independent research shifts, (4) two concrete risks and one contrarian angle. ` +
    `Be specific to these tickers; avoid generic macro filler.`
  );
}
