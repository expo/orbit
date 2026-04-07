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
    const openURL = `${path}${search}`;
    const res = await fetch(
      `http://localhost:${port}/orbit/open?url=${encodeURIComponent(`https://${openURL}`)}`,
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
 */
export function openViaScheme(path: string, search: string): void {
  const deeplinkURL = `${SCHEME}/${path}${search}`;

  // Use a hidden iframe to attempt scheme launch (avoids full page navigation)
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = deeplinkURL;
  document.body.appendChild(iframe);

  setTimeout(() => {
    document.body.removeChild(iframe);
  }, 2000);

  // Backup: direct location change for browsers that block iframe schemes
  setTimeout(() => {
    window.location.href = deeplinkURL;
  }, 300);
}

/**
 * Build the full deeplink URL string.
 */
export function buildDeeplinkURL(path: string, search: string): string {
  return `${SCHEME}/${path}${search}`;
}
