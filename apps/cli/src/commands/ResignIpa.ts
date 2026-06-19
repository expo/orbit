import { resignIpaAsync } from 'apple-resign';

type ResignIpaOptions = {
  ipa: string;
  udid: string;
  deviceName: string;
  appleId: string;
  output?: string;
  stripExtensions?: boolean;
};

export async function resignIpaCommandAsync(options: ResignIpaOptions) {
  const result = await resignIpaAsync({
    ipaPath: options.ipa,
    deviceUdid: options.udid,
    deviceName: options.deviceName,
    appleId: options.appleId,
    outputIpaPath: options.output,
    stripExtensions: options.stripExtensions,
    onProgress: (step, detail) => {
      console.log(`step: ${step}${detail ? ` (${detail})` : ''}`);
    },
  });
  return {
    resignedIpaPath: result.resignedIpaPath,
    bundleId: result.bundleId,
    profileExpiresAt: result.profileExpiresAt.toISOString(),
    strippedEntitlements: result.strippedEntitlements,
  };
}
