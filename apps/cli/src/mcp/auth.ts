import { randomBytes } from 'crypto';

import { getMcpToken, setMcpToken } from '../storage';

export async function ensureMcpTokenAsync(provided?: string): Promise<string> {
  if (provided) return provided;

  const existing = getMcpToken();
  if (existing) return existing;

  const token = randomBytes(32).toString('hex');
  await setMcpToken(token);
  return token;
}

export function isAuthorized(headerValue: string | undefined, token: string): boolean {
  if (!headerValue) return false;
  const expected = `Bearer ${token}`;
  if (headerValue.length !== expected.length) return false;
  // Constant-time compare
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= headerValue.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

export function isLocalhost(remoteAddress: string | undefined): boolean {
  if (!remoteAddress) return false;
  return (
    remoteAddress === '127.0.0.1' ||
    remoteAddress === '::1' ||
    remoteAddress === '::ffff:127.0.0.1'
  );
}
