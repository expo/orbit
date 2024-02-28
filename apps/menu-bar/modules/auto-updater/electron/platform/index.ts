import Linux from './Linux';
import Platform from './Platform';
import Windows from './Windows';
import HttpClient from '../utils/HttpClient';
import Logger from '../utils/Logger';
import { Options } from '../utils/options';

/**
 * @param {Options} options
 * @param {Logger} logger
 * @param {Function} emit
 * @param {HttpClient} httpClient
 * @param {string} platform
 * @return {Platform}
 */
export function createPlatform(
  options: Options,
  logger: Logger,
  emit: Function,
  httpClient: HttpClient,
  platform: NodeJS.Platform = process.platform
): Platform {
  switch (platform) {
    case 'darwin':
      return new Platform(options, logger, emit, httpClient);
    case 'win32':
      return new Windows(options, logger, emit, httpClient);
    default:
      return new Linux(options, logger, emit, httpClient);
  }
}
