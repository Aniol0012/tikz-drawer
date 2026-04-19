import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(scriptDir, '..');

const packageJsonPath = resolve(workspaceRoot, 'package.json');
const readmePath = resolve(workspaceRoot, 'README.md');

const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const readmeContent = readFileSync(readmePath, 'utf8');

function normalizeVersion(raw) {
  if (!raw) return '';
  return String(raw).trim().replace(/^[^\d]*/, '').split('||')[0].trim();
}

function extractPnpmVersion(packageManager) {
  if (!packageManager || !String(packageManager).startsWith('pnpm@')) {
    return '';
  }

  return normalizeVersion(String(packageManager).slice('pnpm@'.length));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const badgeVersions = [
  { label: 'Version', slug: 'version', version: normalizeVersion(packageJson.version) },
  {
    label: 'Angular',
    slug: 'Angular',
    version: normalizeVersion(packageJson.dependencies?.['@angular/core']),
  },
  {
    label: 'TypeScript',
    slug: 'TypeScript',
    version: normalizeVersion(packageJson.devDependencies?.typescript),
  },
  {
    label: 'RxJS',
    slug: 'RxJS',
    version: normalizeVersion(packageJson.dependencies?.rxjs),
  },
  {
    label: 'Vitest',
    slug: 'Vitest',
    version: normalizeVersion(packageJson.devDependencies?.vitest),
  },
  {
    label: 'Prettier',
    slug: 'Prettier',
    version: normalizeVersion(packageJson.devDependencies?.prettier),
  },
  { label: 'pnpm', slug: 'pnpm', version: extractPnpmVersion(packageJson.packageManager) },
];

let nextReadmeContent = readmeContent;

for (const badge of badgeVersions) {
  if (!badge.version) {
    throw new Error(`Could not resolve version for ${badge.label}.`);
  }

  const badgePattern = new RegExp(
    `(\\[!\\[${escapeRegExp(badge.label)}\\]\\(https:\\/\\/img\\.shields\\.io\\/badge\\/${escapeRegExp(badge.slug)}-)([^-\\)\\?]+)(-)`,
  );

  if (!badgePattern.test(nextReadmeContent)) {
    throw new Error(`Could not find ${badge.label} badge in README.md.`);
  }

  nextReadmeContent = nextReadmeContent.replace(badgePattern, `$1${badge.version}$3`);
}

if (nextReadmeContent !== readmeContent) {
  writeFileSync(readmePath, nextReadmeContent, 'utf8');
  console.log('Updated README badge versions from package.json.');
} else {
  console.log('README badge versions are already up to date.');
}

