import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';

const rootDir = process.cwd();
const publicDir = path.join(rootDir, 'public');
const outputZip = path.join(publicDir, 'amit-crm-source.zip');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const zip = new JSZip();

const IGNORED_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  '.playwright-cli',
  '.aistudio',
  'coverage',
  '.cache',
]);

const IGNORED_FILES = new Set([
  'amit-crm-source.zip',
  '.env',
  '.DS_Store',
]);

function addDirectoryToZip(currentDir, relativePath = '') {
  const items = fs.readdirSync(currentDir);

  for (const item of items) {
    if (IGNORED_DIRS.has(item) || IGNORED_FILES.has(item)) continue;
    if (item.endsWith('.log') || item.endsWith('.tmp')) continue;

    const fullPath = path.join(currentDir, item);
    const itemRelativePath = relativePath ? `${relativePath}/${item}` : item;
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      addDirectoryToZip(fullPath, itemRelativePath);
    } else if (stat.isFile()) {
      const content = fs.readFileSync(fullPath);
      zip.file(itemRelativePath, content);
    }
  }
}

console.log('Generating complete source ZIP archive...');
addDirectoryToZip(rootDir);

zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } })
  .then((buffer) => {
    fs.writeFileSync(outputZip, buffer);
    const sizeMb = (buffer.length / (1024 * 1024)).toFixed(2);
    console.log(`Successfully generated: ${outputZip} (${sizeMb} MB)`);
  })
  .catch((err) => {
    console.error('Failed to create ZIP:', err);
    process.exit(1);
  });
