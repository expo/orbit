import { Duplex } from 'stream';

import { RemoteServiceDiscovery, RsdPeerInfo } from '../rsd';

const SERVICE = 'com.apple.afc.shim.remote';
const SERVICE_PORT = 51234;

/**
 * Two cross-connected in-memory duplex ends (like a socket and its peer): whatever one end writes
 * is pushed, chunk boundaries intact, onto the other end's readable side.
 */
function duplexPair(): [Duplex, Duplex] {
  const ends: Duplex[] = [];
  const makeEnd = (peerIndex: number) =>
    new Duplex({
      read() {},
      write(chunk: Buffer, _encoding, callback) {
        ends[peerIndex].push(chunk);
        callback();
      },
      final(callback) {
        ends[peerIndex].push(null);
        callback();
      },
    });
  ends.push(makeEnd(1), makeEnd(0));
  return [ends[0], ends[1]];
}

function xmlPlist(entries: Record<string, string>): string {
  const body = Object.entries(entries)
    .map(([key, value]) => `<key>${key}</key><string>${value}</string>`)
    .join('');
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" ' +
    '"http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n' +
    `<plist version="1.0"><dict>${body}</dict></plist>\n`
  );
}

function frame(entries: Record<string, string>): Buffer {
  const payload = Buffer.from(xmlPlist(entries), 'utf8');
  const header = Buffer.alloc(4);
  header.writeUInt32BE(payload.length);
  return Buffer.concat([header, payload]);
}

/** Reads one length-prefixed message the host wrote. */
function readFramed(device: Duplex): Promise<Buffer> {
  return new Promise((resolve) => {
    let buffer = Buffer.alloc(0);
    const onData = (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);
      if (buffer.length >= 4 && buffer.length >= 4 + buffer.readUInt32BE(0)) {
        device.removeListener('data', onData);
        device.pause();
        resolve(buffer.subarray(4, 4 + buffer.readUInt32BE(0)));
      }
    };
    device.on('data', onData);
  });
}

function collect(stream: Duplex, length: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    stream.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
      total += chunk.length;
      if (total >= length) resolve(Buffer.concat(chunks));
    });
    stream.on('error', reject);
  });
}

function makeRsd(host: Duplex): { rsd: RemoteServiceDiscovery; connect: jest.Mock } {
  const connect = jest.fn(async () => host);
  const rsd = new RemoteServiceDiscovery({ connect }, 'fd00::1');
  const peerInfo: RsdPeerInfo = {
    Properties: { UniqueDeviceID: 'test' },
    Services: { [SERVICE]: { Port: String(SERVICE_PORT) } },
  };
  rsd.peerInfo = peerInfo;
  return { rsd, connect };
}

describe('RemoteServiceDiscovery.startLockdownServiceSocket', () => {
  it('delivers bytes that arrive in the same chunk as the checkin replies', async () => {
    const [host, device] = duplexPair();
    const { rsd, connect } = makeRsd(host);

    const extra = Buffer.from([0x43, 0x46, 0x41, 0x36, 0x4c, 0x50, 0x41, 0x41, 0xde, 0xad]);
    const deviceSide = (async () => {
      const checkin = (await readFramed(device)).toString('utf8');
      expect(checkin).toContain('RSDCheckin');
      device.write(
        Buffer.concat([frame({ Request: 'RSDCheckin' }), frame({ Request: 'StartService' }), extra])
      );
    })();

    const socket = await rsd.startLockdownServiceSocket(SERVICE);
    await deviceSide;
    expect(connect).toHaveBeenCalledWith('fd00::1', SERVICE_PORT);
    expect(socket).toBe(host);

    // Let any pending stream ticks run before a consumer subscribes: nothing may be lost.
    await new Promise((resolve) => setImmediate(resolve));

    const later = Buffer.from('later bytes');
    const received = collect(socket, extra.length + later.length);
    device.write(later);
    expect(await received).toEqual(Buffer.concat([extra, later]));

    // Writes still reach the device unchanged (no plist framing).
    const echoed = new Promise<Buffer>((resolve) => device.once('data', resolve));
    device.resume();
    socket.write(Buffer.from('ping'));
    expect(await echoed).toEqual(Buffer.from('ping'));

    socket.destroy();
    device.destroy();
  });

  it('works when no extra bytes follow the replies', async () => {
    const [host, device] = duplexPair();
    const { rsd } = makeRsd(host);

    const deviceSide = (async () => {
      await readFramed(device);
      device.write(frame({ Request: 'RSDCheckin' }));
      device.write(frame({ Request: 'StartService' }));
    })();

    const socket = await rsd.startLockdownServiceSocket(SERVICE);
    await deviceSide;

    const payload = Buffer.from('hello');
    const received = collect(socket, payload.length);
    device.write(payload);
    expect(await received).toEqual(payload);

    socket.destroy();
    device.destroy();
  });

  it('rejects and closes the stream when StartService reports an error', async () => {
    const [host, device] = duplexPair();
    const { rsd } = makeRsd(host);

    (async () => {
      await readFramed(device);
      device.write(
        Buffer.concat([
          frame({ Request: 'RSDCheckin' }),
          frame({ Request: 'StartService', Error: 'ServiceProhibited' }),
        ])
      );
    })();

    await expect(rsd.startLockdownServiceSocket(SERVICE)).rejects.toThrow(
      `${SERVICE}: ServiceProhibited`
    );
    expect(host.destroyed).toBe(true);
    device.destroy();
  });
});
