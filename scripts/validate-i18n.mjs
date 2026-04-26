#!/usr/bin/env node

/**
 * i18n validator for the editor locale dictionaries.
 *
 * - Always validates locale JSON files have the same keys as the base locale.
 * - Validates values are non-empty strings.
 * - Diff-checks new/modified literal translation usages in TS/HTML files.
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const BASE_LOCALE = 'en';
const LOCALES_DIR = 'src/app/features/editor/i18n';
const CODE_EXTENSIONS = new Set(['.html', '.ts']);
const GIT_BIN = process.env.GIT_BIN || 'git';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const localesPath = path.join(rootDir, LOCALES_DIR);

function gitDiff(args) {
  try {
    return execFileSync(GIT_BIN, args, { cwd: rootDir, encoding: 'utf8' });
  } catch {
    return '';
  }
}

function getDiff() {
  if (process.env.GITHUB_BASE_REF) {
    return gitDiff(['diff', `origin/${process.env.GITHUB_BASE_REF}...HEAD`]);
  }

  return gitDiff(['diff', '--cached']) || gitDiff(['diff', 'HEAD~1...HEAD']) || gitDiff(['diff']) || '';
}

function localeCodeFromFile(fileName) {
  return path.basename(fileName, '.json');
}

function listLocales() {
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

function duplicateKeys(raw) {
  const keys = new Set();
  const duplicates = new Set();
  const keyPattern = /"((?:\\.|[^"\\])*)"\s*:/g;

  for (const match of raw.matchAll(keyPattern)) {
    const key = JSON.parse(`"${match[1]}"`);
    if (keys.has(key)) {
      duplicates.add(key);
    }
    keys.add(key);
  }

  return [...duplicates].sort();
}

function loadLocale(locale) {
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
      dictionary: JSON.parse(raw)
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'invalid JSON'
    };
  }
}

function flattenKeys(value, prefix = '') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return new Map([[prefix, value]]);
  }

  const entries = new Map();
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

function hasKey(flatDictionary, key) {
  return flatDictionary.has(key);
}

function isTranslatableValue(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

const localeCodes = listLocales();
const localeMaps = new Map();
const localeLoadErrors = [];

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
const baseKeys = [...baseMap.keys()].sort();
const localeFailures = [];

for (const locale of localeCodes) {
  const map = localeMaps.get(locale);
  const keys = [...map.keys()].sort();
  const missing = baseKeys.filter((key) => !map.has(key));
  const extra = locale === BASE_LOCALE ? [] : keys.filter((key) => !baseMap.has(key));
  const empty = keys.filter((key) => !isTranslatableValue(map.get(key)));

  if (missing.length || extra.length || empty.length) {
    localeFailures.push({ locale, missing, extra, empty });
  }
}

const diff = getDiff();
const addedCodeLines = [];
let currentFile = null;

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

const usagePatterns = [
  /\bt\s*\(\s*['"`]([^'"`]+)['"`]\s*[,)]/g,
  /\btOrFallback\s*\(\s*['"`]([^'"`]+)['"`]\s*,/g,
  /\btranslations\s*\[[^\]]+\]\s*\[\s*['"`]([^'"`]+)['"`]\s*\]/g
];

const codeKeys = new Set();

for (const line of addedCodeLines) {
  for (const pattern of usagePatterns) {
    for (const match of line.matchAll(pattern)) {
      const key = match[1].trim();
      if (key) {
        codeKeys.add(key);
      }
    }
  }
}

const missingUsageKeys = [...codeKeys]
  .sort()
  .map((key) => ({
    key,
    locales: localeCodes.filter((locale) => !hasKey(localeMaps.get(locale), key))
  }))
  .filter((entry) => entry.locales.length);

console.log(`[INFO] Loaded locales: ${localeCodes.join(', ')}`);
console.log(`[INFO] Base locale keys: ${baseKeys.length}`);
console.log(`[INFO] Analyzing ${addedCodeLines.length} added TS/HTML line(s)`);
console.log(`[INFO] Found ${codeKeys.size} literal i18n key usage(s) in added code`);

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

if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `report<<EOF\n${report}\nEOF\n`);
}

process.exit(1);
