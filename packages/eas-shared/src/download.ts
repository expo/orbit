import spawnAsync from '@expo/spawn-async';
import glob from 'fast-glob';
import fs from 'fs-extra';
import path from 'path';
import { Stream } from 'stream';
import { extract } from 'tar';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';

import fetch, { RequestInit, Response } from './fetch';
import Log from './log';
import { formatBytes } from './files';
import { getTmpDirectory } from './paths';
import { ProgressHandler, createProgressTracker } from './progress';
import { InternalError } from 'common-types';
import { MultipleAppsInTarballErrorDetails } from 'common-types/build/InternalError';

export enum AppPlatform {
  Android = 'ANDROID',
  Ios = 'IOS',
}

const pipeline = promisify(Stream.pipeline);

function wrapFetchWithProgress(): (
  url: string,
  init: RequestInit,
  progressHandler: ProgressHandler
) => Promise<Response> {
  let didProgressBarFinish = false;
  let lastProgressCallTime = 0;
  return async (url: string, init: RequestInit, progressHandler: ProgressHandler) => {
    const response = await fetch(url, init);

    if (response.ok) {
      const totalDownloadSize = response.headers.get('Content-Length');
      const total = Number(totalDownloadSize);

      if (!totalDownloadSize || isNaN(total) || total < 0) {
        Log.warn(
          'Progress callback not supported for network request because "Content-Length" header missing or invalid in response from URL:',
          url.toString()
        );
        return response;
      }

      let length = 0;
      const onProgress = (chunkLength?: number): void => {
        if (chunkLength) {
          length += chunkLength;
        }

        const currentTime = Date.now();
        // Throttle progressHandler in 250ms intervals
        const progress = length / total;
        if (
          !didProgressBarFinish &&
          (currentTime - lastProgressCallTime >= 250 || length === total)
        ) {
          progressHandler({
            progress: { total, percent: progress, transferred: length },
            isComplete: total === length,
          });

          lastProgressCallTime = currentTime;
          if (total === length) {
            didProgressBarFinish = true;
          }
        }
      };

      response.body.on('data', (chunk) => {
        onProgress(chunk.length);
      });

      response.body.on('end', () => {
        onProgress();
      });
    }

    return response;
  };
}

async function downloadFileWithProgressTrackerAsync(
  url: string,
  outputPath: string,
  progressTrackerMessage: string | ((ratio: number, total: number) => string),
  progressTrackerCompletedMessage: string
): Promise<void> {
  Log.newLine();

  try {
    const response = await wrapFetchWithProgress()(
      url,
      {
        timeout: 1000 * 60 * 5, // 5 minutes
      },
      createProgressTracker({
        message: progressTrackerMessage,
        completedMessage: progressTrackerCompletedMessage,
      })
    );

    if (!response.ok) {
      throw new Error(`Failed to download file from ${url}`);
    }

    await pipeline(response.body, fs.createWriteStream(outputPath));
  } catch (error: any) {
    if (await fs.pathExists(outputPath)) {
      await fs.remove(outputPath);
    }
    throw error;
  }
}

function _downloadsCacheDirectory() {
  const dir = path.join(getTmpDirectory(), 'downloads-cache');
  fs.mkdirpSync(dir);
  return dir;
}

export async function downloadAndMaybeExtractAppAsync(url: string): Promise<string> {
  const name = encodeURIComponent(url.replace(/^[^:]+:\/\//, ''));

  const outputDir = path.join(_downloadsCacheDirectory(), `${name}`);
  if (await checkCacheAvailabilityAsync(outputDir)) {
    return outputDir;
  }

  await fs.promises.mkdir(outputDir, { recursive: true });

  const tmpArchivePathDir = path.join(getTmpDirectory(), uuidv4());
  await fs.mkdir(tmpArchivePathDir, { recursive: true });
  if (url.endsWith('apk')) {
    const tmpApkFilePath = path.join(tmpArchivePathDir, `${uuidv4()}.tar.gz`);
    await downloadFileWithProgressTrackerAsync(
      url,
      tmpApkFilePath,
      (ratio, total) => `Downloading app (${formatBytes(total * ratio)} / ${formatBytes(total)})`,
      'Successfully downloaded app'
    );
    // Only move the file to correct location after the download is complete to avoid corrupted files
    const apkFilePath = path.join(outputDir, `${uuidv4()}.apk`);
    await fs.move(tmpApkFilePath, apkFilePath);
    return apkFilePath;
  } else {
    const tmpArchivePath = path.join(tmpArchivePathDir, `${uuidv4()}.tar.gz`);

    await downloadFileWithProgressTrackerAsync(
      url,
      tmpArchivePath,
      (ratio, total) =>
        `Downloading app archive (${formatBytes(total * ratio)} / ${formatBytes(total)})`,
      'Successfully downloaded app archive'
    );
    await tarExtractAsync(tmpArchivePath, outputDir);

    const appPath = await getAppPathAsync(outputDir);

    return appPath;
  }
}

export async function extractAppFromLocalArchiveAsync(appArchivePath: string): Promise<string> {
  const outputDir = path.join(getTmpDirectory(), uuidv4());
  await fs.promises.mkdir(outputDir, { recursive: true });

  await tarExtractAsync(appArchivePath, outputDir);

  return await getAppPathAsync(outputDir);
}

async function checkCacheAvailabilityAsync(outputDir: string): Promise<boolean> {
  if (!(await fs.pathExists(outputDir))) {
    return false;
  }

  try {
    const appPath = await getAppPathAsync(outputDir);
    if (appPath.endsWith('.app')) {
      // Check for Info.plist because the folder may exist but not be a valid .app
      return fs.existsSync(path.join(appPath, 'Info.plist'));
    }

    return true;
  } catch (error) {
    return false;
  }
}

async function getAppPathAsync(outputDir: string): Promise<string> {
  const applicationExtensionGlob = '(apk|app|ipa)';
  const appFilePaths = await glob(`./**/*.${applicationExtensionGlob}`, {
    cwd: outputDir,
    onlyFiles: false,
  });

  if (appFilePaths.length === 0) {
    // Check if outputDir is an .app but was extracted as folder
    if (fs.existsSync(path.join(outputDir, 'Info.plist'))) {
      const appPath = `${outputDir}.app`;
      await fs.promises.cp(outputDir, appPath, { recursive: true });
      return appPath;
    }

    throw Error('Did not find any installable apps inside tarball.');
  }

  if (appFilePaths.length === 1) {
    return path.join(outputDir, appFilePaths[0]);
  }

  Log.newLine();
  Log.log('Detected multiple apps in the tarball:');
  Log.newLine();

  const details: MultipleAppsInTarballErrorDetails = {
    apps: appFilePaths.map((filePath) => ({
      name: filePath,
      path: path.join(outputDir, filePath),
    })),
  };
  throw new InternalError(
    'MULTIPLE_APPS_IN_TARBALL',
    'Multiple apps detected in the tarball.',
    details
  );
}

export async function tarExtractAsync(input: string, output: string): Promise<void> {
  try {
    if (process.platform !== 'win32') {
      await spawnAsync('tar', ['-xf', input, '-C', output], {
        stdio: 'inherit',
      });
      return;
    }
  } catch (error: any) {
    Log.warn(
      `Failed to extract tar using native tools, falling back on JS tar module. ${error.message}`
    );
  }
  Log.debug(`Extracting ${input} to ${output} using JS tar module`);
  // tar node module has previously had problems with big files, and seems to
  // be slower, so only use it as a backup.
  await extract({ file: input, cwd: output });
}
