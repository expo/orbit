export const getPlatformFromURI = (url: string): 'android' | 'ios' => {
  return url.endsWith('.apk') ? 'android' : 'ios';
};
