// The `apple-id-auth` CLI command streams `retry: <json>` lines while ipa-resign
// backs off a throttled Apple call (GSA 503). The menu bar parses them to show a
// live "retrying" notice instead of a silent spinner for ~15-30s.

export type AppleRetryInfo = {
  /** 1-based index of the attempt that just failed. */
  attempt: number;
  /** Total attempts before giving up. */
  maxAttempts: number;
  /** Milliseconds until the next attempt. */
  delayMs: number;
  /** HTTP status that triggered the retry; absent when the transport threw. */
  status?: number;
};

/** Parse one CLI stdout line. Returns null for any line that isn't a retry event. */
export function parseRetryLine(output: string): AppleRetryInfo | null {
  const match = output.match(/^retry:\s*(\{.*\})\s*$/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    if (typeof parsed.attempt === 'number' && typeof parsed.maxAttempts === 'number') {
      return parsed;
    }
  } catch {
    // A line that starts with `retry:` but isn't valid JSON isn't our event.
  }
  return null;
}

/** Short user-facing copy for the retry notice. */
export function retryNoticeMessage(info: AppleRetryInfo): string {
  return `Apple's servers are busy. Retrying… (${info.attempt} of ${info.maxAttempts})`;
}
