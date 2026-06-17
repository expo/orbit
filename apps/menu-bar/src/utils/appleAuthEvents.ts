import { DeviceEventEmitter } from 'react-native';

export type AppleAuthCompletedEvent =
  | { status: 'success'; appleId: string }
  | { status: 'cancelled' };

// React Native's DeviceEventEmitter is fine for in-process broadcast between
// the auth window and the popover that initiated the flow.
export const AppleAuthEmitter = DeviceEventEmitter;

export type AppleAuthEventName = 'apple-id-auth:complete';
