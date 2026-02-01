import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useSearch } from '@/hooks';
import { SearchResultItem, SearchFilterBar, LoadingSpinner } from '@/components/shared';
import { Header, HeaderActionButton } from '@/components/shared/layout';

export default function SearchScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const {
    searchQuery,
    loading,
    selectedFilter,
    filteredResults,
    setSearchQuery,
    setSelectedFilter,
  } = useSearch({ userId: user?.id });

  const handleResultPress = (result: typeof filteredResults[0]) => {
    switch (result.type) {
      case 'user':
        router.push(`/users/${result.id}`);
        break;
      case 'outfit':
        router.push(`/outfits/${result.id}`);
        break;
      case 'lookbook':
        router.push(`/lookbooks/${result.id}`);
        break;
      case 'wardrobe_item':
        router.push(`/wardrobe/item/${result.id}`);
        break;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Header
        title="Search"
        leftContent={
          <HeaderActionButton
            label="Back"
            onPress={() => router.back()}
          />
        }
      />

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users, outfits, lookbooks..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips */}
      <SearchFilterBar
        selectedFilter={selectedFilter}
        onFilterChange={setSelectedFilter}
      />

      {/* Results */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <LoadingSpinner size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredResults}
          renderItem={({ item }) => (
            <SearchResultItem result={item} onPress={handleResultPress} />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    paddingVertical: 8,
  },
  clearButton: {
    padding: 4,
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
