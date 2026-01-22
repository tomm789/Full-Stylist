import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { searchUsers } from '@/lib/user';
import { searchOutfits } from '@/lib/outfits';
import { searchLookbooks } from '@/lib/lookbooks';
import { searchWardrobeItems } from '@/lib/wardrobe';

type SearchResultType = 'user' | 'outfit' | 'lookbook' | 'wardrobe_item';

interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  owner?: {
    handle: string;
    display_name: string;
  };
}

export default function SearchScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<SearchResultType | 'all'>('all');

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim().length > 0) {
        performSearch();
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const performSearch = async () => {
    setLoading(true);
    
    // Query all entity types in parallel
    const [usersResult, outfitsResult, lookbooksResult, wardrobeResult] = await Promise.all([
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
        .filter((u) => u.id !== user?.id)
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
    setLoading(false);
  };

  const handleResultPress = (result: SearchResult) => {
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

  const getResultIcon = (type: SearchResultType) => {
    switch (type) {
      case 'user':
        return 'person-circle-outline';
      case 'outfit':
        return 'shirt-outline';
      case 'lookbook':
        return 'albums-outline';
      case 'wardrobe_item':
        return 'pricetag-outline';
      default:
        return 'help-circle-outline';
    }
  };

  const getResultTypeLabel = (type: SearchResultType) => {
    switch (type) {
      case 'user':
        return 'User';
      case 'outfit':
        return 'Outfit';
      case 'lookbook':
        return 'Lookbook';
      case 'wardrobe_item':
        return 'Item';
      default:
        return 'Unknown';
    }
  };

  const renderResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity style={styles.resultItem} onPress={() => handleResultPress(item)}>
      <View style={styles.resultIcon}>
        <Ionicons name={getResultIcon(item.type)} size={48} color="#999" />
      </View>
      <View style={styles.resultInfo}>
        <View style={styles.titleRow}>
          <Text style={styles.resultTitle}>{item.title}</Text>
          <View style={styles.typeLabel}>
            <Text style={styles.typeLabelText}>{getResultTypeLabel(item.type)}</Text>
          </View>
        </View>
        {item.subtitle && (
          <Text style={styles.resultSubtitle}>{item.subtitle}</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#999" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search</Text>
        <View style={styles.backButton} />
      </View>

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
      <View style={styles.filterWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === 'all' && styles.filterChipActive]}
            onPress={() => setSelectedFilter('all')}
          >
            <Text style={[styles.filterChipText, selectedFilter === 'all' && styles.filterChipTextActive]}>
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === 'user' && styles.filterChipActive]}
            onPress={() => setSelectedFilter('user')}
          >
            <Ionicons 
              name="person-outline" 
              size={14} 
              color={selectedFilter === 'user' ? '#fff' : '#666'} 
              style={styles.filterChipIcon}
            />
            <Text style={[styles.filterChipText, selectedFilter === 'user' && styles.filterChipTextActive]}>
              Users
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === 'outfit' && styles.filterChipActive]}
            onPress={() => setSelectedFilter('outfit')}
          >
            <Ionicons 
              name="shirt-outline" 
              size={14} 
              color={selectedFilter === 'outfit' ? '#fff' : '#666'} 
              style={styles.filterChipIcon}
            />
            <Text style={[styles.filterChipText, selectedFilter === 'outfit' && styles.filterChipTextActive]}>
              Outfits
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === 'lookbook' && styles.filterChipActive]}
            onPress={() => setSelectedFilter('lookbook')}
          >
            <Ionicons 
              name="albums-outline" 
              size={14} 
              color={selectedFilter === 'lookbook' ? '#fff' : '#666'} 
              style={styles.filterChipIcon}
            />
            <Text style={[styles.filterChipText, selectedFilter === 'lookbook' && styles.filterChipTextActive]}>
              Lookbooks
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === 'wardrobe_item' && styles.filterChipActive]}
            onPress={() => setSelectedFilter('wardrobe_item')}
          >
            <Ionicons 
              name="pricetag-outline" 
              size={14} 
              color={selectedFilter === 'wardrobe_item' ? '#fff' : '#666'} 
              style={styles.filterChipIcon}
            />
            <Text style={[styles.filterChipText, selectedFilter === 'wardrobe_item' && styles.filterChipTextActive]}>
              Items
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={results.filter(r => selectedFilter === 'all' || r.type === selectedFilter)}
          renderItem={renderResult}
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
                <Text style={styles.emptySubtext}>Find users, outfits, lookbooks, and items</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
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
  filterWrapper: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterChipIcon: {
    marginRight: 4,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  listContent: {
    paddingBottom: 20,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  resultIcon: {
    marginRight: 12,
  },
  resultInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  typeLabel: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  typeLabelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
  },
  resultSubtitle: {
    fontSize: 14,
    color: '#666',
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
