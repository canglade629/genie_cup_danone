import { describe, expect, it } from 'vitest';
import { classifyFacing, rgbToHsl } from '../../shared/vision/classify-facing';
import { annotateIssues, buildAnalysis, demoDetections } from './analyze-result';

describe('classifyFacing', () => {
  it('maps dark low-saturation cells to out-of-stock', () => {
    expect(classifyFacing({ r: 40, g: 42, b: 48 }).manufacturer).toBe('Empty');
  });

  it('maps blue packs to Activia / Danone', () => {
    const facing = classifyFacing({ r: 40, g: 90, b: 200 });
    expect(facing.manufacturer).toBe('Danone');
    expect(facing.brand).toBe('Activia');
  });

  it('maps magenta packs to Yoplait', () => {
    const facing = classifyFacing({ r: 210, g: 60, b: 160 });
    expect(facing.manufacturer).toBe('Yoplait');
  });

  it('maps green bottles to Volvic', () => {
    const facing = classifyFacing({ r: 30, g: 160, b: 90 }, 'bottle');
    expect(facing.label).toBe('Volvic');
    expect(facing.manufacturer).toBe('Danone');
  });

  it('converts rgb to hsl in the blue range', () => {
    const hsl = rgbToHsl({ r: 30, g: 80, b: 220 });
    expect(hsl.h).toBeGreaterThan(200);
    expect(hsl.h).toBeLessThan(250);
  });
});

describe('buildAnalysis', () => {
  it('scores demo detections with share-of-shelf and NBA', () => {
    const result = buildAnalysis('FR-PAR-001', demoDetections('FR-PAR-001'), 'test');
    expect(result.oos_count).toBeGreaterThan(0);
    expect(result.danone_share_pct + result.competitor_share_pct).toBeCloseTo(100, 0);
    expect(result.next_best_action.strategy_code).toBe('restock_oos');
  });

  it('flags competitors at eye level', () => {
    const [annotated] = annotateIssues([
      {
        id: 'c1',
        label: 'Yoplait',
        manufacturer: 'Yoplait',
        brand: 'Yoplait',
        x: 0.1,
        y: 0.05,
        w: 0.2,
        h: 0.2,
      },
    ]);
    expect(annotated.issue).toBe('competitor_eye_level');
    expect(annotated.shelf_zone).toBe('eye');
  });
});
