import { SimControl } from "xdl";

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

  // [TODO] - Copy openURLAsync and remove xdl dependency
  await SimControl.openURLAsync({
    url: snackURl,
    udid: deviceId,
  });
}
