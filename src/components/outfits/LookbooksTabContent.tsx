import React from 'react';
import { View, Text, ScrollView, FlatList as RNFlatList } from 'react-native';
import { LoadingSpinner, EmptyState } from '@/components/shared';
import { LookbookCard, SystemLookbookCard } from '@/components/lookbooks';

interface LookbooksTabContentProps {
  systemLookbooks: any[];
  sortedLookbooks: any[];
  lookbookThumbnails: Map<string, string | null>;
  lookbookLoadingIds: Set<string>;
  lookbooksLoading: boolean;
  allLookbooksEmpty: boolean;
  onScroll: (event: any) => void;
  onCreateLookbook: () => void;
  onNavigate: (path: string) => void;
  listBottomPadding: number;
  styles: any;
  commonStyles: any;
}

export default function LookbooksTabContent({
  systemLookbooks,
  sortedLookbooks,
  lookbookThumbnails,
  lookbookLoadingIds,
  lookbooksLoading,
  allLookbooksEmpty,
  onScroll,
  onCreateLookbook,
  onNavigate,
  listBottomPadding,
  styles,
  commonStyles,
}: LookbooksTabContentProps) {
  if (lookbooksLoading && sortedLookbooks.length === 0 && systemLookbooks.length === 0) {
    return (
      <View style={[commonStyles.container, styles.loadingContainer]}>
        <LoadingSpinner text="Loading lookbooks..." />
      </View>
    );
  }

  if (allLookbooksEmpty) {
    return (
      <View style={[commonStyles.container, styles.loadingContainer]}>
        <EmptyState
          icon="book-outline"
          title="Your lookbooks"
          message="Create your first lookbook to organize your outfits."
          actionLabel="Create lookbook"
          onAction={onCreateLookbook}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: listBottomPadding }}
      onScroll={onScroll}
      scrollEventThrottle={16}
    >
      {systemLookbooks.length > 0 && (
        <View style={styles.lookbookSection}>
          <Text style={styles.lookbookSectionTitle}>Highlights</Text>
          <RNFlatList
            horizontal
            data={systemLookbooks}
            renderItem={({ item }) => (
              <SystemLookbookCard
                lookbook={item}
                onPress={() => onNavigate(`/lookbooks/system-${item.category}`)}
                onPlayPress={() => {}}
              />
            )}
            keyExtractor={(item) => item.category}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.lookbookHorizontalList}
          />
        </View>
      )}

      <View style={styles.lookbookSection}>
        <View style={styles.lookbookSectionHeader}>
          <Text style={styles.lookbookSectionTitle}>My Lookbooks</Text>
          <Text style={styles.lookbookAddButton} onPress={() => onNavigate('/lookbooks/new')}>
            + New
          </Text>
        </View>

        <View style={styles.lookbookGrid}>
          {sortedLookbooks.map((lookbook) => (
            <LookbookCard
              key={lookbook.id}
              lookbook={lookbook}
              thumbnailUrl={lookbookThumbnails.get(lookbook.id) || null}
              loading={lookbookLoadingIds.has(lookbook.id)}
              onPress={() => onNavigate(`/lookbooks/${lookbook.id}`)}
              onPlayPress={() => onNavigate(`/lookbooks/${lookbook.id}`)}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
