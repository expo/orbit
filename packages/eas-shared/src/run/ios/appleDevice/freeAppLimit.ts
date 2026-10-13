import { readProvisioningProfilePlist } from '../inspectApp';

// iOS allows three apps signed with a free Apple ID per device. The fourth
// install fails in installd with error -402620383, surfaced with two wordings:
// devicectl's stderr says "The maximum number of apps for free development
// profiles has been reached."; installation_proxy's ErrorDescription on the
// usbmux path says "This device has reached the maximum number of installed
// apps using a free developer profile: {( <app ids> )}".
export const FREE_APP_LIMIT = 3;

export const FREE_APP_LIMIT_MESSAGE =
  'This device already has three apps signed with a free Apple ID, which is Apple’s limit. Remove one of them to install this app.';

export function isFreeAppLimitError(text: string | undefined): boolean {
  return /maximum number of (installed )?apps (for|using a) free develop(ment|er) profile/i.test(
    text ?? ''
  );
}

/** `TEAMID.bundle.id` (an application identifier) → `bundle.id`. */
export function stripTeamPrefix(applicationIdentifier: string): string {
  return applicationIdentifier.replace(/^[A-Z0-9]{10}\./, '');
}

/**
 * The bundle ids iOS lists in the usbmux wording (`{( "a", "b", "c" )}`), so the
 * host can name the apps holding the slots. iOS lists application identifiers
 * (`TEAMID.bundle.id`); the team prefix is dropped so the result matches what
 * `uninstall` and the host's records use. Empty for the devicectl wording.
 */
export function freeAppLimitBundleIds(text: string | undefined): string[] {
  const match = text?.match(/\{\(([\s\S]*?)\)\}/);
  if (!match) return [];
  return match[1]
    .split(/[,\n]/)
    .map((part) => stripTeamPrefix(part.trim().replace(/^["']|["']$/g, '')))
    .filter((id) => /^[A-Za-z0-9][A-Za-z0-9.-]*$/.test(id));
}

export type FreeProfileApp = {
  bundleId: string;
  teamId?: string;
  /** Display name, when the device reported one. */
  name?: string;
  /** ISO date of the profile's expiry. */
  expiresAt?: string;
};

// Free Apple IDs get development profiles that last seven days; paid teams'
// last up to a year. A little slack covers clock skew.
const FREE_PROFILE_MAX_VALIDITY_MS = 8 * 24 * 60 * 60 * 1000;

function toDate(value: Date | string | undefined): Date | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * The app behind an installed provisioning profile when that profile is a free
 * Apple ID's development profile — i.e. one that counts against the three-app
 * limit. Null for every other profile.
 */
export function freeDeveloperProfileApp(profileBlob: Buffer): FreeProfileApp | null {
  const profile = readProvisioningProfilePlist(profileBlob);
  if (!profile) return null;
  const entitlements = profile.Entitlements ?? {};
  const applicationIdentifier = entitlements['application-identifier'];
  const created = toDate(profile.CreationDate);
  const expires = toDate(profile.ExpirationDate);
  if (
    typeof applicationIdentifier !== 'string' ||
    entitlements['get-task-allow'] !== true ||
    !created ||
    !expires ||
    expires.getTime() - created.getTime() > FREE_PROFILE_MAX_VALIDITY_MS
  ) {
    return null;
  }
  return {
    bundleId: stripTeamPrefix(applicationIdentifier),
    teamId: profile.TeamIdentifier?.[0],
    expiresAt: expires.toISOString(),
  };
}

/**
 * The apps behind a device's installed profiles, one entry per app. The store
 * keeps a profile for every past (re)install of an app, so the latest expiry
 * wins.
 */
export function freeProfileApps(profileBlobs: Buffer[]): FreeProfileApp[] {
  const byBundleId = new Map<string, FreeProfileApp>();
  for (const blob of profileBlobs) {
    const app = freeDeveloperProfileApp(blob);
    if (!app) continue;
    const seen = byBundleId.get(app.bundleId);
    if (!seen || (app.expiresAt ?? '') > (seen.expiresAt ?? '')) byBundleId.set(app.bundleId, app);
  }
  return [...byBundleId.values()];
}
