// Ported from remote-device (MIT, https://github.com/expo/appdrop).
// CoreDevice services over RemoteXPC: device info, apps and processes.
// (Screen capture, HID input, pasteboard and hardware buttons are not ported.)
import crypto from 'crypto';

import { toXmlPlist } from './plist';
import { RemoteXpcConnection, RemoteXpcMessage } from './remotexpc';
import { RemoteServiceDiscovery } from './rsd';
import { XpcUuid, int64, uint64 } from './xpc';

export class CoreDeviceError extends Error {}

const CORE_DEVICE_VERSION = {
  components: [uint64(629), uint64(3)],
  originalComponentsCount: int64(2),
  stringValue: '629.3',
};
const STREAM_STATUS_KEY = 'CoreDevice.XPCMessageKey.sideChannelStatus';

/** XPC integers decode to a number when safe, a bigint otherwise. */
export type XpcInteger = number | bigint;

/** One installed app, as returned by listapps / streamapplist. */
export interface CoreDeviceAppInfo {
  bundleIdentifier: string;
  name?: string;
  version?: string;
  [key: string]: any;
}

/** One running process, as returned by listprocesses / streamprocesslist. */
export interface CoreDeviceProcessInfo {
  processIdentifier?: XpcInteger;
  executableURL?: { relative?: string; [key: string]: any };
  [key: string]: any;
}

/** Output of launchapplication (passed through as the device returned it). */
export type CoreDeviceLaunchResult = { [key: string]: any };

export interface ListAppsOptions {
  includeAppClips?: boolean;
  includeRemovableApps?: boolean;
  includeHiddenApps?: boolean;
  includeInternalApps?: boolean;
  includeDefaultApps?: boolean;
  requireContainerAccess?: boolean;
  includeAppGroupIdentifiers?: boolean;
  includeContainerPaths?: boolean;
}

export interface LaunchOptions {
  args?: string[];
  env?: Record<string, string>;
  killExisting?: boolean;
  startSuspended?: boolean;
  /** Handed to the app on launch, like `devicectl device process launch --payload-url`. */
  url?: string;
}

interface CoreDeviceServiceClass {
  TIMEOUT_MS?: number;
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
    const timeoutMs = (this.constructor as CoreDeviceServiceClass).TIMEOUT_MS;
    if (timeoutMs) this.connection.timeoutMs = timeoutMs;
    return this;
  }

  get connected(): boolean {
    return !!this.connection && !this.connection.closed;
  }

  close(): void {
    this.connection?.close();
    this.connection = null;
  }

  baseRequest(
    featureIdentifier: string | null,
    input: unknown,
    actionIdentifier?: string | null
  ): RemoteXpcMessage {
    const request: RemoteXpcMessage = {
      'CoreDevice.CoreDeviceDDIProtocolVersion': int64(2),
      'CoreDevice.coreDeviceVersion': CORE_DEVICE_VERSION,
      'CoreDevice.deviceIdentifier': crypto.randomUUID(),
      'CoreDevice.input': input,
      'CoreDevice.invocationIdentifier': crypto.randomUUID(),
    };
    if (featureIdentifier) {
      request['CoreDevice.featureIdentifier'] = featureIdentifier;
      request['CoreDevice.action'] = {};
    }
    if (actionIdentifier) request['CoreDevice.actionIdentifier'] = actionIdentifier;
    return request;
  }

  private async ensureConnection(): Promise<RemoteXpcConnection> {
    if (!this.connection) await this.connect();
    return this.connection!;
  }

  async invoke(
    featureIdentifier: string | null,
    input: unknown = {},
    actionIdentifier: string | null = null
  ): Promise<any> {
    if (featureIdentifier && !this.rsd.hasFeature(this.serviceName, featureIdentifier)) {
      throw new CoreDeviceError(`${this.serviceName} does not support ${featureIdentifier}`);
    }
    const connection = await this.ensureConnection();
    const response = await connection.sendReceive(
      this.baseRequest(featureIdentifier, input, actionIdentifier)
    );
    const output = response?.['CoreDevice.output'];
    if (output === undefined || output === null) {
      const error = response?.['CoreDevice.error'];
      const detail = describeError(error) || JSON.stringify(response).slice(0, 300);
      throw new CoreDeviceError(`${featureIdentifier || 'invoke'} failed: ${detail}`);
    }
    return output;
  }

  /** Streaming feature: collects every pushed element until finishStreaming. */
  async streamInvoke(featureIdentifier: string, input: unknown = {}): Promise<any[]> {
    if (!this.rsd.hasFeature(this.serviceName, featureIdentifier)) {
      throw new CoreDeviceError(`${this.serviceName} does not support ${featureIdentifier}`);
    }
    const connection = await this.ensureConnection();
    const request = this.baseRequest(featureIdentifier, {
      actualInput: input,
      streamProxy: { sideChannel: XpcUuid.random() },
    });
    return connection.exclusive(async () => {
      await connection.sendRequest(request, { wantingReply: true });
      const elements: any[] = [];
      for (;;) {
        const response = await connection.receiveResponse();
        const status = response?.[STREAM_STATUS_KEY];
        if (!status) {
          throw new CoreDeviceError(
            `${featureIdentifier} failed: ${JSON.stringify(response).slice(0, 300)}`
          );
        }
        if (status.receivedError) {
          throw new CoreDeviceError(
            `${featureIdentifier} failed: ${JSON.stringify(status.receivedError).slice(0, 300)}`
          );
        }
        if (status.finishStreaming !== undefined) return elements;
        for (const element of status.pushing?.elements || []) elements.push(element);
      }
    });
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

export class DeviceInfoService extends CoreDeviceService {
  static SERVICE = 'com.apple.coredevice.deviceinfo';

  constructor(rsd: RemoteServiceDiscovery) {
    super(rsd, DeviceInfoService.SERVICE);
  }

  getDeviceInfo(): Promise<any> {
    return this.invoke('com.apple.coredevice.feature.getdeviceinfo', {});
  }

  getDisplayInfo(): Promise<any> {
    return this.invoke('com.apple.coredevice.feature.getdisplayinfo', {});
  }

  getLockState(): Promise<any> {
    return this.invoke('com.apple.coredevice.feature.getlockstate', {});
  }

  queryMobileGestalt(keys: string[]): Promise<any> {
    return this.invoke('com.apple.coredevice.feature.querymobilegestalt', { keys });
  }
}

export class AppService extends CoreDeviceService {
  static SERVICE = 'com.apple.coredevice.appservice';

  constructor(rsd: RemoteServiceDiscovery) {
    super(rsd, AppService.SERVICE);
  }

  listApps(options: ListAppsOptions = {}): Promise<CoreDeviceAppInfo[]> {
    const input = {
      includeAppClips: true,
      includeRemovableApps: true,
      includeHiddenApps: true,
      includeInternalApps: true,
      includeDefaultApps: true,
      requireContainerAccess: false,
      includeAppGroupIdentifiers: false,
      includeContainerPaths: false,
      ...options,
    };
    const features = this.rsd.serviceFeatures(this.serviceName);
    if (features.has('com.apple.coredevice.feature.streamapplist')) {
      return this.streamInvoke('com.apple.coredevice.feature.streamapplist', input);
    }
    return this.invoke('com.apple.coredevice.feature.listapps', input);
  }

  launch(
    bundleId: string,
    { args = [], env = {}, killExisting = true, startSuspended = false, url }: LaunchOptions = {}
  ): Promise<CoreDeviceLaunchResult> {
    return this.invoke('com.apple.coredevice.feature.launchapplication', {
      applicationSpecifier: { bundleIdentifier: { _0: bundleId } },
      options: {
        arguments: args,
        environmentVariables: env,
        standardIOUsesPseudoterminals: true,
        startStopped: startSuspended,
        terminateExisting: killExisting,
        user: { shortName: 'mobile' },
        platformSpecificOptions: Buffer.from(toXmlPlist({})),
        // CoreDevice's LaunchOptions.payloadURL: a Foundation URL, which Codable encodes as
        // `{ relative, base? }` (found by reversing CoreDeviceUtilities' encode(to:)).
        ...(url ? { payloadURL: { relative: url } } : {}),
      },
      standardIOIdentifiers: {},
    });
  }

  async listProcesses(): Promise<CoreDeviceProcessInfo[]> {
    const features = this.rsd.serviceFeatures(this.serviceName);
    if (features.has('com.apple.coredevice.feature.streamprocesslist')) {
      return this.streamInvoke('com.apple.coredevice.feature.streamprocesslist');
    }
    return (await this.invoke('com.apple.coredevice.feature.listprocesses'))?.processTokens || [];
  }

  uninstall(bundleId: string): Promise<any> {
    return this.invoke('com.apple.coredevice.feature.uninstallapp', {
      bundleIdentifier: bundleId,
    });
  }

  signal(pid: number, signal = 9): Promise<any> {
    return this.invoke('com.apple.coredevice.feature.sendsignaltoprocess', {
      process: { processIdentifier: int64(pid) },
      signal: int64(signal),
    });
  }
}

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
