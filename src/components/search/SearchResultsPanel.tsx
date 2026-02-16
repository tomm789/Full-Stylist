/**
 * SearchResultsPanel
 * Search filter chips + results list (no header or search input).
 */

import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SearchFilterBar, SearchResultItem, LoadingSpinner } from '@/components/shared';
import type { SearchResult, SearchResultType } from '@/hooks/useSearch';

interface SearchResultsPanelProps {
  searchQuery: string;
  loading: boolean;
  selectedFilter: SearchResultType | 'all';
  filteredResults: SearchResult[];
  onFilterChange: (filter: SearchResultType | 'all') => void;
  onResultPress: (result: SearchResult) => void;
}

export default function SearchResultsPanel({
  searchQuery,
  loading,
  selectedFilter,
  filteredResults,
  onFilterChange,
  onResultPress,
}: SearchResultsPanelProps) {
  return (
    <View style={styles.container}>
      <SearchFilterBar
        selectedFilter={selectedFilter}
        onFilterChange={onFilterChange}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredResults}
          renderItem={({ item }) => (
            <SearchResultItem result={item} onPress={onResultPress} />
          )}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            searchQuery.trim().length > 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={64} color="#ccc" />
                <Text style={styles.emptyText}>No results found</Text>
                <Text style={styles.emptySubtext}>Try a different search term</Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={64} color="#ccc" />
                <Text style={styles.emptyText}>Search everything</Text>
                <Text style={styles.emptySubtext}>
                  Find users, outfits, lookbooks, and items
                </Text>
              </View>
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  listContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
