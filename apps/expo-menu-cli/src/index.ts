import { Command } from "commander";

import { downloadBuildAsync } from "./commands/DownloadBuild";
import { listDevicesAsync } from "./commands/ListDevices";
import { bootDeviceAsync } from "./commands/BootDevice";
import { installAndLaunchAppAsync } from "./commands/InstallAndLaunchApp";
import { launchSnackAsync } from "./commands/LaunchSnack";
import { checkToolsAsync } from "./commands/CheckTools";
import { returnLoggerMiddleware } from "./utils";

const program = new Command();

program
  .name("expo-menu-cli")
  .description("The command-line tool used internally by expo-menu-bar");

program
  .command("download-build")
  .argument("<string>", "Build URL")
  .action(returnLoggerMiddleware(downloadBuildAsync));

program
  .command("list-devices")
  .option("-p, --platform <string>", "Selected platform", "all")
  .option("-od, --one-device", "Only the first available device")
  .action(returnLoggerMiddleware(listDevicesAsync));

program
  .command("boot-device")
  .requiredOption("-p, --platform <string>", "Selected platform")
  .requiredOption("--id  <string>", "UDID or name of the device")
  .action(returnLoggerMiddleware(bootDeviceAsync));

program
  .command("install-and-launch")
  .requiredOption("--app-path  <string>", "Local path of the app")
  .requiredOption("--device-id  <string>", "UDID or name of the device")
  .action(returnLoggerMiddleware(installAndLaunchAppAsync));

program
  .command("launch-snack")
  .argument("<string>", "Snack URL")
  .option("-p, --platform <string>", "Selected platform")
  .option("--device-id  <string>", "UDID or name of the device")
  .action(returnLoggerMiddleware(launchSnackAsync));

program
  .command("check-tools")
  .option("-p, --platform <string>", "Selected platform")
  .action(returnLoggerMiddleware(checkToolsAsync));

program.parse();
