export function isLikelyFilePath(str: string) {
  // Deep links (e.g. expo-orbit:///download?url=...apk) are also passed through argv on
  // Windows and Linux and can end with a file extension, so ignore anything with a URL scheme
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(str)) {
    return false;
  }

  // Check if the string contains slashes or backslashes (directory separators)
  const hasSlashes = str.includes('/') || str.includes('\\');

  // Check if the string ends with a file extension
  const hasFileExtension = /\.\w+$/.test(str);

  return hasSlashes && hasFileExtension;
}
