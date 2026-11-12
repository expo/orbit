import { Platform } from 'react-native';

// iOS re-signing (free Apple ID resign, auto-renewal, Apple ID settings) only
// works on macOS for now. Flip on for Electron once it's supported there.
export const RESIGN_ENABLED = Platform.OS === 'macos';
