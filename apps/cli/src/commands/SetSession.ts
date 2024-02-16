import { setSessionSecret } from '../storage';

export async function setSessionAsync(sessionSecret: string) {
  await setSessionSecret(sessionSecret);
}
