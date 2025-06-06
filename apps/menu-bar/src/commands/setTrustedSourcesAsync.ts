import MenuBarModule from '../modules/MenuBarModule';

export const setTrustedSourcesAsync = async (trustedSources: string) => {
  await MenuBarModule.runCli('set-trusted-sources', [trustedSources], console.log);
};
