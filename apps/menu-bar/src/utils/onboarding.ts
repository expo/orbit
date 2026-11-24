export const hasSeenOnboardingStorageKey = 'has-seen-onboarding';

// Sent by the Onboarding window when the user presses "Get Started". It goes through
// DeviceEventEmitter because storage changes don't reach other Electron renderer windows.
export const ONBOARDING_COMPLETED_EVENT = 'onboarding:completed';
