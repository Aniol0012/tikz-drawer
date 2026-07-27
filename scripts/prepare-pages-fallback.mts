import { copyFile, stat } from 'node:fs/promises';
import path from 'node:path';

const outputDirectory = path.resolve('dist/tikz-drawer/browser');
const indexPath = path.join(outputDirectory, 'index.html');
const fallbackPath = path.join(outputDirectory, '404.html');

await stat(indexPath);
await copyFile(indexPath, fallbackPath);

console.log(`GitHub Pages fallback created: ${fallbackPath}`);
