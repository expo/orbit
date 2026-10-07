import { InternalError } from 'common-types';

import { appleIdSignOutAsync, appleIdStatusAsync } from './appleIdAuthAsync';
import { DeviceEventEmitter } from '../modules/DeviceEventEmitter';
import { storage } from '../modules/Storage';

// The currently signed-in Apple ID. Its PRESENCE means "signed in"; it is
// cleared the moment the session expires (see forgetAppleIdSession).
const LAST_APPLE_ID_KEY = 'apple-resign:last-apple-id';

// The last Apple ID email, kept only to pre-fill the sign-in form. It survives
// a session expiry (a weekly event) so the user does not retype their email on
// every re-auth. Cleared only on an explicit sign-out.
const APPLE_ID_HINT_KEY = 'apple-resign:apple-id-hint';

// Why the AppleIdAuth window shows a contextual banner. Written by whoever
// opens the window, read (and cleared) by the window on mount — the window
// navigator cannot pass props, so this rides through storage.
export const AUTH_REASON_KEY = 'apple-resign:auth-reason';

// Broadcast whenever the signed-in Apple ID changes (sign-in, sign-out, or an
// automatic logout on session expiry). Every window that shows "signed in as X"
// listens and re-reads loadAppleId(). Cross-window on Electron via the
// main-process DeviceEventEmitter broadcast.
export const APPLE_ID_CHANGED_EVENT = 'apple-id:changed';

export function rememberAppleId(appleId: string) {
  storage.set(LAST_APPLE_ID_KEY, appleId);
  storage.set(APPLE_ID_HINT_KEY, appleId);
  DeviceEventEmitter.emit(APPLE_ID_CHANGED_EVENT);
}

export function loadAppleId(): string | null {
  return storage.getString(LAST_APPLE_ID_KEY) ?? null;
}

/**
 * The signed-in Apple ID, adopting a session the CLI already holds when this
 * app instance has no record of it — a fresh install, the other app flavour
 * (native and Electron keep separate storage), or a sign-in made through the
 * CLI. Null only when the CLI has no persisted session either, which is the
 * one case that warrants the sign-in window.
 */
export async function resolveAppleIdAsync(): Promise<string | null> {
  const stored = loadAppleId();
  if (stored) return stored;
  const persisted = await appleIdStatusAsync().catch(() => null);
  if (persisted) rememberAppleId(persisted);
  return persisted;
}

/** The email to pre-fill in the sign-in form (survives expiry). */
export function loadAppleIdHint(): string | null {
  return storage.getString(APPLE_ID_HINT_KEY) ?? storage.getString(LAST_APPLE_ID_KEY) ?? null;
}

/**
 * An Apple session expired mid-use — treat it as a logout. Forget the signed-in
 * id (so every "signed in as X" surface flips to signed-out) but keep the email
 * hint for a one-tap re-sign-in. Does NOT revoke anything: the underlying GS
 * session is already dead, and the next sign-in overwrites it.
 */
export function forgetAppleIdSession() {
  if (!storage.getString(LAST_APPLE_ID_KEY)) return;
  storage.delete(LAST_APPLE_ID_KEY);
  DeviceEventEmitter.emit(APPLE_ID_CHANGED_EVENT);
}

/**
 * Explicit user sign-out: revoke the persisted GSA session (keychain) and forget
 * both the signed-in id and the pre-fill hint. Returns the Apple ID that was
 * signed out, or null if none was stored.
 */
export async function clearAppleIdLoginAsync(): Promise<string | null> {
  const appleId = loadAppleId();
  if (appleId) {
    await appleIdSignOutAsync(appleId);
  }
  storage.delete(LAST_APPLE_ID_KEY);
  storage.delete(APPLE_ID_HINT_KEY);
  DeviceEventEmitter.emit(APPLE_ID_CHANGED_EVENT);
  return appleId;
}

/**
 * True when an error means the Apple session expired and re-auth is required.
 * Matches InternalError structurally: the code crosses the CLI boundary as JSON
 * and is rebuilt, so `instanceof` is unreliable.
 */
export function isAppleAuthExpiredError(error: unknown): boolean {
  if (error instanceof InternalError) return error.code === 'APPLE_AUTH_REQUIRED';
  const maybe = error as { name?: string; code?: string } | null;
  return !!maybe && maybe.name === 'InternalError' && maybe.code === 'APPLE_AUTH_REQUIRED';
}

// iOS shows an "Untrusted Developer" prompt the first time an app signed by a
// given Apple ID is opened on a device. Show the trust steps once per
// (Apple ID, device) — tracked here so the success alert stays quiet after that.
const TRUST_SHOWN_KEY_PREFIX = 'apple-resign:trust-shown';

export function hasShownTrustInstructions(appleId: string, deviceUdid: string): boolean {
  return storage.getBoolean(`${TRUST_SHOWN_KEY_PREFIX}:${appleId}:${deviceUdid}`) ?? false;
}

export function markTrustInstructionsShown(appleId: string, deviceUdid: string) {
  storage.set(`${TRUST_SHOWN_KEY_PREFIX}:${appleId}:${deviceUdid}`, true);
}
