import {
  defaultSimulatorCameraPreferences,
  describeSource,
  describeStatus,
  normalizeSimulatorCameraPreferences,
  normalizeSource,
  resolveSources,
} from '../simulatorCamera';

jest.mock('../../modules/Storage', () => ({ storage: { getString: jest.fn(), set: jest.fn() } }));

describe('normalizeSource', () => {
  it('keeps a complete source', () => {
    expect(normalizeSource({ kind: 'image', value: '/a/b.png', contentMode: 'fit' })).toEqual({
      kind: 'image',
      value: '/a/b.png',
      contentMode: 'fit',
    });
  });

  it('drops a source that needs a value and has none', () => {
    expect(normalizeSource({ kind: 'qr' })).toEqual({ kind: 'none' });
    expect(normalizeSource({ kind: 'video', value: '' })).toEqual({ kind: 'none' });
  });

  it('accepts a Mac camera without an ID (the default camera)', () => {
    expect(normalizeSource({ kind: 'macCamera' })).toEqual({ kind: 'macCamera' });
  });

  it('rejects unknown kinds, content modes and shapes', () => {
    expect(normalizeSource({ kind: 'webcam', value: 'x' })).toEqual({ kind: 'none' });
    expect(normalizeSource({ kind: 'image', value: '/a.png', contentMode: 'stretch' })).toEqual({
      kind: 'image',
      value: '/a.png',
    });
    expect(normalizeSource('image')).toEqual({ kind: 'none' });
    expect(normalizeSource(null)).toEqual({ kind: 'none' });
  });
});

describe('normalizeSimulatorCameraPreferences', () => {
  it('returns the defaults for garbage', () => {
    expect(normalizeSimulatorCameraPreferences(undefined)).toEqual(
      defaultSimulatorCameraPreferences
    );
    expect(normalizeSimulatorCameraPreferences(42)).toEqual(defaultSimulatorCameraPreferences);
  });

  it('keeps a front camera that follows the back camera as null', () => {
    const preferences = normalizeSimulatorCameraPreferences({
      enabled: true,
      back: { kind: 'qr', value: 'token' },
    });
    expect(preferences).toEqual({
      enabled: true,
      back: { kind: 'qr', value: 'token' },
      front: null,
    });
    expect(resolveSources(preferences)).toEqual({
      back: { kind: 'qr', value: 'token' },
      front: { kind: 'qr', value: 'token' },
    });
  });

  it('keeps a front camera of its own', () => {
    const preferences = normalizeSimulatorCameraPreferences({
      enabled: 'yes',
      back: { kind: 'image', value: '/back.png' },
      front: { kind: 'macCamera', value: 'cam-1' },
    });
    expect(preferences.enabled).toBe(false);
    expect(resolveSources(preferences)).toEqual({
      back: { kind: 'image', value: '/back.png' },
      front: { kind: 'macCamera', value: 'cam-1' },
    });
  });
});

describe('describeSource', () => {
  it('names each kind', () => {
    expect(describeSource({ kind: 'none' })).toBe('None');
    expect(describeSource({ kind: 'image', value: '/Users/me/Pictures/card.png' })).toBe(
      'Image · card.png'
    );
    expect(describeSource({ kind: 'video', value: '/tmp/demo.mp4' })).toBe('Video · demo.mp4');
    expect(describeSource({ kind: 'qr', value: 'https://expo.dev' })).toBe(
      'QR code · https://expo.dev'
    );
  });

  it('names a Mac camera by its ID when known', () => {
    const cameras = [{ id: 'cam-1', name: 'FaceTime HD Camera' }];
    expect(describeSource({ kind: 'macCamera', value: 'cam-1' }, cameras)).toBe(
      'FaceTime HD Camera'
    );
    expect(describeSource({ kind: 'macCamera', value: 'gone' }, cameras)).toBe('Mac camera');
    expect(describeSource({ kind: 'macCamera' }, cameras)).toBe('Default Mac camera');
  });
});

describe('describeStatus', () => {
  const base = { framesDirectory: '/tmp/frames', sources: {}, sourceErrors: {} };

  it('tells which simulators have the camera', () => {
    expect(
      describeStatus({
        ...base,
        enabled: true,
        simulators: [
          { udid: '1', name: 'iPhone 17 Pro', injected: true },
          { udid: '2', name: 'iPad', injected: false },
        ],
      })
    ).toMatch(/^On in iPhone 17 Pro\./);
  });

  it('asks for a booted simulator when there is none', () => {
    expect(describeStatus({ ...base, enabled: true, simulators: [] })).toMatch(
      /Boot an iOS simulator/
    );
  });

  it('shows the error first', () => {
    expect(describeStatus({ ...base, enabled: true, simulators: [], error: 'No Xcode' })).toBe(
      'No Xcode'
    );
  });

  it('reads as off when disabled', () => {
    expect(describeStatus({ ...base, enabled: false, simulators: [] })).toMatch(/^Off\./);
    expect(describeStatus(undefined)).toBe('Checking…');
  });
});
