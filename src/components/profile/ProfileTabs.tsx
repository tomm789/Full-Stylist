/**
 * ProfileTabs Component
 * Tab navigation for posts, headshots, bodyshots
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { FeedItem } from '@/lib/posts';

type TabType = 'posts' | 'headshots' | 'bodyshots';

interface ProfileTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  posts: FeedItem[];
  postImages: Map<string, string | null>;
  headshotImages: Array<{ id: string; url: string }>;
  bodyShotImages: Array<{ id: string; url: string }>;
  onPostPress: (postId: string) => void;
  onHeadshotPress: (id: string) => void;
  onBodyShotPress: (id: string) => void;
  onNewHeadshot: () => void;
  onNewBodyShot: () => void;
}

export function ProfileTabs({
  activeTab,
  onTabChange,
  posts,
  postImages,
  headshotImages,
  bodyShotImages,
  onPostPress,
  onHeadshotPress,
  onBodyShotPress,
  onNewHeadshot,
  onNewBodyShot,
}: ProfileTabsProps) {
  const renderTabBar = () => (
    <View style={styles.tabsContainer}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
        onPress={() => onTabChange('posts')}
      >
        <Ionicons
          name="grid-outline"
          size={24}
          color={activeTab === 'posts' ? '#000' : '#999'}
        />
        <Text style={[styles.tabText, activeTab === 'posts' && styles.tabTextActive]}>
          Posts
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'headshots' && styles.tabActive]}
        onPress={() => onTabChange('headshots')}
      >
        <Ionicons
          name="person-outline"
          size={24}
          color={activeTab === 'headshots' ? '#000' : '#999'}
        />
        <Text style={[styles.tabText, activeTab === 'headshots' && styles.tabTextActive]}>
          Headshots
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'bodyshots' && styles.tabActive]}
        onPress={() => onTabChange('bodyshots')}
      >
        <Ionicons
          name="body-outline"
          size={24}
          color={activeTab === 'bodyshots' ? '#000' : '#999'}
        />
        <Text style={[styles.tabText, activeTab === 'bodyshots' && styles.tabTextActive]}>
          Body Shots
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'posts':
        return (
          <View style={styles.postsGrid}>
            {posts.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="images-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No posts yet</Text>
              </View>
            ) : (
              posts.map((item) => {
                const entity = item.entity?.outfit || item.entity?.lookbook;
                if (!entity) return null;

                const imageUrl = postImages.get(entity.id);

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.postGridItem}
                    onPress={() => onPostPress(item.id)}
                  >
                    {imageUrl ? (
                      <ExpoImage
                        source={{ uri: imageUrl }}
                        style={styles.postImage}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                      />
                    ) : (
                      <View style={styles.postImagePlaceholder}>
                        <Ionicons name="shirt-outline" size={32} color="#999" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        );

      case 'headshots':
        return (
          <View style={styles.imagesGrid}>
            <TouchableOpacity style={styles.uploadCard} onPress={onNewHeadshot}>
              <Ionicons name="add-circle-outline" size={48} color="#007AFF" />
              <Text style={styles.uploadCardText}>New Headshot</Text>
            </TouchableOpacity>
            {headshotImages.map((img) => (
              <TouchableOpacity
                key={img.id}
                style={styles.imageGridItem}
                onPress={() => onHeadshotPress(img.id)}
              >
                <ExpoImage
                  source={{ uri: img.url }}
                  style={styles.gridImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'bodyshots':
        return (
          <View style={styles.imagesGrid}>
            <TouchableOpacity style={styles.uploadCard} onPress={onNewBodyShot}>
              <Ionicons name="add-circle-outline" size={48} color="#007AFF" />
              <Text style={styles.uploadCardText}>New Body Shot</Text>
            </TouchableOpacity>
            {bodyShotImages.map((img) => (
              <TouchableOpacity
                key={img.id}
                style={styles.imageGridItem}
                onPress={() => onBodyShotPress(img.id)}
              >
                <ExpoImage
                  source={{ uri: img.url }}
                  style={styles.gridImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              </TouchableOpacity>
            ))}
          </View>
        );
    }
  };

  return (
    <>
      {renderTabBar()}
      <View style={styles.tabContent}>{renderContent()}</View>
    </>
  );
}

const styles = StyleSheet.create({
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#000',
  },
  tabText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#000',
    fontWeight: '600',
  },
  tabContent: {
    backgroundColor: '#fff',
    minHeight: 400,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  postGridItem: {
    width: '33.33%',
    aspectRatio: 3 / 4,
    padding: 1,
  },
  postImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  postImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 8,
  },
  uploadCard: {
    width: '31%',
    aspectRatio: 3 / 4,
    backgroundColor: '#f9f9f9',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  uploadCardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginTop: 8,
    textAlign: 'center',
  },
  imageGridItem: {
    width: '31%',
    aspectRatio: 3 / 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  emptyState: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
  },
});
