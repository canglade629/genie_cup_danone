export type Manufacturer = 'Danone' | 'Yoplait' | 'Nestlé' | 'Empty';

export interface FacingClass {
  label: string;
  manufacturer: Manufacturer;
  brand: string;
}

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function rgbToHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (max === rn) h = ((gn - bn) / d) % 6;
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return { h, s, l };
}

const BOTTLE_CLASSES = new Set(['bottle', 'wine glass', 'vase', 'cup']);

export function classifyFacing(rgb: Rgb, cocoClass?: string): FacingClass {
  const { h, s, l } = rgbToHsl(rgb);
  const isBottle = Boolean(cocoClass && BOTTLE_CLASSES.has(cocoClass));

  if (s < 0.14 && l < 0.38) {
    return { label: 'OOS void', manufacturer: 'Empty', brand: '—' };
  }

  if (isBottle && h >= 80 && h <= 170 && s >= 0.15) {
    return { label: 'Volvic', manufacturer: 'Danone', brand: 'Volvic' };
  }
  if (isBottle && (h <= 25 || h >= 330) && s >= 0.2) {
    return { label: 'Actimel', manufacturer: 'Danone', brand: 'Actimel' };
  }
  if (isBottle && h >= 300 && h < 330 && s >= 0.2) {
    return { label: 'Yop', manufacturer: 'Yoplait', brand: 'Yoplait' };
  }

  if (h >= 185 && h <= 245 && s >= 0.18) {
    return { label: 'Activia Nature', manufacturer: 'Danone', brand: 'Activia' };
  }
  if (h >= 165 && h < 185 && s >= 0.15 && l > 0.42) {
    return { label: 'Oikos HP Natural', manufacturer: 'Danone', brand: 'Oikos' };
  }
  if ((h >= 300 || h <= 18) && s >= 0.2 && l > 0.35) {
    return { label: 'Yoplait Skyr', manufacturer: 'Yoplait', brand: 'Yoplait' };
  }
  if (h >= 15 && h <= 45 && s >= 0.2 && l < 0.52) {
    return { label: 'Danette', manufacturer: 'Danone', brand: 'Danette' };
  }
  if (h >= 250 && h <= 295 && s >= 0.18) {
    return { label: 'Taillefine', manufacturer: 'Danone', brand: 'Taillefine' };
  }
  if (h >= 40 && h <= 70 && s >= 0.25) {
    return { label: 'La Laitière', manufacturer: 'Nestlé', brand: 'La Laitière' };
  }
  if (h >= 90 && h <= 150 && s >= 0.2) {
    return { label: 'Ski', manufacturer: 'Nestlé', brand: 'Ski' };
  }
  if (l > 0.72 && s < 0.15) {
    return { label: 'Nature yogurt', manufacturer: 'Danone', brand: 'Danone' };
  }

  return { label: cocoClass ? cocoClass : 'Unlabeled SKU', manufacturer: 'Yoplait', brand: 'Other' };
}
