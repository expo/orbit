import { getTrustedSources, setTrustedSources } from '../storage';

export const getTrustedSourcesAsync = async () => {
  return getTrustedSources();
};

export const setTrustedSourcesAsync = async (trustedSources: string | undefined) => {
  const value = trustedSources
    ? trustedSources.split(',').map((source) => source.trim())
    : undefined;

  await setTrustedSources(value);

  return value;
};
