import getenv from 'getenv';

export function isDebug(): boolean {
  return getenv.boolish('EXPO_DEBUG', false);
}

export function isStaging(): boolean {
  return getenv.boolish('EXPO_STAGING', false);
}

export function isLocal(): boolean {
  return getenv.boolish('EXPO_LOCAL', false);
}

export function isMenuBar(): boolean {
  return getenv.boolish('EXPO_MENU_BAR', false);
}
