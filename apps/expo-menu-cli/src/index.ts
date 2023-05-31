import { Command } from "commander";

import { downloadBuild } from "./commands/DownloadBuild";
import { listDevicesAsync } from "./commands/ListDevices";
import { bootDeviceAsync } from "./commands/BootDevice";
import { returnLoggerMiddleware } from "./utils";

const program = new Command();

program
  .name("expo-menu-cli")
  .description("The command-line tool used internally by expo-menu-bar");

program
  .command("download-build")
  .argument("<string>", "Build URL")
  .action(returnLoggerMiddleware(downloadBuild));

program
  .command("list-devices")
  .option("-p, --platform <string>", "Selected platform", "all")
  .option("-od, --one-device", "Only the first available device")
  .action(returnLoggerMiddleware(listDevicesAsync));

program
  .command("boot-device")
  .requiredOption("-p, --platform <string>", "Selected platform")
  .requiredOption("--id  <string>", "UUID of the device")
  .action(returnLoggerMiddleware(bootDeviceAsync));

program.parse();
