import { formatTimestamp } from '../formatUtils';

describe('formatUtils', () => {
  describe('formatTimestamp', () => {
    const fixedNow = new Date('2026-03-04T12:00:00.000Z');

    beforeAll(() => {
      jest.useFakeTimers();
      jest.setSystemTime(fixedNow);
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    const isoAgo = (ms: number): string => {
      return new Date(fixedNow.getTime() - ms).toISOString();
    };

    it('formats timestamps from seconds ago as Just now', () => {
      expect(formatTimestamp(isoAgo(30 * 1000))).toBe('Just now');
    });

    it('formats timestamps from minutes ago', () => {
      expect(formatTimestamp(isoAgo(5 * 60 * 1000))).toBe('5m ago');
    });

    it('formats timestamps from hours ago', () => {
      expect(formatTimestamp(isoAgo(2 * 60 * 60 * 1000))).toBe('2h ago');
    });

    it('formats timestamps from days ago', () => {
      expect(formatTimestamp(isoAgo(3 * 24 * 60 * 60 * 1000))).toBe('3d ago');
    });

    it('formats timestamps older than 7 days as a locale date', () => {
      const timestamp = isoAgo(8 * 24 * 60 * 60 * 1000);
      const posted = new Date(timestamp);
      const expected = posted.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });

      expect(formatTimestamp(timestamp)).toBe(expected);
    });

    it('handles invalid input gracefully', () => {
      expect(formatTimestamp('not-a-date')).toBe('Invalid Date');
    });

    it('handles null input without throwing', () => {
      const expected = new Date(null as any).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      expect(formatTimestamp(null as any)).toBe(expected);
    });
  });
});
