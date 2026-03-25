#!/usr/bin/env node

import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { createInterface } from 'readline';

import { ROOT, MENU_BAR_PKG, INFO_PLIST } from './constants.mjs';

function exec(cmd, opts = {}) {
  return execSync(cmd, { cwd: ROOT, encoding: 'utf8', ...opts }).trim();
}

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function getCurrentVersion() {
  const pkg = JSON.parse(readFileSync(MENU_BAR_PKG, 'utf8'));
  return pkg.version;
}

function getBuildNumber() {
  const plist = readFileSync(INFO_PLIST, 'utf8');
  const match = plist.match(/<key>CFBundleVersion<\/key>\s*<string>(\d+)<\/string>/);
  if (!match) {
    console.error('Could not read CFBundleVersion from Info.plist');
    process.exit(1);
  }
  return match[1];
}

async function main() {
  const version = getCurrentVersion();
  const buildNumber = getBuildNumber();
  const tag = `expo-orbit-v${version}`;

  console.log(`Updating release metadata for v${version} (build ${buildNumber})\n`);

  // Verify the GitHub Release exists and is published
  console.log('Checking GitHub Release...');
  try {
    const releaseInfo = exec(`gh release view ${tag} --json isDraft,isPrerelease`);
    const release = JSON.parse(releaseInfo);
    if (release.isDraft) {
      console.error(`Release ${tag} is still a draft. Publish it first.`);
      process.exit(1);
    }
  } catch {
    console.error(`Could not find GitHub Release for tag ${tag}.`);
    console.error('Make sure the release exists and you have gh CLI authenticated.');
    process.exit(1);
  }
  console.log('  Release is published.\n');

  // Run metadata update
  exec(
    `node scripts/update-release-metadata.mjs --version ${version} --build-number ${buildNumber}`
  );

  // Show diff
  console.log('Changes:');
  console.log(exec('git diff --stat'));
  console.log();

  const confirm = await ask('Commit and push these changes? (y/N): ');
  if (confirm.toLowerCase() !== 'y') {
    console.log('\nAborted. Reverting changes...');
    exec('git checkout -- appcast.xml electron-updates.json');
    process.exit(0);
  }

  // Stage and commit
  exec('git add appcast.xml electron-updates.json');
  exec(`git commit -m "[appcast] Bump version to ${version}"`);
  console.log(`\nCommitted: [appcast] Bump version to ${version}`);

  // Push
  console.log('Pushing to origin...');
  exec('git push origin main');
  console.log('Done!\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
