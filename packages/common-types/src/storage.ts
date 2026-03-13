export const MMKVInstanceId = 'mmkv.default';
const AUTH_FILE_NAME = 'auth.json';

export function getExpoOrbitDirectory(homedir: string) {
  return `${homedir}/.expo/orbit`;
}

export function userSettingsFile(homedir: string): string {
  return `${getExpoOrbitDirectory(homedir)}/${AUTH_FILE_NAME}`;
}

export type UserSettingsData = {
  sessionSecret?: string;
  envVars?: Record<string, string>;
  trustedSources?: string[];
};

/**
 * Extracts root domain names from trusted source glob patterns.
 * e.g., "https://custom.example.com/**" -> "example.com"
 * e.g., "https://*.internal.dev/**" -> "internal.dev"
 */
export function extractDomainsFromTrustedSources(patterns: string[]): string[] {
  const domains = new Set<string>();
  for (const pattern of patterns) {
    try {
      const cleanUrl = pattern.replace(/\/\*\*$/, '').replace(/\/\*$/, '');
      const parseable = cleanUrl.replace('://*.', '://wildcard.');
      const url = new URL(parseable);
      let hostname = url.hostname;

      const components = hostname.split('.');
      if (components.length > 2) {
        hostname = components.slice(-2).join('.');
      }

      if (hostname) {
        domains.add(hostname);
      }
    } catch {
      // Skip unparseable patterns
    }
  }
  return Array.from(domains);
}
