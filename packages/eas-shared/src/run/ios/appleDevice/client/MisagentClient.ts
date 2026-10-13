import Debug from 'debug';
import { Socket } from 'net';

import { ResponseError, ServiceClient } from './ServiceClient';
import type { LockdownCommand } from '../protocol/LockdownProtocol';
import { LockdownProtocolClient } from '../protocol/LockdownProtocol';

const debug = Debug('expo:apple-device:client:misagent');

type MisagentCopyResponse = {
  Status?: number;
  Payload?: Buffer[];
};

/**
 * `com.apple.misagent`: the device's provisioning-profile store. Plist over the
 * lockdown framing like installation_proxy, but requests are keyed by
 * `MessageType` rather than `Command`.
 */
export class MisagentClient extends ServiceClient<LockdownProtocolClient<LockdownCommand>> {
  constructor(socket: Socket) {
    super(socket, new LockdownProtocolClient(socket));
  }

  /** Every provisioning profile installed on the device, as raw CMS blobs. */
  async copyProvisioningProfiles(): Promise<Buffer[]> {
    debug('copyProvisioningProfiles');
    const resp = await this.protocolClient.sendMessage<MisagentCopyResponse>({
      // `Copy` is the pre-iOS 9.3 request and gets no reply from current iOS.
      MessageType: 'CopyAll',
      ProfileType: 'Provisioning',
    } as unknown as LockdownCommand);
    if (resp?.Status !== 0 || !Array.isArray(resp.Payload)) {
      throw new ResponseError('There was an error listing provisioning profiles', resp);
    }
    return resp.Payload.map((item) => Buffer.from(item));
  }
}
