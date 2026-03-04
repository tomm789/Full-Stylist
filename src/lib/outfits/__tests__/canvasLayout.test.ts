import {
  OUTFIT_CANVAS_MAX_SCALE,
  OUTFIT_CANVAS_MIN_SCALE,
  calculateGridLayout,
  clampCanvasCenter,
  clampCanvasScale,
  getDefaultOutfitCanvasLayout,
} from '../canvasLayout';

describe('canvasLayout', () => {
  describe('calculateGridLayout', () => {
    it('returns 1x1 for 0 and 1 items', () => {
      expect(calculateGridLayout(0)).toEqual({ cols: 1, rows: 1 });
      expect(calculateGridLayout(1)).toEqual({ cols: 1, rows: 1 });
    });

    it('returns 2x1 for 2 items', () => {
      expect(calculateGridLayout(2)).toEqual({ cols: 2, rows: 1 });
    });

    it('returns 2x2 for 3 to 4 items', () => {
      expect(calculateGridLayout(3)).toEqual({ cols: 2, rows: 2 });
      expect(calculateGridLayout(4)).toEqual({ cols: 2, rows: 2 });
    });

    it('returns 2x3 for 5 to 6 items', () => {
      expect(calculateGridLayout(5)).toEqual({ cols: 2, rows: 3 });
      expect(calculateGridLayout(6)).toEqual({ cols: 2, rows: 3 });
    });

    it('returns 3x3 for 7 to 9 items', () => {
      expect(calculateGridLayout(7)).toEqual({ cols: 3, rows: 3 });
      expect(calculateGridLayout(9)).toEqual({ cols: 3, rows: 3 });
    });

    it('handles larger item counts', () => {
      expect(calculateGridLayout(10)).toEqual({ cols: 3, rows: 4 });
      expect(calculateGridLayout(16)).toEqual({ cols: 4, rows: 4 });
      expect(calculateGridLayout(25)).toEqual({ cols: 5, rows: 5 });
    });
  });

  describe('clampCanvasCenter', () => {
    it('keeps values in range unchanged', () => {
      expect(clampCanvasCenter(0.05)).toBe(0.05);
      expect(clampCanvasCenter(0.5)).toBe(0.5);
      expect(clampCanvasCenter(0.95)).toBe(0.95);
    });

    it('clamps low and high out-of-range values', () => {
      expect(clampCanvasCenter(0)).toBe(0.05);
      expect(clampCanvasCenter(-1)).toBe(0.05);
      expect(clampCanvasCenter(1)).toBe(0.95);
      expect(clampCanvasCenter(2)).toBe(0.95);
    });
  });

  describe('clampCanvasScale', () => {
    it('keeps values in range unchanged', () => {
      expect(clampCanvasScale(OUTFIT_CANVAS_MIN_SCALE)).toBe(OUTFIT_CANVAS_MIN_SCALE);
      expect(clampCanvasScale(1)).toBe(1);
      expect(clampCanvasScale(OUTFIT_CANVAS_MAX_SCALE)).toBe(OUTFIT_CANVAS_MAX_SCALE);
    });

    it('clamps below and above range', () => {
      expect(clampCanvasScale(0.1)).toBe(OUTFIT_CANVAS_MIN_SCALE);
      expect(clampCanvasScale(5)).toBe(OUTFIT_CANVAS_MAX_SCALE);
    });
  });

  describe('getDefaultOutfitCanvasLayout', () => {
    it('returns centered single-item layout with default scale', () => {
      expect(getDefaultOutfitCanvasLayout(0, 1)).toEqual({
        centerX: 0.5,
        centerY: 0.5,
        scale: 1,
        zIndex: 0,
      });
    });

    it('returns side-by-side two-item layout', () => {
      expect(getDefaultOutfitCanvasLayout(0, 2)).toMatchObject({
        centerX: 0.25,
        centerY: 0.5,
        scale: 1,
        zIndex: 0,
      });
      expect(getDefaultOutfitCanvasLayout(1, 2)).toMatchObject({
        centerX: 0.75,
        centerY: 0.5,
        scale: 1,
        zIndex: 1,
      });
    });

    it('returns 2x2 positions for four items', () => {
      expect(getDefaultOutfitCanvasLayout(0, 4)).toMatchObject({
        centerX: 0.25,
        centerY: 0.25,
        zIndex: 0,
      });
      expect(getDefaultOutfitCanvasLayout(1, 4)).toMatchObject({
        centerX: 0.75,
        centerY: 0.25,
        zIndex: 1,
      });
      expect(getDefaultOutfitCanvasLayout(2, 4)).toMatchObject({
        centerX: 0.25,
        centerY: 0.75,
        zIndex: 2,
      });
      expect(getDefaultOutfitCanvasLayout(3, 4)).toMatchObject({
        centerX: 0.75,
        centerY: 0.75,
        zIndex: 3,
      });
    });

    it('always returns values within valid canvas and scale bounds', () => {
      const layout = getDefaultOutfitCanvasLayout(5, 9);
      expect(layout.centerX).toBeGreaterThanOrEqual(0.05);
      expect(layout.centerX).toBeLessThanOrEqual(0.95);
      expect(layout.centerY).toBeGreaterThanOrEqual(0.05);
      expect(layout.centerY).toBeLessThanOrEqual(0.95);
      expect(layout.scale).toBeGreaterThanOrEqual(OUTFIT_CANVAS_MIN_SCALE);
      expect(layout.scale).toBeLessThanOrEqual(OUTFIT_CANVAS_MAX_SCALE);
    });
  });
});
