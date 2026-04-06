import path from 'path';
import fs from 'fs-extra';
import { v4 as uuid } from 'uuid';
import spawnAsync from '@expo/spawn-async';

import { BuildStepContext } from '@expo/steps';

const KEYCHAIN_NAME = 'orbit-keychain';
const KEYCHAIN_PASSWORD = 'orbit-keychain-password';

async function configureMacOSCredentials(ctx: BuildStepContext): Promise<void> {
  try {
    // Download Apple Developer ID intermediate certificate
    ctx.logger.info('Downloading Apple Developer ID intermediate certificate...');
    await spawnAsync('curl', [
      'https://www.apple.com/certificateauthority/DeveloperIDG2CA.cer',
      '-o',
      'DeveloperIDG2CA.cer',
    ]);

    // Write distribution certificate from environment variable
    const distCertPath = path.join(ctx.workingDirectory, `${uuid()}.p12`);
    ctx.logger.info(`Writing distribution certificate to ${distCertPath}`);
    const distCertBuffer = Buffer.from(process.env.ORBIT_DIST_CERT_BASE64 ?? '', 'base64');
    fs.writeFileSync(distCertPath, new Uint8Array(distCertBuffer));
    const distCertPassword = process.env.ORBIT_DIST_CERT_PASSWORD ?? '';

    // Create a new keychain
    ctx.logger.info('Creating keychain...');
    await spawnAsync('security', ['create-keychain', '-p', KEYCHAIN_PASSWORD, KEYCHAIN_NAME]);

    // Add new keychain to search list
    ctx.logger.info('Adding keychain to search list...');
    const keychainsListResult = await spawnAsync('security', ['list-keychains']);
    const existingKeychains = keychainsListResult.stdout
      .split('\n')
      .map((line) => line.trim().replace(/^"|"$/g, ''))
      .filter(Boolean);
    ctx.logger.info(`Existing keychains: ${existingKeychains.join(', ')}`);
    await spawnAsync('security', ['list-keychains', '-s', KEYCHAIN_NAME, ...existingKeychains]);

    // Import Apple Developer ID intermediate certificate into the custom keychain
    ctx.logger.info('Importing Developer ID intermediate certificate...');
    await spawnAsync('security', [
      'import',
      'DeveloperIDG2CA.cer',
      '-k',
      KEYCHAIN_NAME,
      '-T',
      '/usr/bin/codesign',
    ]);

    // Import the distribution certificate into the new keychain
    ctx.logger.info('Importing distribution certificate...');
    const importArgs = ['import', distCertPath, '-k', KEYCHAIN_NAME, '-T', '/usr/bin/codesign'];
    if (distCertPassword) {
      importArgs.splice(2, 0, '-P', distCertPassword);
    }
    await spawnAsync('security', importArgs);

    // Set a partition list to avoid interactive prompts
    ctx.logger.info('Setting keychain partition list...');
    await spawnAsync('security', [
      'set-key-partition-list',
      '-S',
      'apple-tool:,apple:',
      '-s',
      '-k',
      KEYCHAIN_PASSWORD,
      KEYCHAIN_NAME,
    ]);

    // Set default keychain
    ctx.logger.info('Setting default keychain...');
    await spawnAsync('security', ['default-keychain', '-s', KEYCHAIN_NAME]);

    // Unlock the keychain
    ctx.logger.info('Unlocking keychain...');
    await spawnAsync('security', ['unlock-keychain', '-p', KEYCHAIN_PASSWORD, KEYCHAIN_NAME]);

    // Set the keychain timeout to infinity
    ctx.logger.info('Setting keychain timeout to infinity...');
    await spawnAsync('security', ['set-keychain-settings', KEYCHAIN_NAME]);

    // List all available identities
    ctx.logger.info('Listing available identities...');
    const result = await spawnAsync('security', ['find-identity', '-v']);
    ctx.logger.info(`Identities:\n${result.stdout}`);

    // Install provisioning profile
    ctx.logger.info('Creating Provisioning Profiles directory...');
    await spawnAsync('mkdir', ['-p', '/Users/expo/Library/MobileDevice/Provisioning Profiles/']);

    ctx.logger.info('Installing provisioning profile...');
    const fileBuffer = Buffer.from(process.env?.ORBIT_PROVISIONPROFILE_BASE64 ?? '', 'base64');
    const filePath = `./${process.env?.ORBIT_PROVISIONPROFILE_UUID}.provisionprofile`;
    fs.writeFileSync(filePath, fileBuffer);
    ctx.logger.info(`Provisioning profile written to: ${filePath}`);

    await spawnAsync('cp', [
      `./${process.env?.ORBIT_PROVISIONPROFILE_UUID}.provisionprofile`,
      `/Users/expo/Library/MobileDevice/Provisioning Profiles/${process.env?.ORBIT_PROVISIONPROFILE_UUID}.provisionprofile`,
    ]);
    ctx.logger.info('Provisioning profile installed successfully.');
  } catch (error) {
    ctx.logger.error(`ERROR: ${error}`);
    throw error;
  }
}

export default configureMacOSCredentials;
