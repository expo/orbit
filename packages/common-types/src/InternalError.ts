import { JSONObject } from '@expo/json-file';

const ERROR_PREFIX = 'Error: ';
export default class InternalError extends Error {
  override readonly name = 'InternalError';
  code: InternalErrorCode;
  details?: JSONObject;

  constructor(code: InternalErrorCode, message: string, details?: JSONObject) {
    super('');

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
  | 'APPLE_APP_VERIFICATION_FAILED'
  | 'APPLE_DEVICE_LOCKED'
  | 'EXPO_GO_NOT_INSTALLED_ON_DEVICE'
  | 'INVALID_VERSION'
  | 'MULTIPLE_APPS_IN_TARBALL'
  | 'TOOL_CHECK_FAILED'
  | 'XCODE_COMMAND_LINE_TOOLS_NOT_INSTALLED'
  | 'XCODE_LICENSE_NOT_ACCEPTED'
  | 'XCODE_NOT_INSTALLED'
  | 'SIMCTL_NOT_AVAILABLE'
  | 'NO_DEVELOPMENT_BUILDS_AVAILABLE'
  | 'UNAUTHORIZED_ACCOUNT'
  | 'UNTRUSTED_SOURCE';

export type MultipleAppsInTarballErrorDetails = {
  apps: {
    name: string;
    path: string;
  }[];
};
