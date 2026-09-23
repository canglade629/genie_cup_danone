import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-cpu';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import sharp from 'sharp';
import { classifyFacing, type Rgb } from './classify-facing';
import type { ShelfDetection } from '../routes/shelf/analyze-routes';
import { shelfZone } from './analyze-result';

const MAX_WIDTH = 640;
const RETAIL_CLASSES = new Set([
  'bottle',
  'cup',
  'bowl',
  'wine glass',
  'vase',
  'book',
  'cell phone',
  'remote',
  'tv',
  'laptop',
  'mouse',
  'keyboard',
  'orange',
  'banana',
  'apple',
  'sandwich',
  'donut',
  'cake',
  'potted plant',
  'clock',
  'teddy bear',
  'toothbrush',
]);

let modelPromise: Promise<cocoSsd.ObjectDetection> | null = null;

let fileFetchInstalled = false;

function installFileFetch() {
  if (fileFetchInstalled) return;
  fileFetchInstalled = true;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : typeof input === 'object' && input !== null && 'url' in input
            ? String((input as { url: string }).url)
            : String(input);
    if (url.startsWith('file://')) {
      const filePath = fileURLToPath(url);
      const body = await readFile(filePath);
      const contentType = filePath.endsWith('.json') ? 'application/json' : 'application/octet-stream';
      return new Response(body, { headers: { 'Content-Type': contentType } });
    }
    return originalFetch(input, init);
  }) as typeof fetch;
}

async function modelPath(): Promise<string | undefined> {
  const local = path.join(process.cwd(), 'server/vision/models/ssdlite_mobilenet_v2/model.json');
  try {
    await access(local);
    return pathToFileURL(local).href;
  } catch {
    return undefined;
  }
}

async function loadModel(): Promise<cocoSsd.ObjectDetection> {
  if (!modelPromise) {
    modelPromise = (async () => {
      installFileFetch();
      await tf.setBackend('cpu');
      await tf.ready();
      const modelUrl = await modelPath();
      return cocoSsd.load(modelUrl ? { base: 'lite_mobilenet_v2', modelUrl } : { base: 'lite_mobilenet_v2' });
    })().catch((err) => {
      modelPromise = null;
      throw err;
    });
  }
  return modelPromise;
}

export function decodeImagePayload(imageData: string): Buffer {
  const match = /^data:[^;]+;base64,(.+)$/.exec(imageData);
  if (match) return Buffer.from(match[1], 'base64');
  return Buffer.from(imageData, 'base64');
}

interface Raster {
  data: Buffer;
  width: number;
  height: number;
}

async function rasterize(buffer: Buffer): Promise<Raster> {
  const { data, info } = await sharp(buffer)
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

function meanColor(raster: Raster, x: number, y: number, w: number, h: number): Rgb {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(raster.width, Math.ceil(x + w));
  const y1 = Math.min(raster.height, Math.ceil(y + h));
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let py = y0; py < y1; py += 2) {
    for (let px = x0; px < x1; px += 2) {
      const i = (py * raster.width + px) * 3;
      r += raster.data[i];
      g += raster.data[i + 1];
      b += raster.data[i + 2];
      n += 1;
    }
  }
  if (n === 0) return { r: 0, g: 0, b: 0 };
  return { r: r / n, g: g / n, b: b / n };
}

function cellVariance(raster: Raster, x: number, y: number, w: number, h: number): number {
  const color = meanColor(raster, x, y, w, h);
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(raster.width, Math.ceil(x + w));
  const y1 = Math.min(raster.height, Math.ceil(y + h));
  let acc = 0;
  let n = 0;
  for (let py = y0; py < y1; py += 3) {
    for (let px = x0; px < x1; px += 3) {
      const i = (py * raster.width + px) * 3;
      const dr = raster.data[i] - color.r;
      const dg = raster.data[i + 1] - color.g;
      const db = raster.data[i + 2] - color.b;
      acc += dr * dr + dg * dg + db * db;
      n += 1;
    }
  }
  return n === 0 ? 0 : acc / n;
}

function iou(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
): number {
  const x0 = Math.max(a.x, b.x);
  const y0 = Math.max(a.y, b.y);
  const x1 = Math.min(a.x + a.w, b.x + b.w);
  const y1 = Math.min(a.y + a.h, b.y + b.h);
  const inter = Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
  const union = a.w * a.h + b.w * b.h - inter;
  return union <= 0 ? 0 : inter / union;
}

function toDetection(
  id: string,
  box: { x: number; y: number; w: number; h: number },
  raster: Raster,
  cocoClass?: string,
  score?: number
): ShelfDetection {
  const px = {
    x: box.x * raster.width,
    y: box.y * raster.height,
    w: box.w * raster.width,
    h: box.h * raster.height,
  };
  const facing = classifyFacing(meanColor(raster, px.x, px.y, px.w, px.h), cocoClass);
  return {
    id,
    ...facing,
    x: box.x,
    y: box.y,
    w: box.w,
    h: box.h,
    score,
    shelf_zone: shelfZone(box.y, box.h),
    margin_eur: facing.manufacturer === 'Empty' ? 0 : facing.manufacturer === 'Danone' ? 0.32 : 0.16,
  };
}

function gridProposals(raster: Raster, existing: ShelfDetection[]): ShelfDetection[] {
  const rows = 4;
  const cols = 5;
  const extras: ShelfDetection[] = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const box = { x: c / cols + 0.015, y: r / rows + 0.02, w: 1 / cols - 0.03, h: 1 / rows - 0.04 };
      if (existing.some((d) => iou(d, box) > 0.25)) continue;
      const variance = cellVariance(
        raster,
        box.x * raster.width,
        box.y * raster.height,
        box.w * raster.width,
        box.h * raster.height
      );
      const detection = toDetection(`grid-${r}-${c}`, box, raster, 'cup', 0.35);
      const empty = detection.manufacturer === 'Empty' || variance < 180;
      if (empty) {
        extras.push({
          ...detection,
          label: 'OOS void',
          manufacturer: 'Empty',
          brand: '—',
          margin_eur: 0,
          score: 0.4,
        });
        continue;
      }
      if (existing.length + extras.length < 8) extras.push(detection);
    }
  }
  return extras.slice(0, 12);
}

export async function detectShelf(image: Buffer): Promise<{ detections: ShelfDetection[]; usedModel: boolean }> {
  const raster = await rasterize(image);
  let usedModel = false;
  let cocoBoxes: cocoSsd.DetectedObject[] = [];
  try {
    const model = await loadModel();
    const tensor = tf.tensor3d(new Uint8Array(raster.data), [raster.height, raster.width, 3], 'int32');
    try {
      cocoBoxes = await model.detect(tensor, 25, 0.35);
      usedModel = true;
    } finally {
      tensor.dispose();
    }
  } catch (err) {
    console.error('COCO-SSD inference failed:', err);
  }

  const detections: ShelfDetection[] = [];
  cocoBoxes
    .filter((obj) => obj.score >= 0.35 && (RETAIL_CLASSES.has(obj.class) || obj.score >= 0.55))
    .forEach((obj, index) => {
      const [x, y, w, h] = obj.bbox;
      detections.push(
        toDetection(
          `coco-${index}`,
          { x: x / raster.width, y: y / raster.height, w: w / raster.width, h: h / raster.height },
          raster,
          obj.class,
          obj.score
        )
      );
    });

  const extras = gridProposals(raster, detections);
  return { detections: [...detections, ...extras], usedModel };
}
