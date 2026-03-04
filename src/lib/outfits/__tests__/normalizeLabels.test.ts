import {
  normalizeLabel,
  normalizeLabelKey,
  normalizeLabelList,
} from '../normalizeLabels';

describe('normalizeLabels', () => {
  describe('normalizeLabel', () => {
    it('normalizes and title-cases standard strings', () => {
      expect(normalizeLabel('  hello world  ')).toBe('Hello World');
    });

    it('collapses repeated spaces', () => {
      expect(normalizeLabel('foo   bar')).toBe('Foo Bar');
    });

    it('returns empty string for non-string input', () => {
      ([42, null, undefined, {}, []] as any[]).forEach((value) => {
        expect(normalizeLabel(value)).toBe('');
      });
    });

    it('returns empty string for empty or whitespace-only values', () => {
      expect(normalizeLabel('')).toBe('');
      expect(normalizeLabel('     ')).toBe('');
    });

    it('keeps an already normalized label unchanged', () => {
      expect(normalizeLabel('Already Normalized')).toBe('Already Normalized');
    });

    it('normalizes a single word', () => {
      expect(normalizeLabel('hello')).toBe('Hello');
    });
  });

  describe('normalizeLabelKey', () => {
    it('normalizes and lowercases input', () => {
      expect(normalizeLabelKey('  Hello WORLD ')).toBe('hello world');
    });

    it('returns empty string for non-string input', () => {
      expect(normalizeLabelKey(123 as any)).toBe('');
      expect(normalizeLabelKey(null as any)).toBe('');
    });
  });

  describe('normalizeLabelList', () => {
    it('deduplicates labels case-insensitively', () => {
      expect(normalizeLabelList(['Red', 'red', 'RED'])).toEqual(['Red']);
    });

    it('filters mixed-type inputs down to normalized strings', () => {
      expect(normalizeLabelList(['valid', 42 as any, null as any, 'another'])).toEqual([
        'Valid',
        'Another',
      ]);
    });

    it('returns empty list for undefined, null, and empty arrays', () => {
      expect(normalizeLabelList(undefined)).toEqual([]);
      expect(normalizeLabelList(null as any)).toEqual([]);
      expect(normalizeLabelList([])).toEqual([]);
    });

    it('preserves first-occurrence order', () => {
      expect(
        normalizeLabelList(['  blue sky  ', 'red', 'BLUE   SKY', 'green'])
      ).toEqual(['Blue Sky', 'Red', 'Green']);
    });
  });
});
