#!/usr/bin/env tsx

/**
 * i18n validator for the editor locale dictionaries.
 *
 * - Always validates locale JSON files have the same keys as the base locale.
 * - Validates values are non-empty strings.
 * - Diff-checks new/modified literal translation usages in TS/HTML files when a diff is available.
 * - Use --all or --mode all to scan every TS/HTML file instead of only diff lines.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const BASE_LOCALE = 'en';
const LOCALES_DIR = 'src/app/features/editor/i18n';
const CODE_EXTENSIONS = new Set(['.html', '.ts']);

type LocaleCode = string;
type FlatDictionary = Map<string, unknown>;
type ValidationMode = 'diff' | 'all';

interface LocaleLoadSuccess {
  readonly dictionary: unknown;
  readonly error?: never;
}

interface LocaleLoadFailure {
  readonly dictionary?: never;
  readonly error: string;
}

type LocaleLoadResult = LocaleLoadSuccess | LocaleLoadFailure;

interface LocaleFailure {
  readonly locale: LocaleCode;
  readonly missing: readonly string[];
  readonly extra: readonly string[];
  readonly empty: readonly string[];
}

interface MissingUsageKey {
  readonly key: string;
  readonly locales: readonly LocaleCode[];
}

interface CliOptions {
  readonly mode: ValidationMode;
}

interface GitHubEventPayload {
  readonly before?: string;
  readonly after?: string;
  readonly pull_request?: {
    readonly base?: {
      readonly sha?: string;
    };
    readonly head?: {
      readonly sha?: string;
    };
  };
}

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const localesPath = path.join(rootDir, LOCALES_DIR);

function compareAlphabetically(left: string, right: string): number {
  return left.localeCompare(right);
}

function parseCliOptions(argv: readonly string[]): CliOptions {
  let mode: ValidationMode = 'diff';

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--all') {
      mode = 'all';
      continue;
    }

    if (argument === '--mode') {
      const value = argv[index + 1];
      if (value !== 'all' && value !== 'diff') {
        console.error('[ERROR] --mode must be either "diff" or "all"');
        process.exit(1);
      }
      mode = value;
      index += 1;
      continue;
    }

    if (argument.startsWith('--mode=')) {
      const value = argument.slice('--mode='.length);
      if (value !== 'all' && value !== 'diff') {
        console.error('[ERROR] --mode must be either "diff" or "all"');
        process.exit(1);
      }
      mode = value;
      continue;
    }

    if (argument === '--help' || argument === '-h') {
      console.log('Usage: pnpm validate:i18n [--all|--mode all|--mode diff]');
      process.exit(0);
    }

    console.error(`[ERROR] Unknown option: ${argument}`);
    process.exit(1);
  }

  return { mode };
}

function runGit(args: readonly string[]): string | null {
  try {
    return execFileSync('git', [...args], {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    });
  } catch {
    return null;
  }
}

function readGitHubEventPayload(): GitHubEventPayload | null {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(eventPath, 'utf8')) as GitHubEventPayload;
  } catch {
    return null;
  }
}

function isUsableSha(value: string | undefined): value is string {
  return Boolean(value && !/^0+$/.test(value));
}

function gitHubDiffCandidates(): readonly (readonly string[])[] {
  const event = readGitHubEventPayload();
  const candidates: (readonly string[])[] = [];

  const pullRequestBase = event?.pull_request?.base?.sha;
  const pullRequestHead = event?.pull_request?.head?.sha;
  if (isUsableSha(pullRequestBase) && isUsableSha(pullRequestHead)) {
    candidates.push(['diff', `${pullRequestBase}...${pullRequestHead}`]);
  }

  if (isUsableSha(event?.before) && isUsableSha(event?.after)) {
    candidates.push(['diff', `${event.before}...${event.after}`]);
  }

  if (process.env.GITHUB_BASE_REF) {
    candidates.push(['diff', `origin/${process.env.GITHUB_BASE_REF}...HEAD`]);
  }

  return candidates;
}

function getDiff(): string {
  const headParentExists = runGit(['rev-parse', '--verify', 'HEAD^']) !== null;
  const candidates: (readonly string[])[] = [
    ['diff', '--cached'],
    ...gitHubDiffCandidates(),
    ...(headParentExists ? ([['diff', 'HEAD^', 'HEAD']] as const) : []),
    ['diff']
  ];

  for (const args of candidates) {
    const diff = runGit(args);
    if (diff?.trim()) {
      return diff;
    }
  }

  return '';
}

function localeCodeFromFile(fileName: string): LocaleCode {
  return path.basename(fileName, '.json');
}

function listLocales(): readonly LocaleCode[] {
  if (!fs.existsSync(localesPath)) {
    console.error(`[ERROR] Locale directory not found: ${LOCALES_DIR}`);
    process.exit(1);
  }

  const locales = fs
    .readdirSync(localesPath)
    .filter((fileName) => fileName.endsWith('.json'))
    .map(localeCodeFromFile)
    .sort((a, b) => (a === BASE_LOCALE ? -1 : b === BASE_LOCALE ? 1 : a.localeCompare(b)));

  if (!locales.includes(BASE_LOCALE)) {
    console.error(`[ERROR] Base locale missing: ${BASE_LOCALE}.json`);
    process.exit(1);
  }

  return locales;
}

function duplicateKeys(raw: string): readonly string[] {
  const keys = new Set<string>();
  const duplicates = new Set<string>();
  const keyPattern = /"((?:\\.|[^"\\])*)"\s*:/g;

  for (const match of raw.matchAll(keyPattern)) {
    const key = JSON.parse(`"${match[1]}"`) as string;
    if (keys.has(key)) {
      duplicates.add(key);
    }
    keys.add(key);
  }

  return [...duplicates].sort(compareAlphabetically);
}

function loadLocale(locale: LocaleCode): LocaleLoadResult {
  const file = path.join(localesPath, `${locale}.json`);
  const raw = fs.readFileSync(file, 'utf8');
  const duplicates = duplicateKeys(raw);

  if (duplicates.length) {
    return {
      error: `duplicate key(s): ${duplicates.join(', ')}`
    };
  }

  try {
    return {
      dictionary: JSON.parse(raw) as unknown
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'invalid JSON'
    };
  }
}

function flattenKeys(value: unknown, prefix = ''): FlatDictionary {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return new Map([[prefix, value]]);
  }

  const entries: FlatDictionary = new Map();
  for (const [key, nestedValue] of Object.entries(value)) {
    if (key.includes('.')) {
      entries.set(key, nestedValue);
      continue;
    }

    const nestedPrefix = prefix ? `${prefix}.${key}` : key;
    for (const [nestedKey, leafValue] of flattenKeys(nestedValue, nestedPrefix)) {
      entries.set(nestedKey, leafValue);
    }
  }
  return entries;
}

function isTranslatableValue(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function isStaticTranslationKey(key: string): boolean {
  return !key.includes('${');
}

function collectAddedCodeLines(diff: string): readonly string[] {
  const addedCodeLines: string[] = [];
  let currentFile: string | null = null;

  for (const line of diff.split('\n')) {
    const fileMatch = line.match(/^\+\+\+ b\/(.+)/);
    if (fileMatch) {
      currentFile = fileMatch[1];
      continue;
    }

    if (!line.startsWith('+') || line.startsWith('+++')) {
      continue;
    }

    if (currentFile && CODE_EXTENSIONS.has(path.extname(currentFile))) {
      addedCodeLines.push(line.slice(1));
    }
  }

  return addedCodeLines;
}

function listCodeFiles(directory: string): readonly string[] {
  const files: string[] = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listCodeFiles(entryPath));
      continue;
    }

    if (entry.isFile() && CODE_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(entryPath);
    }
  }

  return files;
}

function collectAllCodeLines(): readonly string[] {
  const sourcePath = path.join(rootDir, 'src');
  if (!fs.existsSync(sourcePath)) {
    return [];
  }

  return listCodeFiles(sourcePath).flatMap((file) => fs.readFileSync(file, 'utf8').split('\n'));
}

function collectTranslationKeys(lines: readonly string[]): ReadonlySet<string> {
  const usagePatterns = [
    /\bt\s*\(\s*['"`]([^'"`]+)['"`]\s*[,)]/g,
    /\btOrFallback\s*\(\s*['"`]([^'"`]+)['"`]\s*,/g,
    /\btranslations\s*\[[^\]]+\]\s*\[\s*['"`]([^'"`]+)['"`]\s*\]/g
  ] as const;
  const codeKeys = new Set<string>();

  for (const line of lines) {
    for (const pattern of usagePatterns) {
      for (const match of line.matchAll(pattern)) {
        const key = match[1].trim();
        if (key && isStaticTranslationKey(key)) {
          codeKeys.add(key);
        }
      }
    }
  }

  return codeKeys;
}

function buildReport(localeFailures: readonly LocaleFailure[], missingUsageKeys: readonly MissingUsageKey[]): string {
  let report = '### i18n Translation Validation Failed\n\n';

  if (localeFailures.length) {
    report += '#### Locale dictionary issues\n\n';
    for (const failure of localeFailures) {
      report += `- \`${failure.locale}\`: ${failure.missing.length} missing, ${failure.extra.length} extra, ${failure.empty.length} empty/non-string\n`;
    }
  }

  if (missingUsageKeys.length) {
    report += '\n#### Missing keys introduced by this diff\n\n';
    missingUsageKeys.forEach(({ key, locales }, index) => {
      report += `${index + 1}. \`${key}\` missing in ${locales.join(', ')}\n`;
    });
  }

  return report;
}

const localeCodes = listLocales();
const options = parseCliOptions(process.argv.slice(2));
const localeMaps = new Map<LocaleCode, FlatDictionary>();
const localeLoadErrors: string[] = [];

for (const locale of localeCodes) {
  const result = loadLocale(locale);
  if (result.error) {
    localeLoadErrors.push(`${locale}.json: ${result.error}`);
    continue;
  }
  localeMaps.set(locale, flattenKeys(result.dictionary));
}

if (localeLoadErrors.length) {
  console.error('\n[ERROR] Locale loading failed:');
  localeLoadErrors.forEach((error) => console.error(`  - ${error}`));
  process.exit(1);
}

const baseMap = localeMaps.get(BASE_LOCALE);
if (!baseMap) {
  console.error(`[ERROR] ${BASE_LOCALE}.json missing or invalid`);
  process.exit(1);
}

const baseKeys = [...baseMap.keys()].sort(compareAlphabetically);
const localeFailures: LocaleFailure[] = [];

for (const locale of localeCodes) {
  const map = localeMaps.get(locale);
  if (!map) {
    localeFailures.push({ locale, missing: baseKeys, extra: [], empty: [] });
    continue;
  }

  const keys = [...map.keys()].sort(compareAlphabetically);
  const missing = baseKeys.filter((key) => !map.has(key));
  const extra = locale === BASE_LOCALE ? [] : keys.filter((key) => !baseMap.has(key));
  const empty = keys.filter((key) => !isTranslatableValue(map.get(key)));

  if (missing.length || extra.length || empty.length) {
    localeFailures.push({ locale, missing, extra, empty });
  }
}

const codeLines = options.mode === 'all' ? collectAllCodeLines() : collectAddedCodeLines(getDiff());
const codeKeys = collectTranslationKeys(codeLines);
const missingUsageKeys: MissingUsageKey[] = [...codeKeys]
  .sort(compareAlphabetically)
  .map((key) => ({
    key,
    locales: localeCodes.filter((locale) => !localeMaps.get(locale)?.has(key))
  }))
  .filter((entry) => entry.locales.length);

console.log(`[INFO] Loaded locales: ${localeCodes.join(', ')}`);
console.log(`[INFO] Base locale keys: ${baseKeys.length}`);
console.log(`[INFO] Validation mode: ${options.mode}`);
console.log(
  `[INFO] Analyzing ${codeLines.length} ${options.mode === 'all' ? 'TS/HTML line(s)' : 'added TS/HTML line(s)'}`
);
console.log(
  `[INFO] Found ${codeKeys.size} literal i18n key usage(s) in ${options.mode === 'all' ? 'all code' : 'added code'}`
);

if (!localeFailures.length && !missingUsageKeys.length) {
  console.log('[SUCCESS] i18n validation passed');
  process.exit(0);
}

console.error('\n' + '='.repeat(50));
console.error('i18n Translation Validation Failed');
console.error('='.repeat(50));

if (localeFailures.length) {
  console.error('\nLocale dictionary issues:\n');
  for (const failure of localeFailures) {
    console.error(`  ${failure.locale}:`);
    if (failure.missing.length) {
      console.error(`    Missing from ${failure.locale}.json (${failure.missing.length}):`);
      failure.missing.forEach((key) => console.error(`      - ${key}`));
    }
    if (failure.extra.length) {
      console.error(`    Extra compared to ${BASE_LOCALE}.json (${failure.extra.length}):`);
      failure.extra.forEach((key) => console.error(`      - ${key}`));
    }
    if (failure.empty.length) {
      console.error(`    Empty/non-string value(s) (${failure.empty.length}):`);
      failure.empty.forEach((key) => console.error(`      - ${key}`));
    }
  }
}

if (missingUsageKeys.length) {
  console.error('\nMissing key usages introduced by this diff:\n');
  for (const { key, locales } of missingUsageKeys) {
    console.error(`  - ${key} missing in: ${locales.join(', ')}`);
  }
}

if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `report<<EOF\n${buildReport(localeFailures, missingUsageKeys)}\nEOF\n`);
}

process.exit(1);
