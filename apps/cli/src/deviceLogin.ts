import { Config } from 'common-types';
import { getDevLauncherVersionAsync } from 'eas-shared';

import { getSessionSecret } from './storage';

// TODO: Use a client ID of its own when the server has one for development builds.
const CLIENT_ID = 'expo-go';
// TODO: Replace with the first SDK 58 release of `expo-dev-launcher` that reads the params.
const MIN_DEV_LAUNCHER_VERSION = [58, 0, 22];

export function isSupportedVersion(version: string | null): boolean {
  const parts = version?.split('.').map((part) => parseInt(part, 10)) ?? [];
  for (let i = 0; i < MIN_DEV_LAUNCHER_VERSION.length; i++) {
    const part = parts[i] ?? 0;
    if (Number.isNaN(part) || part !== MIN_DEV_LAUNCHER_VERSION[i]) {
      return part > MIN_DEV_LAUNCHER_VERSION[i];
    }
  }
  return true;
}

async function postAsync<T>(path: string, body: object): Promise<T> {
  const response = await fetch(`${Config.api.origin}/v2/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'expo-session': getSessionSecret() ?? '' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(5000),
  });
  const json = await response.json();
  if (!response.ok || !json?.data) {
    throw new Error(json?.errors?.[0]?.message ?? `HTTP ${response.status}`);
  }
  return json.data;
}

/**
 * Adds the `__expo_device_*` params to a development build launch URL. Orbit creates an OAuth
 * device code and approves it with its own session. The launcher exchanges the code for a session
 * of its own. Use it only for a simulator or an emulator: the launcher ignores the params on a
 * device, so the approved code would stay unused. A failure returns the URL unchanged.
 *
 * The result contains an approved code: do not log it.
 */
export async function withDeviceLoginParamsAsync(url: string, appPath: string): Promise<string> {
  if (!getSessionSecret() || !isSupportedVersion(await getDevLauncherVersionAsync(appPath))) {
    return url;
  }

  try {
    const device = await postAsync<{ device_code: string; user_code: string }>(
      'device_authorization',
      { client_id: CLIENT_ID, device_name: 'Development build' }
    );
    const { device_verification_id } = await postAsync<{ device_verification_id: string }>(
      'device-verifications/lookup',
      { user_code: device.user_code }
    );
    const { match_value } = await postAsync<{ match_value?: string }>(
      'device-verifications/decide',
      { device_verification_id, decision: 'approve' }
    );
    if (!device.device_code || !match_value) {
      return url;
    }
    const params = new URLSearchParams({
      __expo_device_code: device.device_code,
      __expo_device_match: match_value,
      __expo_device_client: CLIENT_ID,
    });
    return `${url}${url.includes('?') ? '&' : '?'}${params}`;
  } catch {
    return url;
  }
}
