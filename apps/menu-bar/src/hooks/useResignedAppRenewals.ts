import { InternalError } from 'common-types';
import { useCallback, useEffect, useRef, useState } from 'react';

import { usePopoverFocusEffect } from './usePopoverFocus';
import { forgetAppleIdSession } from '../commands/appleAccountAsync';
import { cleanupResignedAppsAsync } from '../commands/cleanupResignedAppsAsync';
import { installAndLaunchAppAsync } from '../commands/installAndLaunchAppAsync';
import { renewResignedAppAsync } from '../commands/renewResignedAppAsync';
import { DeviceEventEmitter } from '../modules/DeviceEventEmitter';
import {
  RESIGNED_APPS_CHANGED_EVENT,
  RESIGNED_APPS_CHECK_REQUEST_EVENT,
  RESIGNED_APPS_RENEW_REQUEST_EVENT,
  ResignAttention,
  ResignedAppRecord,
  getAttention,
  getRenewalBlockReason,
  isRenewalDue,
  listResignedApps,
  setAttention,
  updateResignedApp,
} from '../modules/ResignedApps';
import { getUserPreferences } from '../modules/Storage';
import { useListDevices } from '../providers/DevicesProvider';
import { AppleAuthCompletedEvent, AppleAuthEmitter } from '../utils/appleAuthEvents';
import { getDeviceId } from '../utils/device';
import { MenuBarStatus, Task, describeResignStep } from '../utils/helpers';
import { describeResignError } from '../utils/resignErrorCopy';

const RENEWAL_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const DEVICE_SEEN_WRITE_THROTTLE_MS = 60 * 60 * 1000;

// Renewals run strictly one at a time: ipa-resign shares a single state.json
// and Apple session, so parallel resigns would race. Module-level so every
// trigger (interval, focus, manual request, reconnect install) shares the queue.
let engineQueue: Promise<void> = Promise.resolve();
function runExclusive(fn: () => Promise<void>): Promise<void> {
  engineQueue = engineQueue.then(fn, fn);
  return engineQueue;
}

let cleanupRan = false;

type TaskHandlers = {
  createTask: (task: Task) => void;
  updateTask: (task: Partial<Task> & Pick<Task, 'id'>) => void;
  deleteTask: (id: Task['id']) => void;
};

/**
 * The automatic 7-day renewal engine. Mounted once, in the popover's Core, so
 * progress can surface through the existing tasks map. Returns the attention
 * state the popover should surface (auth expired / renewal failed).
 */
export function useResignedAppRenewals({ createTask, updateTask, deleteTask }: TaskHandlers) {
  const { devicesPerPlatform, refetch } = useListDevices();
  const [attention, setAttentionState] = useState<ResignAttention | null>(getAttention());

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(RESIGNED_APPS_CHANGED_EVENT, () => {
      setAttentionState(getAttention());
    });
    return () => sub.remove();
  }, []);

  const connectedUdidsRef = useRef<Set<string>>(new Set());
  connectedUdidsRef.current = new Set(
    [...devicesPerPlatform.ios.devices.values()]
      .filter((device) => device.deviceType === 'device')
      .map((device) => getDeviceId(device))
  );

  // Renew one record. Returns false when every further renewal would fail the
  // same way (expired Apple session) so the caller stops the whole run.
  const renewOneAsync = useCallback(
    async (record: ResignedAppRecord): Promise<boolean> => {
      const taskId = `renew:${record.id}`;
      createTask({
        id: taskId,
        status: MenuBarStatus.RESIGNING_APP,
        progress: 0,
        message: `Renewing ${record.appName}…`,
      });
      try {
        await renewResignedAppAsync(record, {
          deviceConnected: connectedUdidsRef.current.has(record.deviceUdid),
          onProgress: (step) =>
            updateTask({ id: taskId, message: `${record.appName}: ${describeResignStep(step)}` }),
        });
        if (getAttention()?.kind === 'renewal-failed') {
          setAttention(null);
        }
        return true;
      } catch (error) {
        const code = error instanceof InternalError ? error.code : undefined;
        const at = new Date().toISOString();
        if (code === 'APPLE_AUTH_REQUIRED') {
          // Expired session is a logout: forget it so every "signed in as X"
          // surface updates, then surface the attention row to re-sign-in.
          forgetAppleIdSession();
          updateResignedApp(record.id, {
            lastError: { code, message: 'Apple ID session expired.', at },
          });
          setAttention({
            kind: 'auth-required',
            message: 'Sign in to your Apple ID to keep renewing resigned apps.',
            at,
          });
          return false;
        }
        const { message } = describeResignError(error);
        updateResignedApp(record.id, { lastError: { code: code ?? 'UNKNOWN', message, at } });
        setAttention({ kind: 'renewal-failed', message: `Couldn’t renew ${record.appName}.`, at });
        return true;
      } finally {
        deleteTask(taskId);
      }
    },
    [createTask, updateTask, deleteTask]
  );

  const runRenewalCheckAsync = useCallback(
    () =>
      runExclusive(async () => {
        if (!getUserPreferences().autoRenewResignedApps) return;
        const now = Date.now();
        for (const record of listResignedApps()) {
          if (!isRenewalDue(record, now)) continue;
          const blocked = getRenewalBlockReason(record, now);
          if (blocked === 'stale') {
            if (record.lastError?.code !== 'STALE_DEVICE') {
              updateResignedApp(record.id, {
                lastError: {
                  code: 'STALE_DEVICE',
                  message: 'Device not seen for 30 days — automatic renewal paused.',
                  at: new Date().toISOString(),
                },
              });
            }
            continue;
          }
          if (blocked) continue;
          const keepGoing = await renewOneAsync(record);
          if (!keepGoing) break;
        }
      }),
    [renewOneAsync]
  );

  // Triggers: mount, 6-hour tick, popover focus, sign-in completion.
  useEffect(() => {
    if (!cleanupRan) {
      cleanupRan = true;
      cleanupResignedAppsAsync().catch(() => {});
    }
    runRenewalCheckAsync();
    const interval = setInterval(() => {
      // Reconnects are only visible through a device refetch; force one while
      // an install is pending so it isn't gated on the user opening the popover.
      if (listResignedApps().some((record) => record.pendingInstall)) {
        refetch();
      }
      runRenewalCheckAsync();
    }, RENEWAL_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [runRenewalCheckAsync, refetch]);

  usePopoverFocusEffect(
    useCallback(() => {
      runRenewalCheckAsync();
    }, [runRenewalCheckAsync])
  );

  useEffect(() => {
    const sub = AppleAuthEmitter.addListener(
      'apple-id-auth:complete',
      (event: AppleAuthCompletedEvent) => {
        if (event.status === 'success') {
          if (getAttention()?.kind === 'auth-required') {
            setAttention(null);
          }
          runRenewalCheckAsync();
        }
      }
    );
    return () => sub.remove();
  }, [runRenewalCheckAsync]);

  // Manual "Renew now" from the Settings window (separate renderer on Electron).
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      RESIGNED_APPS_RENEW_REQUEST_EVENT,
      ({ recordId }: { recordId: string }) => {
        runExclusive(async () => {
          const record = listResignedApps().find((r) => r.id === recordId);
          if (record) await renewOneAsync(record);
        });
      }
    );
    return () => sub.remove();
  }, [renewOneAsync]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(RESIGNED_APPS_CHECK_REQUEST_EVENT, () => {
      runRenewalCheckAsync();
    });
    return () => sub.remove();
  }, [runRenewalCheckAsync]);

  // Install-on-reconnect + deviceLastSeenAt bookkeeping.
  useEffect(() => {
    const udids = connectedUdidsRef.current;
    if (udids.size === 0) return;
    runExclusive(async () => {
      const now = Date.now();
      for (const record of listResignedApps()) {
        if (!udids.has(record.deviceUdid)) continue;
        const lastSeen = Date.parse(record.deviceLastSeenAt);
        if (Number.isNaN(lastSeen) || now - lastSeen > DEVICE_SEEN_WRITE_THROTTLE_MS) {
          updateResignedApp(record.id, { deviceLastSeenAt: new Date(now).toISOString() });
        }
        if (record.pendingInstall) {
          const taskId = `renew-install:${record.id}`;
          createTask({
            id: taskId,
            status: MenuBarStatus.INSTALLING_APP,
            progress: 0,
            message: `Installing ${record.appName}…`,
          });
          try {
            await installAndLaunchAppAsync({
              appPath: record.resignedIpaPath,
              deviceId: record.deviceUdid,
              launchURL: record.launchURL,
            });
            updateResignedApp(record.id, { pendingInstall: false });
          } catch {
            // Device may be locked or mid-boot; the next refetch retries.
          } finally {
            deleteTask(taskId);
          }
        }
      }
    });
  }, [devicesPerPlatform, createTask, deleteTask]);

  return { attention };
}
