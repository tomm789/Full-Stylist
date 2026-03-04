import React from 'react';
import {
  View,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useSearch } from '@/hooks';
import SearchResultsPanel from '@/components/search/SearchResultsPanel';
import { Header, HeaderIconButton } from '@/components/shared/layout';
import { styles } from './_search.styles';

export default function SearchScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { filter } = useLocalSearchParams<{ filter?: string | string[] }>();

  const {
    searchQuery,
    loading,
    selectedFilter,
    filteredResults,
    setSearchQuery,
    setSelectedFilter,
  } = useSearch({ userId: user?.id });

  React.useEffect(() => {
    const filterParam = Array.isArray(filter) ? filter[0] : filter;
    if (!filterParam) return;
    if (
      filterParam === 'all' ||
      filterParam === 'user' ||
      filterParam === 'outfit' ||
      filterParam === 'lookbook' ||
      filterParam === 'wardrobe_item'
    ) {
      setSelectedFilter(filterParam);
    }
  }, [filter, setSelectedFilter]);

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
        leftContent={<HeaderIconButton icon="chevron-back" onPress={() => router.back()} />}
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

      <SearchResultsPanel
        searchQuery={searchQuery}
        loading={loading}
        selectedFilter={selectedFilter}
        filteredResults={filteredResults}
        onFilterChange={setSelectedFilter}
        onResultPress={handleResultPress}
      />
    </SafeAreaView>
  );
}
