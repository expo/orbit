// iOS re-signing (free Apple ID resign, auto-renewal, Apple ID settings) is
// disabled on every platform for now. Set back to `Platform.OS === 'macos'`
// (importing Platform from react-native) to re-enable it on macOS.
export const RESIGN_ENABLED = false;
