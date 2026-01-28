/**
 * useSearch Hook
 * Debounced search across users, outfits, lookbooks, and wardrobe items
 */

import { useState, useEffect, useCallback } from 'react';
import { searchUsers } from '@/lib/user';
import { searchOutfits } from '@/lib/outfits';
import { searchLookbooks } from '@/lib/lookbooks';
import { searchWardrobeItems } from '@/lib/wardrobe';

type SearchResultType = 'user' | 'outfit' | 'lookbook' | 'wardrobe_item';

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  owner?: {
    handle: string;
    display_name: string;
  };
}

interface UseSearchProps {
  userId: string | undefined;
  debounceMs?: number;
}

interface UseSearchReturn {
  searchQuery: string;
  results: SearchResult[];
  loading: boolean;
  selectedFilter: SearchResultType | 'all';
  setSearchQuery: (query: string) => void;
  setSelectedFilter: (filter: SearchResultType | 'all') => void;
  filteredResults: SearchResult[];
}

export function useSearch({
  userId,
  debounceMs = 300,
}: UseSearchProps): UseSearchReturn {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<SearchResultType | 'all'>('all');

  const performSearch = useCallback(async () => {
    if (searchQuery.trim().length === 0) {
      setResults([]);
      return;
    }

    setLoading(true);

    try {
      // Query all entity types in parallel
      const [usersResult, outfitsResult, lookbooksResult, wardrobeResult] =
        await Promise.all([
          searchUsers(searchQuery),
          searchOutfits(searchQuery),
          searchLookbooks(searchQuery),
          searchWardrobeItems(searchQuery),
        ]);

      // Transform and combine results
      const combinedResults: SearchResult[] = [];

      // Add users
      if (usersResult.data) {
        usersResult.data
          .filter((u) => u.id !== userId)
          .forEach((u) => {
            combinedResults.push({
              id: u.id,
              type: 'user',
              title: u.display_name,
              subtitle: `@${u.handle}`,
            });
          });
      }

      // Add outfits
      if (outfitsResult.data) {
        outfitsResult.data.forEach((o) => {
          combinedResults.push({
            id: o.id,
            type: 'outfit',
            title: o.title || 'Untitled Outfit',
            subtitle: o.owner ? `by @${o.owner.handle}` : undefined,
            owner: o.owner,
          });
        });
      }

      // Add lookbooks
      if (lookbooksResult.data) {
        lookbooksResult.data.forEach((l) => {
          combinedResults.push({
            id: l.id,
            type: 'lookbook',
            title: l.title,
            subtitle: l.owner ? `by @${l.owner.handle}` : undefined,
            owner: l.owner,
          });
        });
      }

      // Add wardrobe items
      if (wardrobeResult.data) {
        wardrobeResult.data.forEach((w) => {
          combinedResults.push({
            id: w.id,
            type: 'wardrobe_item',
            title: w.title,
            subtitle: w.owner ? `by @${w.owner.handle}` : undefined,
            owner: w.owner,
          });
        });
      }

      setResults(combinedResults);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, userId]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      performSearch();
    }, debounceMs);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, performSearch, debounceMs]);

  const filteredResults =
    selectedFilter === 'all'
      ? results
      : results.filter((r) => r.type === selectedFilter);

  return {
    searchQuery,
    results,
    loading,
    selectedFilter,
    setSearchQuery,
    setSelectedFilter,
    filteredResults,
  };
}
