import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs-backend-cpu';
import * as tf from '@tensorflow/tfjs-core';
import { classifyFacing, type Rgb } from '../../../shared/vision/classify-facing';

export interface VisionDetection {
  id: string;
  label: string;
  manufacturer: 'Danone' | 'Yoplait' | 'Nestlé' | 'Empty';
  brand: string;
  x: number;
  y: number;
  w: number;
  h: number;
  score?: number;
  shelf_zone: 'eye' | 'mid' | 'low';
  margin_eur: number;
}

const MAX_WIDTH = 640;
const MODEL_URL = '/models/ssdlite_mobilenet_v2/model.json';
const RETAIL_CLASSES = new Set([
  'bottle',
  'cup',
  'bowl',
  'wine glass',
  'vase',
  'book',
  'orange',
  'banana',
  'apple',
  'sandwich',
  'donut',
  'cake',
  'toothbrush',
]);

let modelPromise: Promise<cocoSsd.ObjectDetection> | null = null;

async function loadModel(): Promise<cocoSsd.ObjectDetection> {
  if (!modelPromise) {
    modelPromise = (async () => {
      await tf.setBackend('cpu');
      await tf.ready();
      return cocoSsd.load({ base: 'lite_mobilenet_v2', modelUrl: MODEL_URL });
    })().catch((error) => {
      modelPromise = null;
      throw error;
    });
  }
  return modelPromise;
}

async function imageCanvas(source: string): Promise<{
  canvas: HTMLCanvasElement;
  pixels: ImageData;
}> {
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Unable to load shelf image (${response.status})`);
  const bitmap = await createImageBitmap(await response.blob());
  const scale = Math.min(1, MAX_WIDTH / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas image processing is unavailable');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return { canvas, pixels: context.getImageData(0, 0, canvas.width, canvas.height) };
}

function meanColor(pixels: ImageData, x: number, y: number, w: number, h: number): Rgb {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(pixels.width, Math.ceil(x + w));
  const y1 = Math.min(pixels.height, Math.ceil(y + h));
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let py = y0; py < y1; py += 2) {
    for (let px = x0; px < x1; px += 2) {
      const index = (py * pixels.width + px) * 4;
      r += pixels.data[index];
      g += pixels.data[index + 1];
      b += pixels.data[index + 2];
      n += 1;
    }
  }
  return n === 0 ? { r: 0, g: 0, b: 0 } : { r: r / n, g: g / n, b: b / n };
}

function variance(pixels: ImageData, x: number, y: number, w: number, h: number): number {
  const color = meanColor(pixels, x, y, w, h);
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(pixels.width, Math.ceil(x + w));
  const y1 = Math.min(pixels.height, Math.ceil(y + h));
  let total = 0;
  let n = 0;
  for (let py = y0; py < y1; py += 3) {
    for (let px = x0; px < x1; px += 3) {
      const index = (py * pixels.width + px) * 4;
      const dr = pixels.data[index] - color.r;
      const dg = pixels.data[index + 1] - color.g;
      const db = pixels.data[index + 2] - color.b;
      total += dr * dr + dg * dg + db * db;
      n += 1;
    }
  }
  return n === 0 ? 0 : total / n;
}

function shelfZone(y: number, h: number): 'eye' | 'mid' | 'low' {
  const center = y + h / 2;
  if (center < 0.34) return 'eye';
  if (center < 0.67) return 'mid';
  return 'low';
}

function iou(a: VisionDetection, b: { x: number; y: number; w: number; h: number }): number {
  const x0 = Math.max(a.x, b.x);
  const y0 = Math.max(a.y, b.y);
  const x1 = Math.min(a.x + a.w, b.x + b.w);
  const y1 = Math.min(a.y + a.h, b.y + b.h);
  const intersection = Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
  const union = a.w * a.h + b.w * b.h - intersection;
  return union <= 0 ? 0 : intersection / union;
}

function detection(
  id: string,
  box: { x: number; y: number; w: number; h: number },
  pixels: ImageData,
  cocoClass?: string,
  score?: number
): VisionDetection {
  const color = meanColor(
    pixels,
    box.x * pixels.width,
    box.y * pixels.height,
    box.w * pixels.width,
    box.h * pixels.height
  );
  const facing = classifyFacing(color, cocoClass);
  return {
    id,
    ...facing,
    ...box,
    score,
    shelf_zone: shelfZone(box.y, box.h),
    margin_eur: facing.manufacturer === 'Empty' ? 0 : facing.manufacturer === 'Danone' ? 0.32 : 0.16,
  };
}

function gridDetections(pixels: ImageData, existing: VisionDetection[]): VisionDetection[] {
  const extras: VisionDetection[] = [];
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 5; column += 1) {
      const box = {
        x: column / 5 + 0.015,
        y: row / 4 + 0.02,
        w: 1 / 5 - 0.03,
        h: 1 / 4 - 0.04,
      };
      if (existing.some((item) => iou(item, box) > 0.25)) continue;
      const candidate = detection(`grid-${row}-${column}`, box, pixels, 'cup', 0.35);
      const isEmpty =
        candidate.manufacturer === 'Empty' ||
        variance(pixels, box.x * pixels.width, box.y * pixels.height, box.w * pixels.width, box.h * pixels.height) <
          180;
      if (isEmpty) {
        extras.push({
          ...candidate,
          label: 'OOS void',
          manufacturer: 'Empty',
          brand: '—',
          margin_eur: 0,
          score: 0.4,
        });
      } else if (existing.length + extras.length < 8) {
        extras.push(candidate);
      }
    }
  }
  return extras.slice(0, 12);
}

export async function detectShelfPhoto(source: string): Promise<VisionDetection[]> {
  const { canvas, pixels } = await imageCanvas(source);
  const model = await loadModel();
  const objects = await model.detect(canvas, 25, 0.35);
  const detections = objects
    .filter((item) => item.score >= 0.35 && (RETAIL_CLASSES.has(item.class) || item.score >= 0.55))
    .map((item, index) => {
      const [x, y, w, h] = item.bbox;
      return detection(
        `coco-${index}`,
        { x: x / canvas.width, y: y / canvas.height, w: w / canvas.width, h: h / canvas.height },
        pixels,
        item.class,
        item.score
      );
    });

  return [...detections, ...gridDetections(pixels, detections)];
}
