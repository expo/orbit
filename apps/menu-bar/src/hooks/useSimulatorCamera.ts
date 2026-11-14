import { useCallback, useEffect, useRef, useState } from 'react';

import {
  addSimulatorCameraStatusListener,
  getSimulatorCameraStatusAsync,
  isSimulatorCameraSupported,
  listMacCamerasAsync,
  MacCamera,
  refreshSimulatorCameraSimulatorsAsync,
  setSimulatorCameraEnabledAsync,
  setSimulatorCameraSourceAsync,
  SimulatorCameraSource,
  SimulatorCameraStatus,
} from '../../modules/simulator-camera';
import {
  getSimulatorCameraPreferences,
  resolveSources,
  saveSimulatorCameraPreferences,
  SimulatorCameraPreferences,
} from '../utils/simulatorCamera';

/**
 * Applies the saved sources to the native side, then turns the camera on or off. The
 * sources go first so the frames are there when the first app launches.
 */
async function applyPreferencesAsync(preferences: SimulatorCameraPreferences) {
  const sources = resolveSources(preferences);
  await setSimulatorCameraSourceAsync('back', sources.back);
  await setSimulatorCameraSourceAsync('front', sources.front);
  return await setSimulatorCameraEnabledAsync(preferences.enabled);
}

/**
 * Turns the virtual camera back on when Orbit starts, if it was on. Only the native module
 * knows the camera's state; it starts off with every launch of Orbit.
 */
export function useSimulatorCameraBootstrap() {
  useEffect(() => {
    if (!isSimulatorCameraSupported) return;
    const preferences = getSimulatorCameraPreferences();
    if (!preferences.enabled) return;
    applyPreferencesAsync(preferences).catch((error) => {
      console.warn('Unable to start the simulator camera', error);
    });
  }, []);
}

/** The state and the actions of the Simulator Camera pane in Settings. */
export function useSimulatorCamera() {
  const [preferences, setPreferences] = useState(getSimulatorCameraPreferences);
  const [status, setStatus] = useState<SimulatorCameraStatus>();
  const [macCameras, setMacCameras] = useState<MacCamera[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string>();
  const preferencesRef = useRef(preferences);
  preferencesRef.current = preferences;

  useEffect(() => {
    if (!isSimulatorCameraSupported) return;
    getSimulatorCameraStatusAsync()
      .then(setStatus)
      .catch(() => {});
    listMacCamerasAsync()
      .then(setMacCameras)
      .catch(() => {});
    const subscription = addSimulatorCameraStatusListener(setStatus);
    // New simulators boot while the pane is open; the native side polls too, this keeps
    // the pane current right after a boot.
    const interval = setInterval(() => {
      refreshSimulatorCameraSimulatorsAsync()
        .then(setStatus)
        .catch(() => {});
    }, 5000);
    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, []);

  const update = useCallback(async (next: SimulatorCameraPreferences) => {
    setPreferences(next);
    saveSimulatorCameraPreferences(next);
    setIsBusy(true);
    setError(undefined);
    try {
      setStatus(await applyPreferencesAsync(next));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      // The camera did not turn on: show it off, so the switch tells the truth.
      if (next.enabled) {
        const reverted = { ...next, enabled: false };
        setPreferences(reverted);
        saveSimulatorCameraPreferences(reverted);
      }
    } finally {
      setIsBusy(false);
    }
  }, []);

  const setEnabled = useCallback(
    (enabled: boolean) => update({ ...preferencesRef.current, enabled }),
    [update]
  );
  const setBackSource = useCallback(
    (back: SimulatorCameraSource) => update({ ...preferencesRef.current, back }),
    [update]
  );
  const setFrontSource = useCallback(
    (front: SimulatorCameraSource | null) => update({ ...preferencesRef.current, front }),
    [update]
  );

  return {
    isSupported: isSimulatorCameraSupported,
    preferences,
    status,
    macCameras,
    isBusy,
    error,
    setEnabled,
    setBackSource,
    setFrontSource,
  };
}
