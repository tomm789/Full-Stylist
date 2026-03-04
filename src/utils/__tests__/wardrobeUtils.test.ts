import { type WardrobeItem } from '@/lib/wardrobe';
import {
  formatSize,
  getItemCountByCategory,
  getVisibilityLabel,
  groupItemsByCategory,
  isMultiSelectCategory,
  isOwnItem,
  parseJsonField,
  searchItems,
  sortItems,
} from '../wardrobeUtils';

const createItem = (overrides: Partial<WardrobeItem> = {}): WardrobeItem => ({
  id: 'item-1',
  wardrobe_id: 'wardrobe-1',
  owner_user_id: 'user-1',
  title: 'Default Title',
  description: 'Default Description',
  category_id: 'tops',
  subcategory_id: 'sub-1',
  brand: 'Default Brand',
  color_primary: 'Black',
  is_favorite: false,
  visibility_override: 'public',
  is_sellable: false,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('wardrobeUtils', () => {
  describe('isMultiSelectCategory', () => {
    it('returns true for known multi-select category names', () => {
      expect(isMultiSelectCategory('ignored', 'accessories')).toBe(true);
      expect(isMultiSelectCategory('ignored', 'jewellery')).toBe(true);
      expect(isMultiSelectCategory('ignored', 'jewelry')).toBe(true);
      expect(isMultiSelectCategory('ignored', 'activewear')).toBe(true);
      expect(isMultiSelectCategory('ignored', 'intimates')).toBe(true);
      expect(isMultiSelectCategory('ignored', 'sleepwear')).toBe(true);
    });

    it('handles case and whitespace normalization for category names', () => {
      expect(isMultiSelectCategory('ignored', '  ACCESSORIES  ')).toBe(true);
      expect(isMultiSelectCategory('ignored', ' Jewelry ')).toBe(true);
    });

    it('returns false for non-multi-select and missing names', () => {
      expect(isMultiSelectCategory('ignored', 'tops')).toBe(false);
      expect(isMultiSelectCategory('ignored', 'bottoms')).toBe(false);
      expect(isMultiSelectCategory('ignored', 'shoes')).toBe(false);
      expect(isMultiSelectCategory('ignored', 'dresses')).toBe(false);
      expect(isMultiSelectCategory('accessories', undefined)).toBe(false);
      expect(isMultiSelectCategory(null, undefined)).toBe(false);
    });
  });

  describe('sortItems', () => {
    const items: WardrobeItem[] = [
      createItem({
        id: 'item-a',
        title: 'Charlie Shirt',
        created_at: '2026-01-01T00:00:00.000Z',
        is_favorite: false,
      }),
      createItem({
        id: 'item-b',
        title: 'Alpha Jacket',
        created_at: '2026-01-03T00:00:00.000Z',
        is_favorite: true,
      }),
      createItem({
        id: 'item-c',
        title: 'Bravo Pants',
        created_at: '2026-01-02T00:00:00.000Z',
        is_favorite: false,
      }),
    ];

    it('sorts by recent (newest first)', () => {
      expect(sortItems(items, 'recent').map((item) => item.id)).toEqual([
        'item-b',
        'item-c',
        'item-a',
      ]);
    });

    it('sorts by oldest (oldest first)', () => {
      expect(sortItems(items, 'oldest').map((item) => item.id)).toEqual([
        'item-a',
        'item-c',
        'item-b',
      ]);
    });

    it('sorts by name alphabetically', () => {
      expect(sortItems(items, 'name').map((item) => item.id)).toEqual([
        'item-b',
        'item-c',
        'item-a',
      ]);
    });

    it('sorts by favorite with favorited items first', () => {
      const sorted = sortItems(items, 'favorite');
      expect(sorted[0].is_favorite).toBe(true);
      expect(sorted.map((item) => item.id)).toEqual(['item-b', 'item-a', 'item-c']);
    });

    it('returns empty array for empty input', () => {
      expect(sortItems([], 'recent')).toEqual([]);
    });

    it('does not mutate original array', () => {
      const original = [...items];
      const originalIds = items.map((item) => item.id);

      sortItems(items, 'recent');

      expect(items).toEqual(original);
      expect(items.map((item) => item.id)).toEqual(originalIds);
    });
  });

  describe('searchItems', () => {
    const items: WardrobeItem[] = [
      createItem({
        id: 'item-title',
        title: 'Silk Blouse',
        description: 'Soft and lightweight',
        brand: 'Acme',
        color_primary: 'White',
      }),
      createItem({
        id: 'item-desc',
        title: 'Structured Pants',
        description: 'Tailored office fit',
        brand: 'Contoso',
        color_primary: 'Black',
      }),
      createItem({
        id: 'item-brand',
        title: 'Weekend Tee',
        description: 'Relaxed shape',
        brand: 'Northwind',
        color_primary: 'Blue',
      }),
    ];

    it('matches title, description, brand, and color fields', () => {
      expect(searchItems(items, 'blouse').map((item) => item.id)).toEqual(['item-title']);
      expect(searchItems(items, 'office').map((item) => item.id)).toEqual(['item-desc']);
      expect(searchItems(items, 'northwind').map((item) => item.id)).toEqual(['item-brand']);
      expect(searchItems(items, 'white').map((item) => item.id)).toEqual(['item-title']);
    });

    it('is case-insensitive', () => {
      expect(searchItems(items, 'SILK').map((item) => item.id)).toEqual(['item-title']);
    });

    it('returns all items for empty query', () => {
      const result = searchItems(items, '   ');
      expect(result).toBe(items);
      expect(result).toHaveLength(3);
    });

    it('returns empty array for no matches', () => {
      expect(searchItems(items, 'no-match')).toEqual([]);
    });
  });

  describe('groupItemsByCategory', () => {
    it('groups items by category id', () => {
      const items = [
        createItem({ id: 'a', category_id: 'tops' }),
        createItem({ id: 'b', category_id: 'bottoms' }),
        createItem({ id: 'c', category_id: 'tops' }),
      ];

      const grouped = groupItemsByCategory(items);

      expect(grouped.size).toBe(2);
      expect(grouped.get('tops')?.map((item) => item.id)).toEqual(['a', 'c']);
      expect(grouped.get('bottoms')?.map((item) => item.id)).toEqual(['b']);
    });

    it('returns an empty map for empty array', () => {
      expect(groupItemsByCategory([]).size).toBe(0);
    });
  });

  describe('getItemCountByCategory', () => {
    it('counts items per category', () => {
      const items = [
        createItem({ id: 'a', category_id: 'tops' }),
        createItem({ id: 'b', category_id: 'bottoms' }),
        createItem({ id: 'c', category_id: 'tops' }),
      ];

      const counts = getItemCountByCategory(items);

      expect(counts.get('tops')).toBe(2);
      expect(counts.get('bottoms')).toBe(1);
    });
  });

  describe('parseJsonField', () => {
    it('returns string values as-is', () => {
      const value = '{"foo":"bar"}';
      expect(parseJsonField(value)).toBe(value);
    });

    it('returns objects as-is', () => {
      const value = { foo: 'bar' };
      expect(parseJsonField(value)).toBe(value);
    });

    it('returns null for null and undefined', () => {
      expect(parseJsonField(null)).toBeNull();
      expect(parseJsonField(undefined)).toBeNull();
    });

    it('handles invalid json string without throwing', () => {
      expect(parseJsonField('{not-json}')).toBe('{not-json}');
    });
  });

  describe('formatSize', () => {
    it('returns string input as-is', () => {
      expect(formatSize('M')).toBe('M');
    });

    it('joins array input with commas', () => {
      expect(formatSize(['S', 'M', 'L'])).toBe('S, M, L');
    });

    it('returns first object value for object input', () => {
      expect(formatSize({ us: '8', eu: '38' })).toBe('8');
    });

    it('returns empty string for null and undefined', () => {
      expect(formatSize(null)).toBe('');
      expect(formatSize(undefined)).toBe('');
    });
  });

  describe('getVisibilityLabel', () => {
    it('maps each known visibility value to its label', () => {
      expect(getVisibilityLabel('public')).toBe('Public');
      expect(getVisibilityLabel('followers')).toBe('Followers');
      expect(getVisibilityLabel('private_link')).toBe('Private Link');
      expect(getVisibilityLabel('private')).toBe('Private');
      expect(getVisibilityLabel('inherit')).toBe('Inherit from settings');
    });

    it('returns Unknown for unsupported values', () => {
      expect(getVisibilityLabel('unknown' as any)).toBe('Unknown');
    });
  });

  describe('isOwnItem', () => {
    it('returns true when owner matches user id', () => {
      const item = createItem({ owner_user_id: 'user-123' });
      expect(isOwnItem(item, 'user-123')).toBe(true);
    });

    it('returns false when owner does not match or user id is missing', () => {
      const item = createItem({ owner_user_id: 'owner-1' });
      expect(isOwnItem(item, 'different-user')).toBe(false);
      expect(isOwnItem(item, null)).toBe(false);
    });
  });
});
