import { LOCAL_SERVER_PORTS, SCHEME } from '../constants';

/**
 * Attempt to open a deeplink in Orbit via the local HTTP server.
 * Returns true if the server responded successfully.
 */
export async function tryLocalServer(path: string, search: string): Promise<boolean> {
  const results = await Promise.all(
    LOCAL_SERVER_PORTS.map(async (port) => {
      try {
        const res = await fetch(`http://localhost:${port}/orbit/status`, {
          signal: AbortSignal.timeout(1500),
        });
        const data = (await res.json()) as { ok?: boolean };
        if (data.ok) return port;
      } catch {
        // Server not available on this port
      }
      return null;
    })
  );

  const port = results.find((p) => p !== null);
  if (!port) return false;

  try {
    // Build a full https URL that the local server will convert to an expo-orbit:// deeplink.
    // The local server replaces https:// with expo-orbit:// in LocalServer.ts.
    const deeplinkAsHttps = `https://orbit.expo.dev/${path}${search}`;
    const res = await fetch(
      `http://localhost:${port}/orbit/open?url=${encodeURIComponent(deeplinkAsHttps)}`,
      { signal: AbortSignal.timeout(3000) }
    );
    const data = (await res.json()) as { ok?: boolean };
    return data.ok === true;
  } catch {
    return false;
  }
}

/**
 * Open the deeplink via the custom URL scheme.
 * Uses window.location.href which will prompt the OS to open the registered handler.
 */
export function openViaScheme(path: string, search: string): void {
  const deeplinkURL = `${SCHEME}/${path}${search}`;
  window.location.href = deeplinkURL;
}

/**
 * Build the full deeplink URL string.
 */
export function buildDeeplinkURL(path: string, search: string): string {
  return `${SCHEME}/${path}${search}`;
}
