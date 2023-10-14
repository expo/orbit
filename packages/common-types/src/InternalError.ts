import { JSONValue } from "@expo/json-file";

const ERROR_PREFIX = "Error: ";
export default class InternalError extends Error {
  override readonly name = "InternalError";
  code: InternalErrorCode;
  details?: JSONValue;

  constructor(code: InternalErrorCode, message: string, details?: JSONValue) {
    super("");

    // If e.toString() was called to get `message` we don't want it to look
    // like "Error: Error:".
    if (message.startsWith(ERROR_PREFIX)) {
      message = message.substring(ERROR_PREFIX.length);
    }

    this.message = message;
    this.code = code;
    this.details = details;
  }
}

export type InternalErrorCode =
  | "APPLE_DEVICE_LOCKED"
  | "INVALID_VERSION"
  | "MULTIPLE_APPS_IN_TARBALL"
  | "XCODE_COMMAND_LINE_TOOLS_NOT_INSTALLED"
  | "XCODE_LICENSE_NOT_ACCEPTED"
  | "XCODE_NOT_INSTALLED"
  | "SIMCTL_NOT_AVAILABLE";

export type MultipleAppsInTarballErrorDetails = {
  apps: Array<{
    name: string;
    path: string;
  }>;
};
