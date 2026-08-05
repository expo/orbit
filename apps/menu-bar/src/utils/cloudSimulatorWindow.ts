import { WindowStyleMask } from '../modules/WindowManager/types';
import type { WindowOptions } from '../modules/WindowManager/types';

/**
 * Window style for the cloud simulator.
 *
 * Design A is a normal titled window; the preview page draws the device bezel
 * inside it. Design B is borderless and transparent, so the page's own rounded
 * bezel becomes the window outline, like Simulator.app.
 *
 * This is a function rather than a constant so the preference is read when the
 * window opens. Reading it at module scope would both require an app restart to
 * take effect and pull storage initialization earlier into the startup graph.
 */
export function getCloudSimulatorWindowOptions(frameless: boolean): WindowOptions {
  return {
    title: 'Cloud Simulator',
    windowStyle: {
      // Narrow enough that serve-sim keeps its devices sidebar collapsed, and
      // tall enough for a phone bezel.
      width: 420,
      height: 860,
      mask: frameless
        ? [WindowStyleMask.Borderless, WindowStyleMask.Resizable]
        : [WindowStyleMask.Titled, WindowStyleMask.Closable, WindowStyleMask.Resizable],
      titlebarAppearsTransparent: true,
      transparent: frameless,
      hasShadow: true,
    },
  };
}
