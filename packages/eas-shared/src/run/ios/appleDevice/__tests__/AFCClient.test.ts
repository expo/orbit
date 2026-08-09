import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { AFCClient } from '../client/AFCClient';
import { AFC_STATUS, AFCError } from '../protocol/AFCProtocol';

// The constructor builds a real AFCProtocolClient that subscribes to socket
// 'data' events. We never push any data, so a minimal fake socket is enough to
// construct the client; all behaviour is driven through mocked instance methods.
function createClient(): AFCClient {
  const fakeSocket: any = { on: jest.fn(), write: jest.fn() };
  return new AFCClient(fakeSocket);
}

describe('AFCClient.uploadDirectory', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'afc-upload-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  it('retries a persistent NO_RESOURCES a bounded number of times, then fails the upload', async () => {
    // Regression: the retry used to recurse with `uploadFile(tries++)`, which
    // passes the *old* value, so the counter never advanced and a persistent
    // NO_RESOURCES retried forever. It must stop after MAX_UPLOAD_RETRIES
    // retries and surface the error.
    fs.writeFileSync(path.join(tmpDir, 'starved.txt'), 'a');
    fs.writeFileSync(path.join(tmpDir, 'healthy.txt'), 'b');

    const client = createClient();
    const noResources = new AFCError('NO_RESOURCES', AFC_STATUS.NO_RESOURCES);

    jest.spyOn(client, 'makeDirectory').mockResolvedValue(undefined as any);
    const uploadFile = jest
      .spyOn(client as any, 'uploadFile')
      .mockImplementation((filePath: unknown) => {
        // `starved.txt` never recovers; `healthy.txt` uploads fine.
        return path.basename(String(filePath)) === 'starved.txt'
          ? Promise.reject(noResources)
          : Promise.resolve();
      });

    await expect(client.uploadDirectory(tmpDir, '/remote/dir')).rejects.toBe(noResources);

    // Initial attempt + MAX_UPLOAD_RETRIES (= 10) retries, then give up.
    const starvedCalls = uploadFile.mock.calls.filter(
      ([p]) => path.basename(String(p)) === 'starved.txt'
    );
    expect(starvedCalls.length).toBe(1 + 10);
  });

  it('retries a transient NO_RESOURCES and then succeeds', async () => {
    fs.writeFileSync(path.join(tmpDir, 'only.txt'), 'x');

    const client = createClient();
    const noResources = new AFCError('NO_RESOURCES', AFC_STATUS.NO_RESOURCES);

    jest.spyOn(client, 'makeDirectory').mockResolvedValue(undefined as any);
    let attempts = 0;
    jest.spyOn(client as any, 'uploadFile').mockImplementation(() => {
      attempts++;
      // Fails twice, then the resource frees up and it succeeds.
      return attempts < 3 ? Promise.reject(noResources) : Promise.resolve();
    });

    await expect(client.uploadDirectory(tmpDir, '/remote/dir')).resolves.toBeUndefined();
    expect(attempts).toBe(3);
  });

  it('still aborts the whole upload for non-resource errors', async () => {
    fs.writeFileSync(path.join(tmpDir, 'bad.txt'), 'x');
    fs.writeFileSync(path.join(tmpDir, 'good.txt'), 'y');

    const client = createClient();
    const fatal = new AFCError('READ_ERROR', AFC_STATUS.READ_ERROR);

    jest.spyOn(client, 'makeDirectory').mockResolvedValue(undefined as any);
    jest.spyOn(client as any, 'uploadFile').mockImplementation((filePath: unknown) => {
      return path.basename(String(filePath)) === 'bad.txt'
        ? Promise.reject(fatal)
        : Promise.resolve();
    });

    // Only NO_RESOURCES is retried; other failures still reject.
    await expect(client.uploadDirectory(tmpDir, '/remote/dir')).rejects.toBe(fatal);
  });
});
