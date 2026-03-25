#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';

import { MENU_BAR_PKG, ELECTRON_PKG, INFO_PLIST, CHANGELOG } from './constants.mjs';

function parseArgs() {
  const args = process.argv.slice(2);
  const idx = args.indexOf('--version');
  if (idx === -1 || !args[idx + 1]) {
    console.error('Usage: bump-version.mjs --version <X.Y.Z>');
    process.exit(1);
  }
  const version = args[idx + 1];
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    console.error(`Invalid semver version: ${version}`);
    process.exit(1);
  }
  return version;
}

function updatePackageJson(filePath, version) {
  const content = JSON.parse(readFileSync(filePath, 'utf8'));
  const oldVersion = content.version;
  content.version = version;
  writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n');
  return oldVersion;
}

function updateInfoPlist(filePath, version) {
  let content = readFileSync(filePath, 'utf8');

  // Update CFBundleShortVersionString
  content = content.replace(
    /(<key>CFBundleShortVersionString<\/key>\s*<string>)(.*?)(<\/string>)/,
    `$1${version}$3`
  );

  // Read and increment CFBundleVersion
  const buildMatch = content.match(
    /<key>CFBundleVersion<\/key>\s*<string>(\d+)<\/string>/
  );
  if (!buildMatch) {
    console.error('Could not find CFBundleVersion in Info.plist');
    process.exit(1);
  }
  const oldBuild = parseInt(buildMatch[1], 10);
  const newBuild = oldBuild + 1;

  content = content.replace(
    /(<key>CFBundleVersion<\/key>\s*<string>)\d+(<\/string>)/,
    `$1${newBuild}$2`
  );

  writeFileSync(filePath, content);
  return { oldBuild, newBuild };
}

function updateChangelog(filePath, version) {
  const content = readFileSync(filePath, 'utf8');
  const today = new Date().toISOString().split('T')[0];

  const unpublishedHeader = '## Unpublished';
  const unpublishedIdx = content.indexOf(unpublishedHeader);
  if (unpublishedIdx === -1) {
    console.error('Could not find "## Unpublished" section in CHANGELOG.md');
    process.exit(1);
  }

  // Find the next ## heading after Unpublished
  const afterUnpublished = content.indexOf('\n## ', unpublishedIdx + unpublishedHeader.length);
  const unpublishedContent =
    afterUnpublished === -1
      ? content.slice(unpublishedIdx + unpublishedHeader.length)
      : content.slice(unpublishedIdx + unpublishedHeader.length, afterUnpublished);
  const rest = afterUnpublished === -1 ? '' : content.slice(afterUnpublished);
  const before = content.slice(0, unpublishedIdx);

  // Strip empty category sections from the release content
  // A section is empty if it has a ### heading followed by either another ### heading, a ## heading, or EOF
  const strippedContent = stripEmptySections(unpublishedContent);

  if (!strippedContent.trim()) {
    console.error('No changes found in the Unpublished section of CHANGELOG.md');
    process.exit(1);
  }

  const freshUnpublished = `## Unpublished

### \u{1F6E0} Breaking changes

### \u{1F389} New features

### \u{1F41B} Bug fixes

### \u{1F4A1} Others
`;

  const newContent =
    before +
    freshUnpublished +
    '\n' +
    `## ${version} \u{2014} ${today}` +
    strippedContent +
    rest;

  writeFileSync(filePath, newContent);
}

function stripEmptySections(text) {
  const lines = text.split('\n');
  const result = [];
  let i = 0;

  while (i < lines.length) {
    if (lines[i].startsWith('### ')) {
      // Look ahead to see if this section has content
      const sectionLines = [lines[i]];
      let j = i + 1;

      // Collect blank lines
      while (j < lines.length && lines[j].trim() === '') {
        sectionLines.push(lines[j]);
        j++;
      }

      // Check if next non-blank line is another heading or end of content
      if (j >= lines.length || lines[j].startsWith('### ') || lines[j].startsWith('## ')) {
        // Empty section, skip it
        i = j;
      } else {
        // Section has content, keep it
        result.push(...sectionLines);
        i = j;
      }
    } else {
      result.push(lines[i]);
      i++;
    }
  }

  return result.join('\n');
}

const version = parseArgs();

console.log(`Bumping version to ${version}...\n`);

const oldVersion = updatePackageJson(MENU_BAR_PKG, version);
updatePackageJson(ELECTRON_PKG, version);
console.log(`  package.json: ${oldVersion} -> ${version}`);

const { oldBuild, newBuild } = updateInfoPlist(INFO_PLIST, version);
console.log(`  Info.plist: ${oldVersion} (${oldBuild}) -> ${version} (${newBuild})`);

updateChangelog(CHANGELOG, version);
console.log(`  CHANGELOG.md: Unpublished -> ${version}`);

console.log(`\nBuild number: ${newBuild}`);
