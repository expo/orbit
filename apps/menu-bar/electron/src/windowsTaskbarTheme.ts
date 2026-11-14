import { execFile } from 'child_process';
import { nativeTheme } from 'electron';
import path from 'path';

const PERSONALIZE_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize';

/**
 * Reads the output of `reg query` for the value `SystemUsesLightTheme`: true for a dark
 * taskbar, false for a light one, and null when the output does not have the value.
 */
export function parseTaskbarUsesDarkColors(regQueryOutput: string): boolean | null {
  const match = /SystemUsesLightTheme\s+REG_DWORD\s+0x([0-9a-f]+)/i.exec(regQueryOutput);
  return match ? parseInt(match[1], 16) === 0 : null;
}

/**
 * Whether the Windows taskbar is dark. Windows has one light or dark mode for the taskbar
 * ("Windows mode") and one for apps ("app mode"), and `nativeTheme` reports the app mode.
 * With no answer from the registry, the result is the app mode.
 */
export function getTaskbarUsesDarkColorsAsync(): Promise<boolean> {
  const reg = path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'reg.exe');
  return new Promise((resolve) => {
    execFile(
      reg,
      ['query', PERSONALIZE_KEY, '/v', 'SystemUsesLightTheme'],
      { windowsHide: true },
      (error, stdout) => {
        const dark = error ? null : parseTaskbarUsesDarkColors(stdout);
        resolve(dark ?? nativeTheme.shouldUseDarkColors);
      }
    );
  });
}
