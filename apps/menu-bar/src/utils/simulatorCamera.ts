import type {
  SimulatorCameraPosition,
  SimulatorCameraSource,
  SimulatorCameraStatus,
} from '../../modules/simulator-camera';
import { storage } from '../modules/Storage';

/** What the user chose for the virtual camera; applied again when Orbit starts. */
export type SimulatorCameraPreferences = {
  enabled: boolean;
  back: SimulatorCameraSource;
  /** `null`: the front camera shows the same source as the back camera. */
  front: SimulatorCameraSource | null;
};

export const simulatorCameraStorageKey = 'simulator-camera';

export const noSource: SimulatorCameraSource = { kind: 'none' };

export const defaultSimulatorCameraPreferences: SimulatorCameraPreferences = {
  enabled: false,
  back: noSource,
  front: null,
};

const sourceKinds = new Set<SimulatorCameraSource['kind']>([
  'none',
  'macCamera',
  'image',
  'video',
  'qr',
]);

/** Drops anything that is not a source, so a stale or edited value cannot break the pane. */
export function normalizeSource(value: unknown): SimulatorCameraSource {
  if (!value || typeof value !== 'object') return noSource;
  const { kind, value: sourceValue, contentMode } = value as Record<string, unknown>;
  if (typeof kind !== 'string' || !sourceKinds.has(kind as SimulatorCameraSource['kind'])) {
    return noSource;
  }
  const source: SimulatorCameraSource = { kind: kind as SimulatorCameraSource['kind'] };
  if (typeof sourceValue === 'string' && sourceValue !== '') source.value = sourceValue;
  if (contentMode === 'fit' || contentMode === 'fill') source.contentMode = contentMode;
  // A source that needs a value and has none is no source.
  if (source.kind !== 'none' && source.kind !== 'macCamera' && !source.value) return noSource;
  return source;
}

export function normalizeSimulatorCameraPreferences(value: unknown): SimulatorCameraPreferences {
  if (!value || typeof value !== 'object') return defaultSimulatorCameraPreferences;
  const { enabled, back, front } = value as Record<string, unknown>;
  return {
    enabled: enabled === true,
    back: normalizeSource(back),
    front: front === null || front === undefined ? null : normalizeSource(front),
  };
}

export function getSimulatorCameraPreferences(): SimulatorCameraPreferences {
  const raw = storage.getString(simulatorCameraStorageKey);
  if (!raw) return defaultSimulatorCameraPreferences;
  try {
    return normalizeSimulatorCameraPreferences(JSON.parse(raw));
  } catch {
    return defaultSimulatorCameraPreferences;
  }
}

export function saveSimulatorCameraPreferences(preferences: SimulatorCameraPreferences) {
  storage.set(simulatorCameraStorageKey, JSON.stringify(preferences));
}

/** The source each camera position gets: the front camera follows the back one unless set. */
export function resolveSources(
  preferences: SimulatorCameraPreferences
): Record<SimulatorCameraPosition, SimulatorCameraSource> {
  return { back: preferences.back, front: preferences.front ?? preferences.back };
}

const fileName = (path: string) => path.split('/').filter(Boolean).pop() ?? path;

/** A short label of a source for a menu or a row, e.g. "Image · photo.png". */
export function describeSource(
  source: SimulatorCameraSource,
  macCameras: { id: string; name: string }[] = []
): string {
  switch (source.kind) {
    case 'none':
      return 'None';
    case 'macCamera': {
      const camera = macCameras.find(({ id }) => id === source.value);
      return camera ? camera.name : source.value ? 'Mac camera' : 'Default Mac camera';
    }
    case 'image':
      return `Image · ${fileName(source.value ?? '')}`;
    case 'video':
      return `Video · ${fileName(source.value ?? '')}`;
    case 'qr':
      return `QR code · ${source.value ?? ''}`;
  }
}

/** One line on the state of the virtual camera for the Settings pane. */
export function describeStatus(status: SimulatorCameraStatus | undefined): string {
  if (!status) return 'Checking…';
  if (status.error) return status.error;
  if (!status.enabled) return 'Off. Apps in iOS simulators see no camera.';
  const injected = status.simulators.filter(({ injected }) => injected);
  if (status.simulators.length === 0) {
    return 'On. Boot an iOS simulator: apps launched in it will see the camera.';
  }
  const names = injected.map(({ name }) => name).join(', ');
  if (injected.length === 0) return 'On, but no booted simulator has the camera yet.';
  return `On in ${names}. Apps launched from now on see the camera; relaunch apps that are already running.`;
}
