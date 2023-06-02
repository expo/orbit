import { SimControl } from "xdl";
import { listDevicesAsync } from "./ListDevices";
import { Platform } from "../utils";
import { bootDeviceAsync } from "./BootDevice";

type launchSnackAsyncOptions = {
  platform?: "android" | "ios";
  deviceId?: string;
};

export async function launchSnackAsync(
  snackURl: string,
  { platform, deviceId }: launchSnackAsyncOptions
) {
  if (platform === "android") {
    return;
  }

  const response = await listDevicesAsync({
    platform: Platform.Ios,
    oneDevice: true,
  });
  if (!response.length) {
    return;
  }

  const [device] = response;
  if (device.state !== "Booted") {
    await bootDeviceAsync({ platform: Platform.Ios, id: device.udid });
  }

  await SimControl.openURLAsync({
    url: snackURl,
    udid: device.udid,
  });
}
