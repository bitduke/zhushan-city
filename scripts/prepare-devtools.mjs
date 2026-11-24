import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = path.resolve(projectRoot, 'dist', 'build', 'mp-weixin');
const sourceRoot = path.resolve(projectRoot, 'cloudfunctions');
const destination = path.resolve(outputRoot, 'cloudfunctions');
if (!destination.startsWith(outputRoot + path.sep)) throw new Error('Cloud function copy target escaped build output');
await fs.access(path.join(outputRoot, 'project.config.json'));
const realProject = await fs.realpath(projectRoot);
const realOutput = await fs.realpath(outputRoot);
if (!realOutput.startsWith(realProject + path.sep)) throw new Error('Build output points outside project');
try {
  const realDestination = await fs.realpath(destination);
  if (!realDestination.startsWith(realOutput + path.sep)) throw new Error('Cloud function target points outside build output');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

await fs.rm(destination, { recursive: true, force: true });
await fs.mkdir(destination, { recursive: true });
for (const entry of await fs.readdir(sourceRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const source = path.join(sourceRoot, entry.name);
  try { await fs.access(path.join(source, 'index.js')); }
  catch { continue; }
  await fs.cp(source, path.join(destination, entry.name), {
    recursive: true,
    filter: file => !file.split(path.sep).includes('node_modules')
  });
}

const configPath = path.join(outputRoot, 'project.config.json');
const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
config.cloudfunctionRoot = 'cloudfunctions/';
await fs.writeFile(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
console.log(`Prepared ${destination}`);
