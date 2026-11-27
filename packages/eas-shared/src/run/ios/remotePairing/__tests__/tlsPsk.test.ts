import crypto from 'crypto';
import net from 'net';
import { Duplex } from 'stream';
import tls from 'tls';

import { TlsPskError, TlsPskSocket, prf } from '../tlsPsk';

const PSK = crypto.randomBytes(32);

/** A TLS server from Node's own `tls` (OpenSSL), with the cipher suite that the iPhone uses. */
function startServer(
  psk: Buffer,
  onConnection: (socket: tls.TLSSocket) => void,
  options: tls.TlsOptions = {}
): Promise<{ port: number; close: () => void }> {
  return new Promise((resolve) => {
    const server = tls.createServer({
      minVersion: 'TLSv1.2',
      maxVersion: 'TLSv1.2',
      ciphers: 'PSK-AES128-GCM-SHA256',
      pskCallback: () => psk,
      ...options,
    });
    server.on('secureConnection', onConnection);
    server.on('tlsClientError', () => {});
    server.listen(0, '127.0.0.1', () =>
      resolve({ port: (server.address() as net.AddressInfo).port, close: () => server.close() })
    );
  });
}

function connect(port: number, psk: Buffer): Promise<TlsPskSocket> {
  return new Promise((resolve, reject) => {
    const socket = new TlsPskSocket(net.connect({ host: '127.0.0.1', port }), psk);
    socket.once('secureConnect', () => resolve(socket));
    socket.once('error', reject);
  });
}

function readBytes(stream: Duplex, length: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    const onData = (chunk: Buffer): void => {
      chunks.push(chunk);
      size += chunk.length;
      if (size >= length) {
        stream.removeListener('data', onData);
        resolve(Buffer.concat(chunks));
      }
    };
    stream.on('data', onData);
    stream.once('error', reject);
  });
}

describe('prf', () => {
  // The TLS 1.2 PRF test vector for SHA-256 that the IETF TLS working group published.
  it('matches the SHA-256 test vector', () => {
    const output = prf(
      Buffer.from('9bbe436ba940f017b17652849a71db35', 'hex'),
      'test label',
      Buffer.from('a0ba9f936cda311827a6f796ffd5198c', 'hex'),
      100
    );
    expect(output.toString('hex')).toBe(
      'e3f229ba727be17b8d122620557cd453c2aab21d07c3d495329b52d4e61edb5a' +
        '6b301791e90d35c9c9a46b4e14baf9af0fa022f7077def17abfd3797c0564bab' +
        '4fbc91666e9def9b97fce34f796789baa48082d122ee42c5a72e5a5110fff701' +
        '87347b66'
    );
  });
});

describe('TlsPskSocket', () => {
  it('completes the handshake with an OpenSSL server and sends data both ways', async () => {
    const payload = crypto.randomBytes(200_000);
    const server = await startServer(PSK, (socket) => {
      expect(socket.getCipher().standardName).toBe('TLS_PSK_WITH_AES_128_GCM_SHA256');
      socket.pipe(socket);
    });
    try {
      const socket = await connect(server.port, PSK);
      const echoed = readBytes(socket, payload.length);
      socket.write(payload);
      expect((await echoed).equals(payload)).toBe(true);
      socket.destroy();
    } finally {
      server.close();
    }
  });

  it('sends data that was written before the handshake completed', async () => {
    const server = await startServer(PSK, (socket) => socket.pipe(socket));
    try {
      const socket = new TlsPskSocket(net.connect({ host: '127.0.0.1', port: server.port }), PSK);
      const echoed = readBytes(socket, 5);
      socket.write('early');
      expect((await echoed).toString()).toBe('early');
      socket.destroy();
    } finally {
      server.close();
    }
  });

  it('ends when the server closes the connection', async () => {
    const server = await startServer(PSK, (socket) => socket.end('bye'));
    try {
      const socket = await connect(server.port, PSK);
      const chunks: Buffer[] = [];
      socket.on('data', (chunk: Buffer) => chunks.push(chunk));
      await new Promise((resolve) => socket.once('end', resolve));
      expect(Buffer.concat(chunks).toString()).toBe('bye');
      socket.destroy();
    } finally {
      server.close();
    }
  });

  it('completes the handshake with a server that has no extended master secret', async () => {
    // SSL_OP_NO_EXTENDED_MASTER_SECRET of OpenSSL 3, which `crypto.constants` does not have.
    const server = await startServer(PSK, (socket) => socket.pipe(socket), { secureOptions: 1 });
    try {
      const socket = await connect(server.port, PSK);
      expect(socket).toHaveProperty('useExtendedMasterSecret', false);
      const echoed = readBytes(socket, 5);
      socket.write('plain');
      expect((await echoed).toString()).toBe('plain');
      socket.destroy();
    } finally {
      server.close();
    }
  });

  it('keeps the data that was not read when the server closes the connection', async () => {
    const payload = crypto.randomBytes(100_000);
    const server = await startServer(PSK, (socket) => socket.end(payload));
    try {
      const socket = await connect(server.port, PSK);
      // The data and the end of the connection arrive while no one reads.
      await new Promise((resolve) => setTimeout(resolve, 200));
      const chunks: Buffer[] = [];
      socket.on('data', (chunk: Buffer) => chunks.push(chunk));
      await new Promise((resolve) => socket.once('close', resolve));
      expect(Buffer.concat(chunks).equals(payload)).toBe(true);
    } finally {
      server.close();
    }
  });

  it('closes the transport after an end before the handshake completed', async () => {
    const server = await startServer(PSK, (socket) => socket.resume());
    try {
      const transport = net.connect({ host: '127.0.0.1', port: server.port });
      const socket = new TlsPskSocket(transport, PSK);
      socket.resume();
      socket.end();
      await new Promise((resolve) => transport.once('close', resolve));
      expect(socket.destroyed).toBe(true);
    } finally {
      server.close();
    }
  });

  it('rejects a server that has a different key', async () => {
    const server = await startServer(crypto.randomBytes(32), () => {});
    try {
      await expect(connect(server.port, PSK)).rejects.toThrow(TlsPskError);
    } finally {
      server.close();
    }
  });

  it('fails when the transport closes during the handshake', async () => {
    const transport = new Duplex({ read() {}, write: (_chunk, _encoding, callback) => callback() });
    const socket = new TlsPskSocket(transport, PSK);
    const failure = new Promise((resolve) => socket.once('error', resolve));
    transport.destroy();
    expect(await failure).toBeInstanceOf(TlsPskError);
  });

  it('fails a write that waits for the handshake when the stream is destroyed', async () => {
    const transport = new Duplex({ read() {}, write: (_chunk, _encoding, callback) => callback() });
    const socket = new TlsPskSocket(transport, PSK);
    const failure = new Promise((resolve) => socket.write('early', resolve));
    socket.destroy();
    expect(await failure).toBeInstanceOf(TlsPskError);
  });
});
