import picomatch from 'picomatch';

import { getCustomTrustedSources, setCustomTrustedSources } from '../storage';
import { InternalError } from 'common-types';

const DEFAULT_TRUSTED_SOURCES = [
  'https://expo.dev/**',
  'https://staging.expo.dev/**',
  'https://expo.test/**',
];
export const getTrustedSources = () => {
  return [DEFAULT_TRUSTED_SOURCES, ...getCustomTrustedSources()];
};

export const trustedSourcesValidatorMiddleware = (
  fn: (url: string, ...args: any[]) => any | Promise<any>
) => {
  return async function (url: string, ...args: any[]) {
    const trustedSources = getTrustedSources();
    if (!trustedSources) {
      return fn(url, ...args);
    }

    if (!trustedSources.some((source) => picomatch(source)(url))) {
      throw new InternalError('UNTRUSTED_SOURCE', `This URL is from an untrusted source: ${url}`);
    }

    return fn(url, ...args);
  };
};

// Commands
export const getCustomTrustedSourcesAsync = async () => {
  return getCustomTrustedSources();
};

export const setCustomTrustedSourcesAsync = async (trustedSources: string | undefined) => {
  const value = trustedSources
    ? trustedSources.split(',').map((source) => source.trim())
    : undefined;

  await setCustomTrustedSources(value);

  return value;
};
