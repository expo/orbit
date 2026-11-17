import crypto from 'crypto';
import { Duplex } from 'stream';

import { NetStack, TcpConnection, bytesToIp, ipToBytes } from '../netstack';
import {
  CDTUNNEL_MAGIC,
  Ipv6Splitter,
  TunnelError,
  decodeCdTunnel,
  encodeCdTunnel,
} from '../tunnel';

const CLIENT_ADDRESS = 'fd00:1::2';
const SERVER_ADDRESS = 'fd00:1::1';

/** Wire two stacks back-to-back through a byte stream, as the CDTunnel TLS socket would. */
function link(a: NetStack, b: NetStack): void {
  const wire = (from: NetStack, to: NetStack): void => {
    const splitter = new Ipv6Splitter();
    from.on('packet', (packet: Buffer) => {
      // Deliver asynchronously (like a real socket) so ACK ping-pong doesn't recurse.
      setImmediate(() => {
        for (const whole of splitter.push(packet)) to.receive(whole);
      });
    });
  };
  wire(a, b);
  wire(b, a);
}

function collect(stream: Duplex): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

describe('NetStack', () => {
  let client: NetStack;
  let server: NetStack;

  beforeEach(() => {
    client = new NetStack({ localAddress: CLIENT_ADDRESS });
    server = new NetStack({ localAddress: SERVER_ADDRESS });
    link(client, server);
  });

  afterEach(() => {
    client.close();
    server.close();
  });

  it('transfers ~200 KB in both directions over TCP', async () => {
    const upstream = crypto.randomBytes(200 * 1024 + 123);
    const downstream = crypto.randomBytes(200 * 1024 + 457);

    const accepted = new Promise<TcpConnection>((resolve) => {
      server.listen(62078, resolve);
    });
    const socket = await client.connect(SERVER_ADDRESS, 62078);
    socket.setNoDelay?.(true);
    const peer = await accepted;
    expect(peer.remoteAddress).toBe(CLIENT_ADDRESS);
    expect(socket.remoteAddress).toBe(SERVER_ADDRESS);

    const serverReceived = collect(peer);
    const clientReceived = collect(socket);

    // Write in uneven chunks to exercise segmentation and the send buffer.
    for (let offset = 0; offset < upstream.length; offset += 7000) {
      socket.write(upstream.subarray(offset, offset + 7000));
    }
    socket.end();
    peer.write(downstream);
    peer.end();

    const [atServer, atClient] = await Promise.all([serverReceived, clientReceived]);
    expect(atServer.equals(upstream)).toBe(true);
    expect(atClient.equals(downstream)).toBe(true);
  });

  it('rejects a connection to a port nobody listens on', async () => {
    await expect(client.connect(SERVER_ADDRESS, 1234)).rejects.toThrow('connection refused');
  });
});

describe('CDTunnel framing', () => {
  it('round-trips a handshake body', () => {
    const body = { type: 'clientHandshakeRequest', mtu: 16000 };
    const encoded = encodeCdTunnel(body);
    expect(encoded.subarray(0, CDTUNNEL_MAGIC.length).equals(CDTUNNEL_MAGIC)).toBe(true);

    const trailing = Buffer.from([0x60, 0, 0, 0]);
    const decoded = decodeCdTunnel(Buffer.concat([encoded, trailing]));
    expect(decoded).toEqual({ body, length: encoded.length });
  });

  it('waits for a complete frame and rejects bad magic', () => {
    const encoded = encodeCdTunnel({ serverAddress: SERVER_ADDRESS });
    expect(decodeCdTunnel(encoded.subarray(0, 5))).toBeNull();
    expect(decodeCdTunnel(encoded.subarray(0, encoded.length - 1))).toBeNull();
    expect(() => decodeCdTunnel(Buffer.from('NotATunnel'))).toThrow(TunnelError);
  });
});

describe('IPv6 address helpers', () => {
  it('round-trips compressed addresses', () => {
    for (const address of [CLIENT_ADDRESS, 'fe80::1c2b:3cff:fe4d:5e6f', '2001:db8::']) {
      expect(bytesToIp(ipToBytes(address))).toBe(address);
    }
  });
});
