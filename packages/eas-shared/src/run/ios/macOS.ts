import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';

/**
 * Copies a macOS .app bundle to /Applications.
 */
export async function installOnMacOSAsync(appPath: string): Promise<string> {
  const appName = path.basename(appPath);
  const destination = path.join('/Applications', appName);
  await fs.remove(destination);
  await fs.copy(appPath, destination);
  return destination;
}

/**
 * Launches a macOS .app bundle using `open`.
 * If a launchURL is provided, opens it with the app using `open -a`.
 */
export async function launchOnMacOSAsync(appPath: string, launchURL?: string): Promise<void> {
  const args = launchURL ? ['-a', appPath, launchURL] : [appPath];
  return new Promise<void>((resolve, reject) => {
    const child = spawn('open', args, { stdio: 'ignore' });
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Failed to launch ${path.basename(appPath)}`));
      }
    });
    child.on('error', reject);
  });
}
