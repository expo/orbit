import fs from "fs";
import path from "path";
import { AppleConnectedDevice } from "common-types/build/devices";
import debug from "debug";

import { ClientManager } from "./ClientManager";
import { XcodeDeveloperDiskImagePrerequisite } from "./XcodeDeveloperDiskImagePrerequisite";
import {
  IPLookupResult,
  OnInstallProgressCallback,
} from "./client/InstallationProxyClient";
import { LockdowndClient } from "./client/LockdowndClient";
import { UsbmuxdClient } from "./client/UsbmuxdClient";
import { AFC_STATUS, AFCError } from "./protocol/AFCProtocol";
import { delayAsync } from "../../../utils/delayAsync";
import { CommandError } from "../../../utils/errors";
import { parseBinaryPlistAsync } from "../../../utils/parseBinaryPlistAsync";
import { installExitHooks } from "../../../utils/exit";
import { xcrunAsync } from "../xcrun";

/** @returns a list of connected Apple devices. */
export async function getConnectedDevicesAsync(): Promise<
  AppleConnectedDevice[]
> {
  const client = new UsbmuxdClient(UsbmuxdClient.connectUsbmuxdSocket());
  const devices = await client.getDevices();
  client.socket.end();

  return Promise.all(
    devices.map(async (device): Promise<AppleConnectedDevice> => {
      const socket = await new UsbmuxdClient(
        UsbmuxdClient.connectUsbmuxdSocket()
      ).connect(device, 62078);
      const deviceValues = await new LockdowndClient(socket).getAllValues();
      socket.end();
      // TODO: Add support for osType (ipad, watchos, etc)
      return {
        name:
          deviceValues.DeviceName ??
          deviceValues.ProductType ??
          "unknown iOS device",
        model: deviceValues.ProductType,
        osVersion: deviceValues.ProductVersion,
        deviceType: "device",
        connectionType: device.Properties.ConnectionType,
        udid: device.Properties.SerialNumber,
        osType: "iOS",
      };
    })
  );
}

/** Install and run an Apple app binary on a connected Apple device. */
export async function runOnDevice({
  udid,
  appPath,
  bundleId,
  waitForApp,
  deltaPath,
  onProgress,
}: {
  /** Apple device UDID */
  udid: string;
  /** File path to the app binary (ipa) */
  appPath: string;
  /** Bundle identifier for the app at `appPath` */
  bundleId: string;
  /** Wait for the app to launch before returning */
  waitForApp: boolean;
  /** File path to the app deltas folder to use for faster subsequent installs */
  deltaPath: string;
  /** Callback to be called with progress updates */
  onProgress: OnInstallProgressCallback;
}) {
  const clientManager = await ClientManager.create(udid);

  try {
    await mountDeveloperDiskImage(clientManager);

    const packageName = path.basename(appPath);
    const destPackagePath = path.join("PublicStaging", packageName);

    await uploadApp(clientManager, {
      appBinaryPath: appPath,
      destinationPath: destPackagePath,
    });

    const installer = await clientManager.getInstallationProxyClient();
    await installer.installApp(
      destPackagePath,
      bundleId,
      {
        // https://github.com/ios-control/ios-deploy/blob/0f2ffb1e564aa67a2dfca7cdf13de47ce489d835/src/ios-deploy/ios-deploy.m#L2491-L2508
        ApplicationsType: "Any",

        CFBundleIdentifier: bundleId,
        CloseOnInvalidate: "1",
        InvalidateOnDetach: "1",
        IsUserInitiated: "1",
        // Disable checking for wifi devices, this is nominally faster.
        PreferWifi: "0",
        // Only info I could find on these:
        // https://github.com/wwxxyx/Quectel_BG96/blob/310876f90fc1093a59e45e381160eddcc31697d0/Apple_Homekit/homekit_certification_tools/ATS%206/ATS%206/ATS.app/Contents/Frameworks/CaptureKit.framework/Versions/A/Resources/MobileDevice/MobileInstallation.h#L112-L121
        PackageType: "Developer",
        ShadowParentKey: deltaPath,
        // SkipUninstall: '1'
      },
      onProgress
    );

    const {
      // TODO(EvanBacon): This can be undefined when querying App Clips.
      [bundleId]: appInfo,
    } = await installer.lookupApp([bundleId]);

    if (appInfo) {
      // launch fails with EBusy or ENotFound if you try to launch immediately after install
      await delayAsync(200);
      const debugServerClient = await launchApp(clientManager, {
        appInfo,
        bundleId,
        detach: !waitForApp,
      });
      if (waitForApp && debugServerClient) {
        installExitHooks(async () => {
          // causes continue() to return
          debugServerClient.halt();
          // give continue() time to return response
          await delayAsync(64);
        });

        console.log(`Waiting for app to close...\n`);
        const result = await debugServerClient.continue();
        // TODO: I have no idea what this packet means yet (successful close?)
        // if not a close (ie, most likely due to halt from onBeforeExit), then kill the app
        if (result !== "W00") {
          await debugServerClient.kill();
        }
      }
    } else {
      console.log(
        `App "${bundleId}" installed but couldn't be launched. Open on device manually.`
      );
    }
  } finally {
    clientManager.end();
  }
}

/** Mount the developer disk image for Xcode. */
async function mountDeveloperDiskImage(clientManager: ClientManager) {
  const imageMounter = await clientManager.getMobileImageMounterClient();
  // Check if already mounted. If not, mount.
  if (!(await imageMounter.lookupImage()).ImageSignature) {
    // verify DeveloperDiskImage exists (TODO: how does this work on Windows/Linux?)
    // TODO: if windows/linux, download?
    const version = await (
      await clientManager.getLockdowndClient()
    ).getValue("ProductVersion");
    const developerDiskImagePath =
      await XcodeDeveloperDiskImagePrerequisite.instance.assertAsync({
        version,
      });
    const developerDiskImageSig = fs.readFileSync(
      `${developerDiskImagePath}.signature`
    );
    await imageMounter.uploadImage(
      developerDiskImagePath,
      developerDiskImageSig
    );
    await imageMounter.mountImage(
      developerDiskImagePath,
      developerDiskImageSig
    );
  }
}

async function uploadApp(
  clientManager: ClientManager,
  {
    appBinaryPath,
    destinationPath,
  }: { appBinaryPath: string; destinationPath: string }
) {
  const afcClient = await clientManager.getAFCClient();
  try {
    await afcClient.getFileInfo("PublicStaging");
  } catch (err: any) {
    if (err instanceof AFCError && err.status === AFC_STATUS.OBJECT_NOT_FOUND) {
      await afcClient.makeDirectory("PublicStaging");
    } else {
      throw err;
    }
  }
  await afcClient.uploadDirectory(appBinaryPath, destinationPath);
}

async function launchAppWithUsbmux(
  clientManager: ClientManager,
  { appInfo, detach }: { appInfo: IPLookupResult[string]; detach?: boolean }
) {
  let tries = 0;
  while (tries < 3) {
    const debugServerClient = await clientManager.getDebugserverClient();
    await debugServerClient.setMaxPacketSize(1024);
    await debugServerClient.setWorkingDir(appInfo.Container);
    await debugServerClient.launchApp(appInfo.Path, appInfo.CFBundleExecutable);

    const result = await debugServerClient.checkLaunchSuccess();
    if (result === "OK") {
      if (detach) {
        // https://github.com/libimobiledevice/libimobiledevice/blob/25059d4c7d75e03aab516af2929d7c6e6d4c17de/tools/idevicedebug.c#L455-L464
        const res = await debugServerClient.sendCommand("D", []);
        console.log("Disconnect from debug server request:", res);
        if (res !== "OK") {
          console.warn(
            "Something went wrong while attempting to disconnect from iOS debug server, you may need to reopen the app manually."
          );
        }
      }

      return debugServerClient;
    } else if (result === "EBusy" || result === "ENotFound") {
      console.log(
        "Device busy or app not found, trying to launch again in .5s..."
      );
      tries++;
      debugServerClient.socket.end();
      await delayAsync(500);
    } else {
      throw new CommandError(`There was an error launching app: ${result}`);
    }
  }
  throw new CommandError("Unable to launch app, number of tries exceeded");
}

async function launchAppWithDeviceCtl(deviceId: string, bundleId: string) {
  await xcrunAsync([
    "devicectl",
    "device",
    "process",
    "launch",
    "--device",
    deviceId,
    bundleId,
  ]);
}

/**
 * iOS 17 introduces a new protocol called RemoteXPC.
 * This is not yet implemented, so we fallback to devicectl.
 *
 * @see https://github.com/doronz88/pymobiledevice3/blob/master/misc/RemoteXPC.md#process-remoted
 */
async function launchApp(
  clientManager: ClientManager,
  {
    bundleId,
    appInfo,
    detach,
  }: { bundleId: string; appInfo: IPLookupResult[string]; detach?: boolean }
) {
  try {
    return await launchAppWithUsbmux(clientManager, { appInfo, detach });
  } catch (error) {
    debug(
      `Failed to launch app with Usbmuxd, falling back to xcrun... ${error}`
    );

    // Get the device UDID and close the connection, to allow `xcrun devicectl` to connect
    const deviceId = clientManager.device.Properties.SerialNumber;
    clientManager.end();

    // Fallback to devicectl for iOS 17 support
    return await launchAppWithDeviceCtl(deviceId, bundleId);
  }
}

export async function getBundleIdentifierForBinaryAsync(
  binaryPath: string
): Promise<string> {
  const builtInfoPlistPath = path.join(binaryPath, "Info.plist");
  const { CFBundleIdentifier } =
    await parseBinaryPlistAsync(builtInfoPlistPath);
  return CFBundleIdentifier;
}
