import { DeviceEventEmitter } from '../modules/DeviceEventEmitter';

export type AppleAuthCompletedEvent =
  | { status: 'success'; appleId: string }
  | { status: 'cancelled' };

// The auth window and the popover that initiated the flow are separate renderer
// processes on Electron, so use the cross-window DeviceEventEmitter (which hops
// through the main process) instead of React Native's per-context one. On macOS
// this resolves to React Native's DeviceEventEmitter (single JS context).
export const AppleAuthEmitter = DeviceEventEmitter;

export type AppleAuthEventName = 'apple-id-auth:complete';
