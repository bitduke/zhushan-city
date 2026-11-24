import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../cloudfunctions/', import.meta.url));
const source = await readFile(join(root, '_shared', 'pgCompat.js'));
for (const entry of await readdir(root, { withFileTypes: true })) {
  if (!entry.isDirectory() || entry.name.startsWith('_') || entry.name === 'statSync') continue;
  const indexPath = join(root, entry.name, 'index.js');
  const index = await readFile(indexPath, 'utf8');
  if (!index.includes("require('./pgCompat')")) continue;
  await writeFile(join(root, entry.name, 'pgCompat.js'), source);
}
