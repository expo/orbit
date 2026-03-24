#!/usr/bin/env node

import { readFileSync } from 'fs';
import { execSync } from 'child_process';
import { createInterface } from 'readline';

import { ROOT, MENU_BAR_PKG, CHANGELOG } from './constants.mjs';

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

function incrementVersion(current, bump) {
  const [major, minor, patch] = current.split('.').map(Number);
  switch (bump) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      return null;
  }
}

function validatePreconditions() {
  const errors = [];

  // Check branch
  const branch = exec('git rev-parse --abbrev-ref HEAD');
  if (branch !== 'main') {
    errors.push(`Must be on 'main' branch (currently on '${branch}')`);
  }

  // Check clean working tree
  const status = exec('git status --porcelain');
  if (status) {
    errors.push('Working tree is not clean. Commit or stash your changes first.');
  }

  // Check up to date with remote
  try {
    exec('git fetch origin main');
    const local = exec('git rev-parse HEAD');
    const remote = exec('git rev-parse origin/main');
    if (local !== remote) {
      errors.push('Local branch is not up to date with origin/main. Pull or push first.');
    }
  } catch {
    errors.push('Could not fetch from origin. Check your network connection.');
  }

  // Check changelog has content
  const changelog = readFileSync(CHANGELOG, 'utf8');
  const unpublishedIdx = changelog.indexOf('## Unpublished');
  if (unpublishedIdx === -1) {
    errors.push('Could not find "## Unpublished" section in CHANGELOG.md');
  } else {
    const nextSection = changelog.indexOf('\n## ', unpublishedIdx + '## Unpublished'.length);
    const unpublishedContent =
      nextSection === -1
        ? changelog.slice(unpublishedIdx + '## Unpublished'.length)
        : changelog.slice(unpublishedIdx + '## Unpublished'.length, nextSection);
    const hasBullets = unpublishedContent.includes('\n- ');
    if (!hasBullets) {
      errors.push('No changes found in the Unpublished section of CHANGELOG.md');
    }
  }

  return errors;
}

async function main() {
  console.log('Expo Orbit Release\n');

  const currentVersion = getCurrentVersion();
  console.log(`Current version: ${currentVersion}\n`);

  // Prompt for version
  const input = await ask('New version (X.Y.Z, or patch/minor/major): ');
  let newVersion = incrementVersion(currentVersion, input) || input;

  if (!/^\d+\.\d+\.\d+$/.test(newVersion)) {
    console.error(`Invalid version: ${newVersion}`);
    process.exit(1);
  }

  console.log(`\nWill release: ${currentVersion} -> ${newVersion}\n`);

  // Validate preconditions
  console.log('Checking preconditions...');
  const errors = validatePreconditions();
  if (errors.length > 0) {
    console.error('\nPrecondition checks failed:');
    for (const err of errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }
  console.log('  All checks passed.\n');

  // Check tag doesn't already exist
  const tag = `expo-orbit-v${newVersion}`;
  try {
    exec(`git rev-parse ${tag}`);
    console.error(`Tag ${tag} already exists.`);
    process.exit(1);
  } catch {
    // Tag doesn't exist, good
  }

  // Bump version
  console.log('Bumping versions...');
  const bumpOutput = exec(`node scripts/bump-version.mjs --version ${newVersion}`);
  console.log(bumpOutput);

  // Show diff
  console.log('\nChanges:');
  console.log(exec('git diff --stat'));
  console.log();

  const confirm = await ask('Proceed with commit, tag, and push? (y/N): ');
  if (confirm.toLowerCase() !== 'y') {
    console.log('\nAborted. Reverting changes...');
    exec('git checkout -- .');
    process.exit(0);
  }

  // Stage and commit
  const filesToStage = [
    'apps/menu-bar/package.json',
    'apps/menu-bar/electron/package.json',
    'apps/menu-bar/macos/ExpoMenuBar-macOS/Info.plist',
    'CHANGELOG.md',
  ];
  exec(`git add ${filesToStage.join(' ')}`);
  exec(`git commit -m "[menu-bar] Bump version to ${newVersion}"`);
  console.log(`\nCommitted: [menu-bar] Bump version to ${newVersion}`);

  // Tag
  exec(`git tag ${tag}`);
  console.log(`Tagged: ${tag}`);

  // Push
  console.log('\nPushing to origin...');
  exec('git push origin main');
  exec(`git push origin ${tag}`);
  console.log('Pushed branch and tag.\n');

  // Summary
  console.log('='.repeat(60));
  console.log('Release started successfully!\n');
  console.log('CI will now build Linux/Windows and create a draft GitHub Release.\n');
  console.log('Next steps:');
  console.log('  1. Build macOS locally:');
  console.log('     cd apps/menu-bar && yarn archive');
  console.log('     yarn export-local-archive');
  console.log('     yarn notarize');
  console.log('  2. Upload the macOS zip to the draft GitHub Release');
  console.log('  3. Publish the GitHub Release');
  console.log(`  4. Run: yarn release:metadata`);
  console.log('='.repeat(60));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
