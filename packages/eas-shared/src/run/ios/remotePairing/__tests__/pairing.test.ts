import crypto from 'crypto';
import net from 'net';

import { chachaOpen, chachaSeal, Ed25519, hkdf512 } from '../crypto';
import { decodeOpack, encodeOpack } from '../opack';
import { acceptPairing, framePacket, PacketReader, PairingError } from '../rppairing';
import { SrpClient } from '../srp';
import { decodeTlv, encodeTlv, TLV } from '../tlv8';

const nonce = (label: string) => Buffer.concat([Buffer.alloc(4), Buffer.from(label, 'latin1')]);

const HOST = {
  name: 'Test Mac (Expo Orbit)',
  model: 'Mac14,6',
  identifier: crypto.randomUUID().toUpperCase(),
  altIrk: crypto.randomBytes(16),
};

const DEVICE = {
  accountID: crypto.randomUUID().toUpperCase(),
  altIRK: crypto.randomBytes(16),
  name: "Tester's iPhone",
  model: 'iPhone17,1',
  remotepairing_udid: '00008140-0000000000000000',
};

/**
 * Plays the iPhone's side of Remote Device Pairing (Pair-Setup M1/M3/M5) against the host
 * listener, typing `pin` the way a user would on the phone.
 */
async function pairAsDeviceAsync(socket: net.Socket, getPin: () => Promise<string>) {
  const reader = new PacketReader(socket);
  let sequence = 0;
  const send = (value: unknown) =>
    socket.write(
      framePacket({
        message: { plain: { _0: value } },
        originatedBy: 'host',
        sequenceNumber: sequence++,
      })
    );
  const sendPairingData = (data: Buffer) =>
    send({ event: { _0: { pairingData: { _0: { data: data.toString('base64') } } } } });
  const receivePairingData = async () => {
    const envelope = await reader.next(5000);
    return decodeTlv(Buffer.from(envelope.message.plain._0.event._0.pairingData._0.data, 'base64'));
  };

  send({ request: { _0: { handshake: { _0: { wireProtocolVersion: 26, hostOptions: {} } } } } });
  const handshake = (await reader.next(5000)).message.plain._0.response._1.handshake._0;

  sendPairingData(encodeTlv([[TLV.STATE, Buffer.from([1])]]));
  const m2 = await receivePairingData();
  const srp = new SrpClient({ password: await getPin() });
  const sessionKey = srp.process(m2.get(TLV.PUBLIC_KEY)!, m2.get(TLV.SALT)!);
  sendPairingData(
    encodeTlv([
      [TLV.STATE, Buffer.from([3])],
      [TLV.PUBLIC_KEY, srp.publicKey],
      [TLV.PROOF, srp.M1],
    ])
  );
  const m4 = await receivePairingData();
  if (m4.has(TLV.ERROR)) throw new PairingError('host rejected the PIN');
  expect(m4.get(TLV.PROOF)).toEqual(srp.M2);

  const setupKey = hkdf512(
    sessionKey,
    Buffer.from('Pair-Setup-Encrypt-Salt'),
    Buffer.from('Pair-Setup-Encrypt-Info')
  );
  const identity = new Ed25519();
  const identifier = crypto.randomUUID().toUpperCase();
  const deviceX = hkdf512(
    sessionKey,
    Buffer.from('Pair-Setup-Controller-Sign-Salt'),
    Buffer.from('Pair-Setup-Controller-Sign-Info')
  );
  const signature = identity.sign(
    Buffer.concat([deviceX, Buffer.from(identifier, 'utf8'), identity.publicKey])
  );
  const m5Plain = encodeTlv([
    [TLV.IDENTIFIER, Buffer.from(identifier, 'utf8')],
    [TLV.PUBLIC_KEY, identity.publicKey],
    [TLV.SIGNATURE, signature],
    [TLV.INFO, encodeOpack(DEVICE)],
  ]);
  sendPairingData(
    encodeTlv([
      [TLV.STATE, Buffer.from([5])],
      [TLV.ENCRYPTED_DATA, chachaSeal(setupKey, nonce('PS-Msg05'), m5Plain)],
    ])
  );

  const m6 = await receivePairingData();
  const hostTlv = decodeTlv(chachaOpen(setupKey, nonce('PS-Msg06'), m6.get(TLV.ENCRYPTED_DATA)!));
  return { handshake, hostTlv };
}

function connectedPairAsync(): Promise<{ host: net.Socket; device: net.Socket; close(): void }> {
  return new Promise((resolve) => {
    const server = net.createServer((host) => {
      resolve({ host, device, close: () => server.close() });
    });
    let device: net.Socket;
    server.listen(0, '127.0.0.1', () => {
      device = net.connect((server.address() as net.AddressInfo).port, '127.0.0.1');
    });
  });
}

describe('acceptPairing', () => {
  it('pairs with a device that enters the PIN shown on the host', async () => {
    const { host, device, close } = await connectedPairAsync();
    let showPin!: (pin: string) => void;
    const pinShown = new Promise<string>((resolve) => (showPin = resolve));
    const hostOutcome = acceptPairing(host, HOST, { onPin: (value) => showPin(value) });

    const deviceResult = await pairAsDeviceAsync(device, () => pinShown);
    const outcome = await hostOutcome;

    expect(await pinShown).toMatch(/^\d{6}$/);
    expect(deviceResult.handshake.peerDeviceInfo).toMatchObject({
      identifier: HOST.identifier,
      name: HOST.name,
    });
    // The device learned the host's identity and altIRK, which it uses for the authTag.
    expect(deviceResult.hostTlv.get(TLV.IDENTIFIER)!.toString('utf8')).toBe(HOST.identifier);
    const hostInfo = decodeOpack(deviceResult.hostTlv.get(TLV.INFO)!) as Record<string, unknown>;
    expect(Buffer.from(hostInfo.altIRK as Buffer)).toEqual(HOST.altIrk);
    // The host learned the phone.
    expect(outcome.peer).toMatchObject({
      accountId: DEVICE.accountID,
      name: DEVICE.name,
      model: DEVICE.model,
      udid: DEVICE.remotepairing_udid,
    });
    expect(outcome.peer.altIrk).toEqual(DEVICE.altIRK);

    host.destroy();
    device.destroy();
    close();
  });

  it('rejects a wrong PIN', async () => {
    const { host, device, close } = await connectedPairAsync();
    const outcome = acceptPairing(host, HOST, {});
    outcome.catch(() => {});
    await expect(pairAsDeviceAsync(device, async () => '000000x')).rejects.toThrow(
      'host rejected the PIN'
    );
    await expect(outcome).rejects.toThrow(/wrong PIN/);
    host.destroy();
    device.destroy();
    close();
  });
});
