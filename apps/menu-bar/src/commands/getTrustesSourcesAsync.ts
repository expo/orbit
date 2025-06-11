import MenuBarModule from '../modules/MenuBarModule';

export const getTrustedSourcesAsync = async () => {
  const trustedSources = await MenuBarModule.runCli('get-custom-trusted-sources', [], console.log);

  if (typeof trustedSources === 'string') {
    try {
      return JSON.parse(trustedSources).join(',');
    } catch {
      return undefined;
    }
  }

  return undefined;
};
