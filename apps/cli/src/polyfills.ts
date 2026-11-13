// The macOS CLI runs on Hermes through hermes-node (see hermes-launcher/), which
// doesn't provide Node's undici-based global `fetch`. node-fetch covers what the
// CLI uses (requests with headers, JSON bodies and AbortSignal timeouts).
import nodeFetch, { Headers, Request, Response } from 'node-fetch';

if (typeof globalThis.fetch !== 'function') {
  Object.assign(globalThis, { fetch: nodeFetch, Headers, Request, Response });
}
