/**
 * ProfileTabs Component
 * Tab navigation for headshots and bodyshots
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import PostGrid, { postGridStyles } from '@/components/social/PostGrid';
type TabType = 'headshots' | 'bodyshots';

interface ProfileTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  headshotImages: Array<{ id: string; url: string }>;
  bodyShotImages: Array<{ id: string; url: string }>;
  onHeadshotPress: (id: string) => void;
  onBodyShotPress: (id: string) => void;
  onNewHeadshot: () => void;
  onNewBodyShot: () => void;
}

export function ProfileTabs({
  activeTab,
  onTabChange,
  headshotImages,
  bodyShotImages,
  onHeadshotPress,
  onBodyShotPress,
  onNewHeadshot,
  onNewBodyShot,
}: ProfileTabsProps) {
  const renderTabBar = () => (
    <View style={styles.tabsContainer}>
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
      case 'headshots':
        return (
          <PostGrid
            data={[{ id: 'new' }, ...headshotImages]}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => {
              if (item.id === 'new') {
                return (
                  <TouchableOpacity
                    style={[postGridStyles.gridItem, styles.uploadCard]}
                    onPress={onNewHeadshot}
                  >
                    <View style={styles.uploadCardContent}>
                      <Ionicons name="add-circle-outline" size={48} color="#007AFF" />
                      <Text style={styles.uploadCardText}>New Headshot</Text>
                    </View>
                  </TouchableOpacity>
                );
              }

              const img = item as { id: string; url: string };
              return (
                <TouchableOpacity
                  style={postGridStyles.gridItem}
                  onPress={() => onHeadshotPress(img.id)}
                >
                  <ExpoImage
                    source={{ uri: img.url }}
                    style={postGridStyles.gridImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                </TouchableOpacity>
              );
            }}
          />
        );

      case 'bodyshots':
        return (
          <PostGrid
            data={[{ id: 'new' }, ...bodyShotImages]}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => {
              if (item.id === 'new') {
                return (
                  <TouchableOpacity
                    style={[postGridStyles.gridItem, styles.uploadCard]}
                    onPress={onNewBodyShot}
                  >
                    <View style={styles.uploadCardContent}>
                      <Ionicons name="add-circle-outline" size={48} color="#007AFF" />
                      <Text style={styles.uploadCardText}>New Body Shot</Text>
                    </View>
                  </TouchableOpacity>
                );
              }

              const img = item as { id: string; url: string };
              return (
                <TouchableOpacity
                  style={postGridStyles.gridItem}
                  onPress={() => onBodyShotPress(img.id)}
                >
                  <ExpoImage
                    source={{ uri: img.url }}
                    style={postGridStyles.gridImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                  />
                </TouchableOpacity>
              );
            }}
          />
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
  uploadCard: {
    backgroundColor: '#f9f9f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadCardContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  uploadCardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginTop: 8,
    textAlign: 'center',
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
