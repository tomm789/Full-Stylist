import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { supabase } from '@/lib/supabase';
import { getOutfit } from '@/lib/outfits';
import { getOutfitCoverImageUrl } from '@/lib/images';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ExplorePost = {
  postId: string;
  outfitId: string;
  imageUrl: string | null;
};

export default function ExploreScreen() {
  const router = useRouter();
  const [items, setItems] = useState<ExplorePost[]>([]);
  const [loading, setLoading] = useState(true);

  const cardSize = useMemo(() => {
    const gap = 8;
    return (SCREEN_WIDTH - gap * 4) / 3;
  }, []);

  useEffect(() => {
    const loadExplore = async () => {
      setLoading(true);
      const { data: posts, error } = await supabase
        .from('posts')
        .select('id, entity_id, entity_type, created_at')
        .eq('visibility', 'public')
        .eq('entity_type', 'outfit')
        .order('created_at', { ascending: false })
        .limit(60);

      if (!error && posts) {
        const outfits = await Promise.all(
          posts.map(async (post) => {
            const { data: outfit } = await getOutfit(post.entity_id);
            if (!outfit) {
              return null;
            }
            const imageUrl = await getOutfitCoverImageUrl(outfit);
            return {
              postId: post.id,
              outfitId: post.entity_id,
              imageUrl,
            } satisfies ExplorePost;
          })
        );
        setItems(outfits.filter((item): item is ExplorePost => Boolean(item)));
      }

      setLoading(false);
    };

    loadExplore();
  }, []);

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.postId}
          numColumns={3}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, { width: cardSize, height: cardSize * 1.4 }]}
              onPress={() => router.push(`/outfits/${item.outfitId}/view`)}
            >
              {item.imageUrl ? (
                <ExpoImage source={{ uri: item.imageUrl }} style={styles.image} contentFit="cover" />
              ) : (
                <View style={[styles.image, styles.imagePlaceholder]} />
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grid: {
    padding: 8,
  },
  columnWrapper: {
    gap: 8,
  },
  card: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f3f3f3',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    backgroundColor: '#e5e5e5',
  },
});
