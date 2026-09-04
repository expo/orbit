import { DeviceEventEmitter } from '../modules/DeviceEventEmitter';

export type AppleAppIdsDoneEvent = { deletedCount: number };

// Same cross-window rationale as appleAuthEvents: the AppleAppIds window and
// the popover are separate renderer processes on Electron.
export const AppleAppIdsEmitter = DeviceEventEmitter;

export const APPLE_APP_IDS_DONE_EVENT = 'apple-app-ids:done';
