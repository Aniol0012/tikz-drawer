import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const normalizeMarkdown = (value) =>
  String(value ?? '')
    .replaceAll('\r\n', '\n')
    .trim();

const requiredValue = (value, missingMessage) => {
  const normalized = normalizeMarkdown(value);
  if (!normalized) {
    throw new Error(missingMessage);
  }
  return normalized;
};

export const buildReleaseBody = ({ tag, releaseUrl, repositoryUrl, description, releaseNotes, previousTag = '', hasSnapshot = false }) => {
  const normalizedTag = requiredValue(tag, 'Release tag is required.');
  const normalizedReleaseUrl = requiredValue(releaseUrl, 'Release URL is required.');
  const normalizedRepositoryUrl = requiredValue(repositoryUrl, 'Repository URL is required.').replace(/\/+$/, '');
  const normalizedDescription = requiredValue(description, 'Release description is required.');
  const normalizedReleaseNotes = requiredValue(releaseNotes, 'Release notes are required.');
  const normalizedPreviousTag = normalizeMarkdown(previousTag);

  const sections = [`**Version:** [${normalizedTag}](${normalizedReleaseUrl})`, normalizedDescription];

  if (hasSnapshot) {
    sections.push(`### Snapshot\n\n![Editor light](${normalizedRepositoryUrl}/releases/download/${encodeURIComponent(normalizedTag)}/editor-light.png)`);
  }

  sections.push(normalizedReleaseNotes);

  if (normalizedPreviousTag) {
    const compareUrl = `${normalizedRepositoryUrl}/compare/${encodeURIComponent(normalizedPreviousTag)}...${encodeURIComponent(normalizedTag)}`;
    sections.push(`**Full Changelog**: ${compareUrl}`);
  }

  return `${sections.join('\n\n')}\n`;
};

export const writeReleaseBodyFromEnvironment = (environment = process.env) => {
  const outputPath = resolve(environment.RELEASE_BODY_PATH ?? '.artifacts/release/release-body.md');
  const snapshotPath = resolve(environment.RELEASE_SNAPSHOT_PATH ?? 'screenshots/editor-light.png');
  const body = buildReleaseBody({
    tag: environment.RELEASE_TAG,
    releaseUrl: environment.RELEASE_URL,
    repositoryUrl: environment.REPOSITORY_URL,
    description: environment.RELEASE_DESCRIPTION,
    releaseNotes: environment.RELEASE_NOTES,
    previousTag: environment.PREVIOUS_TAG,
    hasSnapshot: existsSync(snapshotPath)
  });

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, body, 'utf8');
  console.log(`Release body written to ${outputPath}.`);
};

const isDirectExecution = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (isDirectExecution) {
  try {
    writeReleaseBodyFromEnvironment();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
