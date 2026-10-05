import { InternalError } from 'common-types';

import { convertCliErrorMessageToError } from '../helpers';

const cliErrorJson = JSON.stringify({
  name: 'InternalError',
  code: 'APPLE_APP_VERIFICATION_FAILED',
  message: 'Failed to verify code signature of entangle',
  stack: 'InternalError: Failed to verify code signature of entangle\n    at installOnDeviceAsync',
});

describe(convertCliErrorMessageToError, () => {
  it('extracts the CLI error from the macOS native module message (expo-modules-core 58)', () => {
    const error = convertCliErrorMessageToError(
      `CLIOutputError: ${cliErrorJson} (at MenuBarModule.swift:144)`
    );
    expect(error).toBeInstanceOf(InternalError);
    expect((error as InternalError).code).toBe('APPLE_APP_VERIFICATION_FAILED');
    expect(error.message).toBe('Failed to verify code signature of entangle');
  });

  it('parses a raw JSON message (Electron)', () => {
    const error = convertCliErrorMessageToError(cliErrorJson);
    expect(error).toBeInstanceOf(InternalError);
    expect((error as InternalError).code).toBe('APPLE_APP_VERIFICATION_FAILED');
  });

  it('rebuilds a plain Error when the CLI threw a non-InternalError', () => {
    const error = convertCliErrorMessageToError(
      JSON.stringify({ name: 'Error', message: 'boom', stack: 'Error: boom' })
    );
    expect(error).not.toBeInstanceOf(InternalError);
    expect(error.message).toBe('boom');
  });

  it('falls back to the raw message when there is no JSON object', () => {
    expect(convertCliErrorMessageToError('Something broke').message).toBe('Something broke');
    expect(convertCliErrorMessageToError('Bad {not json} here').message).toBe(
      'Bad {not json} here'
    );
  });
});
