import { mkdir, access } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import path from 'node:path';

const BASE = 'https://storage.googleapis.com/tfjs-models/savedmodel/ssdlite_mobilenet_v2';
const DEST = path.join(process.cwd(), 'client/public/models/ssdlite_mobilenet_v2');
const FILES = [
  'model.json',
  'group1-shard1of5',
  'group1-shard2of5',
  'group1-shard3of5',
  'group1-shard4of5',
  'group1-shard5of5',
];

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function download(name) {
  const target = path.join(DEST, name);
  if (await exists(target)) return;
  const res = await fetch(`${BASE}/${name}`);
  if (!res.ok || !res.body) {
    throw new Error(`Failed to download ${name}: ${res.status}`);
  }
  await pipeline(Readable.fromWeb(res.body), createWriteStream(target));
}

await mkdir(DEST, { recursive: true });
for (const file of FILES) {
  await download(file);
}
console.log(`[vision] COCO-SSD weights ready in ${DEST}`);
