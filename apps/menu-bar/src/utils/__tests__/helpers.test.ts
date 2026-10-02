import { extractDownloadProgress } from '../helpers';

describe('extractDownloadProgress', () => {
  it('returns a percentage for a complete progress line', () => {
    expect(extractDownloadProgress('Downloading app (12.5 MB / 50 MB)')).toBeCloseTo(25);
    expect(extractDownloadProgress('Downloading app archive (150 MB / 150 MB)')).toBe(100);
  });

  it('returns undefined when no MB / MB pair is present', () => {
    expect(extractDownloadProgress('Downloading app (12.5 M')).toBeUndefined();
    expect(extractDownloadProgress('Downloading app (512.0 KB / 50 MB)')).toBeUndefined();
    expect(extractDownloadProgress('Successfully downloaded app')).toBeUndefined();
  });
});
