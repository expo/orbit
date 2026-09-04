/**
 * Reserved `__expo_*` query params are launcher commands that Expo Go and development builds
 * consume before the app receives the URL.
 */
const LAUNCH_TOKEN_PARAM = '__expo_launch_token';

type LaunchParams = {
  /** Single-use token that signs the launched client in. Minted per launch, never reused. */
  launchToken?: string;
};

/** Appends the reserved launch params to a launch URL. Returns the URL unchanged when there are none. */
export function appendLaunchParams(url: string, { launchToken }: LaunchParams): string {
  if (!launchToken) {
    return url;
  }
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${LAUNCH_TOKEN_PARAM}=${encodeURIComponent(launchToken)}`;
}
