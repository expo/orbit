import MenuBarModule from '../modules/MenuBarModule';

export const setSessionAsync = async (sessionSecret: string) => {
  await MenuBarModule.runCli('set-session', [sessionSecret], console.log);
};
