import MenuBarModule from '../modules/MenuBarModule';

export const setTrustedSourcesAsync = async (trustedSources: string) => {
  await MenuBarModule.runCli('set-custom-trusted-sources', [trustedSources], console.log);
};
