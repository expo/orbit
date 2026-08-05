/**
 * Minimal client for the agent-device daemon that backs an `AGENT_DEVICE` EAS
 * Simulator session.
 *
 * The daemon speaks JSON-RPC 2.0 over `POST /rpc`, with every device verb routed
 * through a single `agent_device.command` method, and exposes `GET /health`. That
 * shape was read off the published `agent-device` bundle; the per-verb parameter
 * names are NOT a published contract, so every call here is best-effort and the
 * caller must handle failure. See `probeAsync` before relying on any of it.
 */

type JsonRpcResponse<T> = {
  jsonrpc: '2.0';
  id: string | number;
  result?: T;
  error?: { code: number; message: string };
};

export type AgentDeviceConnection = {
  url: string;
  token: string;
};

export class AgentDeviceError extends Error {}

let requestCounter = 0;

async function callAsync<T>(
  connection: AgentDeviceConnection,
  command: string,
  params: Record<string, unknown> = {},
  { timeoutMs = 120000 }: { timeoutMs?: number } = {}
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(new URL('/rpc', connection.url).toString(), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${connection.token}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: `orbit-${requestCounter++}`,
        method: 'agent_device.command',
        params: { command, ...params },
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new AgentDeviceError(
        `The simulator daemon rejected the request (HTTP ${response.status}).`
      );
    }

    const body = (await response.json()) as JsonRpcResponse<T>;
    if (body.error) {
      throw new AgentDeviceError(body.error.message);
    }

    return body.result as T;
  } catch (error) {
    if (error instanceof AgentDeviceError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AgentDeviceError('The simulator daemon did not respond in time.');
    }
    throw new AgentDeviceError(
      error instanceof Error ? error.message : 'Could not reach the simulator daemon.'
    );
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Confirms the daemon is reachable before Orbit offers daemon-backed actions.
 * The protocol is unverified, so the UI should treat a failure here as "this
 * session is preview-only" rather than as an error worth showing.
 */
export async function probeAsync(connection: AgentDeviceConnection): Promise<boolean> {
  try {
    const response = await fetch(new URL('/health', connection.url).toString(), {
      headers: { authorization: `Bearer ${connection.token}` },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Asks the remote VM to download and install a build itself, so Orbit never has
 * to upload the artifact. This is the path that would let a Windows or Linux user
 * run an iOS build without a Mac.
 */
export async function installFromSourceAsync(
  connection: AgentDeviceConnection,
  { url, platform = 'ios' }: { url: string; platform?: 'ios' | 'android' }
): Promise<void> {
  await callAsync(connection, 'install-from-source', { url, platform }, { timeoutMs: 600000 });
}

export async function openAppAsync(
  connection: AgentDeviceConnection,
  { appId, platform = 'ios' }: { appId: string; platform?: 'ios' | 'android' }
): Promise<void> {
  await callAsync(connection, 'open', { app: appId, platform });
}
