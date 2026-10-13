// iOS allows three apps signed with a free Apple ID per device. The fourth
// install fails in installd with error -402620383, surfaced with two wordings:
// devicectl's stderr says "The maximum number of apps for free development
// profiles has been reached."; installation_proxy's ErrorDescription on the
// usbmux path says "This device has reached the maximum number of installed
// apps using a free developer profile: {( <app ids> )}".
export const FREE_APP_LIMIT_MESSAGE =
  'This device already has three apps signed with a free Apple ID, which is Apple’s limit. Remove one of them to install this app.';

export function isFreeAppLimitError(text: string | undefined): boolean {
  return /maximum number of (installed )?apps (for|using a) free develop(ment|er) profile/i.test(
    text ?? ''
  );
}

/**
 * The bundle ids iOS lists in the usbmux wording (`{( "a", "b", "c" )}`), so the
 * host can name the apps holding the slots. Empty for the devicectl wording.
 */
export function freeAppLimitBundleIds(text: string | undefined): string[] {
  const match = text?.match(/\{\(([\s\S]*?)\)\}/);
  if (!match) return [];
  return match[1]
    .split(/[,\n]/)
    .map((part) => part.trim().replace(/^["']|["']$/g, ''))
    .filter((id) => /^[A-Za-z0-9][A-Za-z0-9.-]*$/.test(id));
}
