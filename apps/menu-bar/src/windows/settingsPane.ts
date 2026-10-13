import { useEffect, useState } from 'react';

import { WindowsNavigator } from './index';
import { DeviceEventEmitter } from '../modules/DeviceEventEmitter';
import { storage } from '../modules/Storage';

export const PANE_KEYS = ['general', 'platforms', 'apple', 'advanced'] as const;
export type Pane = (typeof PANE_KEYS)[number];

// Read (and cleared) by the Settings window on mount: the window navigator
// passes no props, so the requested pane rides through storage.
const REQUESTED_PANE_KEY = 'settings:requested-pane';
// Switches a Settings window that is already open. Broadcast through the
// main-process DeviceEventEmitter on Electron — MMKV change listeners are
// per-renderer there, so a storage listener would never see the popover's write.
const SETTINGS_PANE_REQUEST_EVENT = 'settings:pane-request';

/** Open Settings on `pane` — e.g. the resign flow sends the user to Apple ID → App IDs. */
export function openSettingsPane(pane: Pane) {
  storage.set(REQUESTED_PANE_KEY, pane);
  DeviceEventEmitter.emit(SETTINGS_PANE_REQUEST_EVENT, pane);
  WindowsNavigator.open('Settings');
}

function isPane(value: unknown): value is Pane {
  return PANE_KEYS.includes(value as Pane);
}

function consumeRequestedPane(): Pane | undefined {
  const requested = storage.getString(REQUESTED_PANE_KEY);
  if (!requested) return undefined;
  storage.delete(REQUESTED_PANE_KEY);
  return isPane(requested) ? requested : undefined;
}

/** Selected pane; honours openSettingsPane() on mount and while the window is already open. */
export function useSettingsPane() {
  const [pane, setPane] = useState<Pane>(() => consumeRequestedPane() ?? 'general');
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      SETTINGS_PANE_REQUEST_EVENT,
      (requested: unknown) => {
        // Applied here; don't replay it on a later, unrelated open.
        storage.delete(REQUESTED_PANE_KEY);
        if (isPane(requested)) setPane(requested);
      }
    );
    return () => sub.remove();
  }, []);
  return [pane, setPane] as const;
}
