#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';

import {
  CHANGELOG,
  APPCAST,
  ELECTRON_UPDATES,
  INFO_PLIST,
  GITHUB_REPO,
} from './constants.mjs';

function readFromPlist() {
  const plist = readFileSync(INFO_PLIST, 'utf8');
  const versionMatch = plist.match(
    /<key>CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/
  );
  const buildMatch = plist.match(
    /<key>CFBundleVersion<\/key>\s*<string>(\d+)<\/string>/
  );
  if (!versionMatch || !buildMatch) {
    console.error('Could not read version info from Info.plist');
    process.exit(1);
  }
  return { version: versionMatch[1], buildNumber: buildMatch[1] };
}

function parseArgs() {
  const args = process.argv.slice(2);
  const versionIdx = args.indexOf('--version');
  const buildIdx = args.indexOf('--build-number');

  const version = versionIdx !== -1 ? args[versionIdx + 1] : undefined;
  const buildNumber = buildIdx !== -1 ? args[buildIdx + 1] : undefined;

  if (version && buildNumber) {
    return { version, buildNumber };
  }

  // Fall back to reading from Info.plist
  const plistValues = readFromPlist();
  return {
    version: version || plistValues.version,
    buildNumber: buildNumber || plistValues.buildNumber,
  };
}

function extractReleaseNotes(version) {
  const content = readFileSync(CHANGELOG, 'utf8');

  // Find the section for this version
  const versionHeader = `## ${version}`;
  const startIdx = content.indexOf(versionHeader);
  if (startIdx === -1) {
    console.error(`Could not find "${versionHeader}" section in CHANGELOG.md`);
    process.exit(1);
  }

  // Find the end: next ## heading or end of file
  const afterHeader = startIdx + versionHeader.length;
  // Skip the rest of the header line (e.g., " — 2026-03-23")
  const headerLineEnd = content.indexOf('\n', afterHeader);
  const nextSection = content.indexOf('\n## ', headerLineEnd);

  const sectionContent =
    nextSection === -1
      ? content.slice(headerLineEnd + 1)
      : content.slice(headerLineEnd + 1, nextSection);

  return sectionContent;
}

function markdownToHtml(markdown) {
  const lines = markdown.split('\n');
  const htmlLines = [];
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('### ')) {
      if (inList) {
        htmlLines.push('      </ul>');
        inList = false;
      }
      const heading = trimmed.slice(4);
      const id = slugify(heading);
      htmlLines.push(`      <h3 id="${id}">${convertInlineMarkdown(heading)}</h3>`);
    } else if (trimmed.startsWith('- ')) {
      if (!inList) {
        htmlLines.push('      <ul>');
        inList = true;
      }
      const item = trimmed.slice(2);
      htmlLines.push(`        <li>${convertInlineMarkdown(item)}</li>`);
    }
    // Skip blank lines and other content
  }

  if (inList) {
    htmlLines.push('      </ul>');
  }

  return htmlLines.join('\n');
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove non-word chars (strips emojis)
    .replace(/\s+/g, '-') // Spaces to hyphens (leading space from emoji becomes leading dash)
    .replace(/-{2,}/g, '-'); // Collapse consecutive hyphens
}

function convertInlineMarkdown(text) {
  // Convert markdown links [text](url) to <a href="url">text</a>
  let result = text.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2">$1</a>'
  );
  // Convert inline code `text` to <code>text</code>
  result = result.replace(/`([^`]+)`/g, '<code>$1</code>');
  return result;
}

function updateAppcast(version, buildNumber, html) {
  let content = readFileSync(APPCAST, 'utf8');
  const today = new Date().toISOString().split('T')[0];
  const releaseTag = `expo-orbit-v${version}`;

  const newItem = `    <item>
      <title>${version}</title>
      <description>
      <![CDATA[
${html}
      ]]>
      </description>
      <pubDate>${today}</pubDate>
      <releaseNotesLink>${GITHUB_REPO}/releases/tag/${releaseTag}</releaseNotesLink>
      <sparkle:minimumSystemVersion>10.15</sparkle:minimumSystemVersion>
      <enclosure
        url="${GITHUB_REPO}/releases/download/${releaseTag}/expo-orbit.v${version}-macos.zip"
        sparkle:version="${buildNumber}"
        sparkle:shortVersionString="${version}"
        length="0"
        type="application/octet-stream"
      />
    </item>`;

  // Insert after <language>en</language>
  const insertPoint = content.indexOf('<language>en</language>');
  if (insertPoint === -1) {
    console.error('Could not find <language>en</language> in appcast.xml');
    process.exit(1);
  }
  const insertAfter = content.indexOf('\n', insertPoint) + 1;
  content = content.slice(0, insertAfter) + newItem + '\n' + content.slice(insertAfter);

  writeFileSync(APPCAST, content);
}

function updateElectronUpdates(version, html) {
  const content = JSON.parse(readFileSync(ELECTRON_UPDATES, 'utf8'));
  const today = new Date().toISOString().split('T')[0];
  const releaseTag = `expo-orbit-v${version}`;
  const baseUrl = `${GITHUB_REPO}/releases/download/${releaseTag}`;

  // Convert multi-line HTML to the single-line format used in electron-updates.json
  const releaseNotes = html
    .split('\n')
    .map((line) => line)
    .join('\n');

  const newVersion = {
    version,
    pub_date: today,
    release_notes: releaseNotes,
    builds: {
      'win32-x64': {
        url: `${baseUrl}/`,
      },
      'linux-deb-x64': {
        url: `${baseUrl}/expo-orbit_${version}_amd64.deb`,
      },
      'linux-rpm-x64': {
        url: `${baseUrl}/expo-orbit-${version}-1.x86_64.rpm`,
      },
    },
  };

  content.versions.unshift(newVersion);
  writeFileSync(ELECTRON_UPDATES, JSON.stringify(content, null, 2) + '\n');
}

const { version, buildNumber } = parseArgs();

console.log(`Updating release metadata for v${version} (build ${buildNumber})...\n`);

const markdown = extractReleaseNotes(version);
const html = markdownToHtml(markdown);

if (!html.trim()) {
  console.error('No release notes content found for this version');
  process.exit(1);
}

updateAppcast(version, buildNumber, html);
console.log('  Updated appcast.xml');

updateElectronUpdates(version, html);
console.log('  Updated electron-updates.json');

console.log('\nDone!');
