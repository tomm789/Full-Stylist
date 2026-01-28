/**
 * FindSimilarModal Component
 * Modal for finding similar items (wardrobe, sellable, online)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useFindSimilar } from '@/hooks';
import { FindSimilarResultItem } from './FindSimilarResultItem';
import { FindSimilarOnlineResultItem } from './FindSimilarOnlineResultItem';

interface FindSimilarModalProps {
  visible: boolean;
  onClose: () => void;
  entityType: 'wardrobe_item' | 'outfit';
  entityId: string;
  categoryId?: string;
}

export default function FindSimilarModal({
  visible,
  onClose,
  entityType,
  entityId,
  categoryId,
}: FindSimilarModalProps) {
  const {
    activeTab,
    setActiveTab,
    wardrobeResults,
    sellableResults,
    onlineResults,
    loading,
    onlineSearched,
    handleOnlineTabPress,
    getItemImageUrl,
  } = useFindSimilar({
    visible,
    entityType,
    entityId,
    categoryId,
  });

  const renderResultItem = ({ item }: { item: any }) => {
    return <FindSimilarResultItem item={item} getItemImageUrl={getItemImageUrl} />;
  };

  const renderOnlineResultItem = ({ item }: { item: any }) => {
    return <FindSimilarOnlineResultItem item={item} />;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Find Similar</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>Close</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'wardrobe' && styles.tabActive]}
            onPress={() => setActiveTab('wardrobe')}
          >
            <Text
              style={[styles.tabText, activeTab === 'wardrobe' && styles.tabTextActive]}
            >
              My Wardrobe
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'sellable' && styles.tabActive]}
            onPress={() => setActiveTab('sellable')}
          >
            <Text
              style={[styles.tabText, activeTab === 'sellable' && styles.tabTextActive]}
            >
              Shop in App
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'online' && styles.tabActive]}
            onPress={handleOnlineTabPress}
          >
            <Text
              style={[styles.tabText, activeTab === 'online' && styles.tabTextActive]}
            >
              Search Online
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        )}

        {!loading && activeTab === 'wardrobe' && (
          <FlatList
            data={wardrobeResults}
            renderItem={renderResultItem}
            keyExtractor={(item) => ('id' in item.item ? item.item.id : 'unknown')}
            contentContainerStyle={styles.resultsList}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No similar items found in your wardrobe</Text>
              </View>
            }
          />
        )}

        {!loading && activeTab === 'sellable' && (
          <FlatList
            data={sellableResults}
            renderItem={renderResultItem}
            keyExtractor={(item) => ('id' in item.item ? item.item.id : 'unknown')}
            contentContainerStyle={styles.resultsList}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No similar items available in the app</Text>
              </View>
            }
          />
        )}

        {!loading && activeTab === 'online' && (
          <FlatList
            data={onlineResults}
            renderItem={renderOnlineResultItem}
            keyExtractor={(item, index) => item.url || `online-${index}`}
            contentContainerStyle={styles.resultsList}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {onlineSearched
                    ? 'No online results found'
                    : 'Tap "Search Online" to find similar items'}
                </Text>
              </View>
            }
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  tabTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsList: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
