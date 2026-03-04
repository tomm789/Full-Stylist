import {
  getAspectRatio,
  getResponsiveImageDimensions,
  isValidImageSize,
  isValidImageType,
} from '../imageUtils';

describe('imageUtils pure helpers', () => {
  describe('isValidImageType', () => {
    it('accepts supported image mime types', () => {
      expect(isValidImageType('image/jpeg')).toBe(true);
      expect(isValidImageType('image/jpg')).toBe(true);
      expect(isValidImageType('image/png')).toBe(true);
      expect(isValidImageType('image/webp')).toBe(true);
      expect(isValidImageType('image/gif')).toBe(true);
    });

    it('rejects unsupported image mime types', () => {
      expect(isValidImageType('image/svg+xml')).toBe(false);
      expect(isValidImageType('application/pdf')).toBe(false);
      expect(isValidImageType('')).toBe(false);
    });

    it('returns false for undefined input', () => {
      expect(isValidImageType(undefined as any)).toBe(false);
    });
  });

  describe('isValidImageSize', () => {
    it('returns true when size is under the default max size', () => {
      expect(isValidImageSize(1 * 1024 * 1024)).toBe(true);
    });

    it('returns false when size is over the default max size', () => {
      expect(isValidImageSize(10 * 1024 * 1024 + 1)).toBe(false);
    });

    it('supports a custom max size', () => {
      expect(isValidImageSize(3 * 1024 * 1024, 5)).toBe(true);
      expect(isValidImageSize(6 * 1024 * 1024, 5)).toBe(false);
    });

    it('allows values exactly at the limit', () => {
      expect(isValidImageSize(10 * 1024 * 1024)).toBe(true);
      expect(isValidImageSize(5 * 1024 * 1024, 5)).toBe(true);
    });
  });

  describe('getAspectRatio', () => {
    it('returns 1 for square dimensions', () => {
      expect(getAspectRatio(500, 500)).toBe(1);
    });

    it('returns > 1 for landscape dimensions', () => {
      expect(getAspectRatio(1600, 900)).toBeGreaterThan(1);
    });

    it('returns < 1 for portrait dimensions', () => {
      expect(getAspectRatio(900, 1600)).toBeLessThan(1);
    });
  });

  describe('getResponsiveImageDimensions', () => {
    it('does not upscale images smaller than max', () => {
      expect(getResponsiveImageDimensions(500, 250, 1000)).toEqual({
        width: 500,
        height: 250,
      });
    });

    it('scales down images larger than max width', () => {
      expect(getResponsiveImageDimensions(2000, 1000, 1000)).toEqual({
        width: 1000,
        height: 500,
      });
    });

    it('scales down to fit both maxWidth and maxHeight', () => {
      expect(getResponsiveImageDimensions(1000, 2000, 800, 600)).toEqual({
        width: 300,
        height: 600,
      });
    });

    it('returns original dimensions when within all constraints', () => {
      expect(getResponsiveImageDimensions(400, 300, 800, 600)).toEqual({
        width: 400,
        height: 300,
      });
    });

    it('handles square max constraints', () => {
      expect(getResponsiveImageDimensions(1200, 1200, 400, 400)).toEqual({
        width: 400,
        height: 400,
      });
    });
  });
});
