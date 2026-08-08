import { formatBytes } from '../files';

describe('formatBytes', () => {
  it.each([
    { bytes: 0, expected: '0' },
    { bytes: 1, expected: '1 B' },
    { bytes: 1024, expected: '1.0 KB' },
    { bytes: 1048576, expected: '1.0 MB' },
    { bytes: 200 * 1024 * 1024, expected: '200 MB' },
    { bytes: 50 * 1024 ** 3, expected: '50.0 GB' },
    { bytes: 200 * 1024 ** 3, expected: '200 GB' },
    { bytes: 1024 ** 4, expected: '1024 GB' },
  ])('formats $bytes bytes as $expected', ({ bytes, expected }) => {
    expect(formatBytes(bytes)).toBe(expected);
  });
});
