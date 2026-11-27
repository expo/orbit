// Ported from remote-device (MIT, https://github.com/expo/appdrop).
// CoreDevice services over RemoteXPC. Only launching apps is ported: installs go through the
// lockdown `*.shim.remote` services and Orbit's existing clients.
import plist from '@expo/plist';
import crypto from 'crypto';

import { RemoteXpcConnection, RemoteXpcMessage } from './remotexpc';
import { RemoteServiceDiscovery } from './rsd';
import { int64, uint64 } from './xpc';

export class CoreDeviceError extends Error {}

const CORE_DEVICE_VERSION = {
  components: [uint64(629), uint64(3)],
  originalComponentsCount: int64(2),
  stringValue: '629.3',
};

export interface LaunchOptions {
  args?: string[];
  env?: Record<string, string>;
  /** Off by default, like `devicectl device process launch` without `--terminate-existing`. */
  killExisting?: boolean;
  startSuspended?: boolean;
  /** Handed to the app on launch, like `devicectl device process launch --payload-url`. */
  url?: string;
}

export class CoreDeviceService {
  rsd: RemoteServiceDiscovery;
  serviceName: string;
  connection: RemoteXpcConnection | null = null;

  constructor(rsd: RemoteServiceDiscovery, serviceName: string) {
    this.rsd = rsd;
    this.serviceName = serviceName;
  }

  async connect(): Promise<this> {
    this.connection = await this.rsd.startRemoteService(this.serviceName);
    return this;
  }

  close(): void {
    this.connection?.close();
    this.connection = null;
  }

  baseRequest(featureIdentifier: string, input: unknown): RemoteXpcMessage {
    return {
      'CoreDevice.CoreDeviceDDIProtocolVersion': int64(2),
      'CoreDevice.coreDeviceVersion': CORE_DEVICE_VERSION,
      'CoreDevice.deviceIdentifier': crypto.randomUUID(),
      'CoreDevice.input': input,
      'CoreDevice.invocationIdentifier': crypto.randomUUID(),
      'CoreDevice.featureIdentifier': featureIdentifier,
      'CoreDevice.action': {},
    };
  }

  private async ensureConnection(): Promise<RemoteXpcConnection> {
    if (!this.connection) await this.connect();
    return this.connection!;
  }

  async invoke(featureIdentifier: string, input: unknown = {}): Promise<any> {
    if (!this.rsd.hasFeature(this.serviceName, featureIdentifier)) {
      throw new CoreDeviceError(`${this.serviceName} does not support ${featureIdentifier}`);
    }
    const connection = await this.ensureConnection();
    const response = await connection.sendReceive(this.baseRequest(featureIdentifier, input));
    const output = response?.['CoreDevice.output'];
    if (output === undefined || output === null) {
      const error = response?.['CoreDevice.error'];
      const detail = describeError(error) || JSON.stringify(response).slice(0, 300);
      throw new CoreDeviceError(`${featureIdentifier} failed: ${detail}`);
    }
    return output;
  }
}

function describeError(error: any): string | null {
  if (!error) return null;
  const description =
    error.userInfo?.NSLocalizedDescription || error.localizedDescription || error.description;
  if (!description) return JSON.stringify(error).slice(0, 300);
  const code = error.code !== undefined ? ` (${error.domain || 'error'} ${error.code})` : '';
  return `${description}${code}`;
}

export class AppService extends CoreDeviceService {
  static SERVICE = 'com.apple.coredevice.appservice';

  constructor(rsd: RemoteServiceDiscovery) {
    super(rsd, AppService.SERVICE);
  }

  launch(
    bundleId: string,
    { args = [], env = {}, killExisting = false, startSuspended = false, url }: LaunchOptions = {}
  ): Promise<unknown> {
    return this.invoke('com.apple.coredevice.feature.launchapplication', {
      applicationSpecifier: { bundleIdentifier: { _0: bundleId } },
      options: {
        arguments: args,
        environmentVariables: env,
        standardIOUsesPseudoterminals: true,
        startStopped: startSuspended,
        terminateExisting: killExisting,
        user: { shortName: 'mobile' },
        platformSpecificOptions: Buffer.from(plist.build({})),
        // CoreDevice's LaunchOptions.payloadURL: a Foundation URL, which Codable encodes as
        // `{ relative, base? }` (found by reversing CoreDeviceUtilities' encode(to:)).
        ...(url ? { payloadURL: { relative: url } } : {}),
      },
      standardIOIdentifiers: {},
    });
  }
}
