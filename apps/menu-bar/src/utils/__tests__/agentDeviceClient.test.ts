import {
  AgentDeviceError,
  installFromSourceAsync,
  openAppAsync,
  probeAsync,
} from '../agentDeviceClient';

const connection = { url: 'https://daemon.example', token: 'secret-token' };

describe('agentDeviceClient', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function mockFetch(implementation: jest.Mock) {
    global.fetch = implementation as unknown as typeof fetch;
    return implementation;
  }

  it('posts a JSON-RPC command with the session bearer token', async () => {
    const fetchMock = mockFetch(
      jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ jsonrpc: '2.0', id: 'orbit-0', result: {} }),
      })
    );

    await installFromSourceAsync(connection, { url: 'https://example.com/app.tar.gz' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://daemon.example/rpc');
    expect(init.method).toBe('POST');
    expect(init.headers.authorization).toBe('Bearer secret-token');

    const body = JSON.parse(init.body);
    expect(body.jsonrpc).toBe('2.0');
    expect(body.method).toBe('agent_device.command');
    expect(body.params).toMatchObject({
      command: 'install-from-source',
      url: 'https://example.com/app.tar.gz',
      platform: 'ios',
    });
  });

  it('surfaces a JSON-RPC error as an AgentDeviceError', async () => {
    mockFetch(
      jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 'orbit-0',
          error: { code: -32000, message: 'No such app' },
        }),
      })
    );

    await expect(openAppAsync(connection, { appId: 'com.acme.app' })).rejects.toThrow(
      new AgentDeviceError('No such app')
    );
  });

  it('surfaces an HTTP failure as an AgentDeviceError', async () => {
    mockFetch(jest.fn().mockResolvedValue({ ok: false, status: 401 }));

    await expect(openAppAsync(connection, { appId: 'com.acme.app' })).rejects.toThrow(
      AgentDeviceError
    );
  });

  it('wraps a network failure rather than leaking the raw error', async () => {
    mockFetch(jest.fn().mockRejectedValue(new Error('socket hang up')));

    await expect(openAppAsync(connection, { appId: 'com.acme.app' })).rejects.toThrow(
      AgentDeviceError
    );
  });

  // The daemon protocol is not a published contract, so the UI probes before it
  // offers daemon-backed actions and treats a failure as "preview only".
  it('reports the daemon as unreachable instead of throwing', async () => {
    mockFetch(jest.fn().mockRejectedValue(new Error('ECONNREFUSED')));

    await expect(probeAsync(connection)).resolves.toBe(false);
  });

  it('reports the daemon as reachable when /health responds', async () => {
    const fetchMock = mockFetch(jest.fn().mockResolvedValue({ ok: true }));

    await expect(probeAsync(connection)).resolves.toBe(true);
    expect(fetchMock.mock.calls[0][0]).toBe('https://daemon.example/health');
  });
});
