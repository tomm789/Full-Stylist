import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import {
  findSimilarInWardrobe,
  findSimilarSellable,
  searchOnlineSimilar,
  SimilarityResult,
} from '@/lib/similarity';
import { getWardrobeItemImages } from '@/lib/wardrobe';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface FindSimilarModalProps {
  visible: boolean;
  onClose: () => void;
  entityType: 'wardrobe_item' | 'outfit';
  entityId: string;
  categoryId?: string;
}

type TabType = 'wardrobe' | 'sellable' | 'online';

// Result Item Component - must be a separate component to use hooks
interface ResultItemProps {
  item: SimilarityResult;
  getItemImageUrl: (itemId: string) => Promise<string | null>;
}

const ResultItem: React.FC<ResultItemProps> = ({ item, getItemImageUrl }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);

  useEffect(() => {
    if ('id' in item.item) {
      // WardrobeItem
      loadImage();
    }
  }, []);

  const loadImage = async () => {
    if ('id' in item.item) {
      const url = await getItemImageUrl(item.item.id);
      setImageUrl(url);
      setImageLoading(false);
    }
  };

  return (
    <View style={styles.resultCard}>
      {imageLoading ? (
        <View style={styles.resultImagePlaceholder}>
          <ActivityIndicator size="small" color="#007AFF" />
        </View>
      ) : imageUrl ? (
        <ExpoImage source={{ uri: imageUrl }} style={styles.resultImage} contentFit="cover" />
      ) : (
        <View style={styles.resultImagePlaceholder}>
          <Text style={styles.resultImagePlaceholderText}>No image</Text>
        </View>
      )}
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle} numberOfLines={1}>
          {'title' in item.item ? item.item.title : 'Item'}
        </Text>
        <Text style={styles.resultScore}>{Math.round(item.score)}% similar</Text>
        {item.matchingAttributes.length > 0 && (
          <Text style={styles.resultAttributes} numberOfLines={2}>
            {item.matchingAttributes.map((attr) => attr.value).join(', ')}
          </Text>
        )}
      </View>
    </View>
  );
};

export default function FindSimilarModal({
  visible,
  onClose,
  entityType,
  entityId,
  categoryId,
}: FindSimilarModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('wardrobe');
  const [wardrobeResults, setWardrobeResults] = useState<SimilarityResult[]>([]);
  const [sellableResults, setSellableResults] = useState<SimilarityResult[]>([]);
  const [onlineResults, setOnlineResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [onlineSearched, setOnlineSearched] = useState(false);

  useEffect(() => {
    if (visible) {
      // Reset state when modal opens
      setActiveTab('wardrobe');
      setOnlineSearched(false);
      loadWardrobeSimilar();
    }
  }, [visible, entityId]);

  useEffect(() => {
    if (visible && activeTab === 'wardrobe') {
      loadWardrobeSimilar();
    } else if (visible && activeTab === 'sellable') {
      loadSellableSimilar();
    }
  }, [visible, activeTab]);

  const loadWardrobeSimilar = async () => {
    if (!user) return;

    setLoading(true);
    const { data } = await findSimilarInWardrobe(
      user.id,
      entityType,
      entityId,
      categoryId,
      20
    );
    if (data) {
      setWardrobeResults(data);
    }
    setLoading(false);
  };

  const loadSellableSimilar = async () => {
    setLoading(true);
    const { data } = await findSimilarSellable(entityType, entityId, categoryId, 20);
    if (data) {
      setSellableResults(data);
    }
    setLoading(false);
  };

  const loadOnlineSimilar = async () => {
    setLoading(true);
    const { data } = await searchOnlineSimilar(entityType, entityId, categoryId);
    if (data) {
      setOnlineResults(data);
      setOnlineSearched(true);
    }
    setLoading(false);
  };

  const handleOnlineTabPress = () => {
    setActiveTab('online');
    if (!onlineSearched) {
      loadOnlineSimilar();
    }
  };

  const getItemImageUrl = async (itemId: string): Promise<string | null> => {
    const { data: images } = await getWardrobeItemImages(itemId);
    if (images && images.length > 0) {
      const { data: urlData } = supabase.storage
        .from(images[0].storage_bucket || 'media')
        .getPublicUrl(images[0].storage_key);
      return urlData.publicUrl;
    }
    return null;
  };

  const renderResultItem = ({ item }: { item: SimilarityResult }) => {
    return <ResultItem item={item} getItemImageUrl={getItemImageUrl} />;
  };

  const renderOnlineResultItem = ({ item }: { item: any }) => (
    <View style={styles.resultCard}>
      {item.imageUrl ? (
        <ExpoImage source={{ uri: item.imageUrl }} style={styles.resultImage} contentFit="cover" />
      ) : (
        <View style={styles.resultImagePlaceholder}>
          <Text style={styles.resultImagePlaceholderText}>No image</Text>
        </View>
      )}
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {item.price && <Text style={styles.resultPrice}>{item.price}</Text>}
        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => {
            // TODO: Open URL in browser
          }}
        >
          <Text style={styles.viewButtonText}>View</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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
  resultCard: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },
  resultImage: {
    width: 80,
    height: 80,
    backgroundColor: '#f0f0f0',
  },
  resultImagePlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultImagePlaceholderText: {
    color: '#999',
    fontSize: 12,
  },
  resultInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  resultScore: {
    fontSize: 12,
    color: '#007AFF',
    marginBottom: 4,
  },
  resultAttributes: {
    fontSize: 12,
    color: '#666',
  },
  resultPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  viewButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  viewButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
