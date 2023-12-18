import path from 'path';
import fs from 'fs-extra';
import { v4 as uuid } from 'uuid';
import { BuildStepInput, BuildStepInputValueTypeName } from '@expo/steps';
import spawnAsync from '@expo/spawn-async';

import { BuildStepContext } from '@expo/steps';

interface FunctionInputs {
  buildCredentials: BuildStepInput<BuildStepInputValueTypeName.JSON, true>;
}

const KEYCHAIN_NAME = 'orbit-keychain';
const KEYCHAIN_PASSWORD = 'orbit-keychain-password';

async function configureMacOSCredentials(
  ctx: BuildStepContext,
  {
    inputs,
  }: {
    inputs: FunctionInputs;
  }
): Promise<void> {
  try {
    // Download Apple Developer ID intermediate certificate
    await spawnAsync('curl', [
      'https://www.apple.com/certificateauthority/DeveloperIDG2CA.cer',
      '-o',
      'DeveloperIDG2CA.cer',
    ]);

    // Allow `security add-trusted-cert` command to run without password prompt
    await spawnAsync('sudo', [
      'security',
      'authorizationdb',
      'write',
      'com.apple.trust-settings.admin',
      'allow',
    ]);

    // Add DeveloperIDG2CA certificate to System keychain
    await spawnAsync('sudo', [
      'security',
      'add-trusted-cert',
      '-d',
      '-k',
      '/Library/Keychains/System.keychain',
      '-r',
      'trustRoot',
      'DeveloperIDG2CA.cer',
    ]);

    // Read distribution certificate from build credentials and write it to a file
    const rawCredentialsInput = inputs.buildCredentials.value as Record<string, any>;
    const target = Object.keys(rawCredentialsInput)[0];
    const certificate = rawCredentialsInput[target].distributionCertificate;
    const distCertPath = path.join(ctx.workingDirectory, `${uuid()}.p12`);
    ctx.logger.info(`Writing distribution certificate to ${distCertPath}`);
    await fs.writeFile(distCertPath, Buffer.from(certificate.dataBase64, 'base64'));

    // Create a new keychain
    await spawnAsync('security', ['create-keychain', '-p', KEYCHAIN_PASSWORD, KEYCHAIN_NAME]);

    // Add new keychain to search list
    const keychainsListResult = await spawnAsync('security', ['list-keychains']);
    await spawnAsync('security', [
      'list-keychains',
      '-s',
      KEYCHAIN_NAME,
      ...keychainsListResult.output,
    ]);

    // Import the distribution certificate into the new keychain
    await spawnAsync('security', [
      'import',
      distCertPath,
      '-P',
      certificate.password,
      '-k',
      KEYCHAIN_NAME,
      '-T',
      '/usr/bin/codesign',
    ]);

    // Set a partition list to avoid interactive prompts
    await spawnAsync('security', [
      'set-key-partition-list',
      '-S',
      'apple-tool:,apple:',
      '-s',
      '-k',
      KEYCHAIN_PASSWORD,
      KEYCHAIN_NAME,
    ]);

    // List all available identities
    let result = await spawnAsync('security', ['find-identity']);
    ctx.logger.info(`Identities: ${result.output}`);

    // Unlock the keychain so we don't get prompted for the password
    await spawnAsync('security', ['unlock-keychain', '-p', KEYCHAIN_PASSWORD, KEYCHAIN_NAME]);

    // Set the keychain timeout to infinity
    await spawnAsync('security', ['set-keychain-settings', KEYCHAIN_NAME]);
  } catch (error) {
    ctx.logger.error(`ERROR: ${error}`);
    throw error;
  }
}

export default configureMacOSCredentials;
