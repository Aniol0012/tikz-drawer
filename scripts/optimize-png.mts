import { mkdir, stat } from 'node:fs/promises';
import { basename, dirname, extname, join, resolve } from 'node:path';
import sharp from 'sharp';

const DEFAULT_OUTPUT_DIR = 'public/optimized-images';

interface CliOptions {
  readonly inputs: readonly string[];
  readonly outputDir: string;
}

const parseArgs = (args: readonly string[]): CliOptions => {
  const inputs: string[] = [];
  let outputDir = DEFAULT_OUTPUT_DIR;

  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];
    if (value === '--out-dir') {
      const nextValue = args[index + 1];
      if (!nextValue) {
        throw new Error('Missing value for --out-dir.');
      }
      outputDir = nextValue;
      index += 1;
      continue;
    }

    inputs.push(value);
  }

  if (inputs.length === 0) {
    throw new Error('Usage: pnpm optimize:png <file.png> [...file.png] [--out-dir public/flags-optimized]');
  }

  return {
    inputs,
    outputDir
  };
};

const optimizedFilePath = (inputPath: string, outputDir: string): string => {
  const name = basename(inputPath, extname(inputPath));
  return join(outputDir, `${name}.webp`);
};

const formatBytes = (value: number): string => {
  if (value < 1024) {
    return `${value} B`;
  }

  return `${(value / 1024).toFixed(1)} KB`;
};

const optimizePng = async (input: string, outputDir: string): Promise<void> => {
  const inputPath = resolve(input);
  const outputPath = resolve(optimizedFilePath(inputPath, outputDir));
  const inputImage = sharp(inputPath);
  const inputMetadata = await inputImage.metadata();

  if (inputMetadata.format !== 'png') {
    throw new Error(`Only PNG files are supported: ${input}`);
  }

  await mkdir(dirname(outputPath), { recursive: true });
  await inputImage.webp({ effort: 6, lossless: true }).toFile(outputPath);

  const outputMetadata = await sharp(outputPath).metadata();
  if (inputMetadata.width !== outputMetadata.width || inputMetadata.height !== outputMetadata.height) {
    throw new Error(`Optimized image changed dimensions: ${input}`);
  }

  const [before, after] = await Promise.all([stat(inputPath), stat(outputPath)]);
  const reduction = before.size > 0 ? ((before.size - after.size) / before.size) * 100 : 0;
  console.log(`${input} -> ${outputPath} (${formatBytes(before.size)} to ${formatBytes(after.size)}, ${reduction.toFixed(1)}%)`);
};

const main = async (): Promise<void> => {
  const options = parseArgs(process.argv.slice(2));
  await Promise.all(options.inputs.map((input) => optimizePng(input, options.outputDir)));
};

await main();
