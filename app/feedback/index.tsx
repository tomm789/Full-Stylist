/**
 * Feedback List Screen (Refactored)
 * Browse and filter feedback threads
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFeedbackThreads } from '@/hooks/feedback';
import { FeedbackCard, FeedbackFilterBar } from '@/components/feedback';
import { LoadingSpinner, EmptyState } from '@/components/shared';

export default function FeedbackListScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<
    'bug' | 'feature' | 'general' | 'other' | 'all'
  >('all');
  const [selectedStatus, setSelectedStatus] = useState<
    'open' | 'in_progress' | 'resolved' | 'closed' | 'all'
  >('all');

  const { threads, loading, refresh } = useFeedbackThreads({
    category: selectedCategory,
    status: selectedStatus,
  });

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  if (loading && threads.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Feedback</Text>
          <TouchableOpacity onPress={() => router.push('/feedback/new')}>
            <Text style={styles.newButton}>+ New</Text>
          </TouchableOpacity>
        </View>
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Feedback</Text>
        <TouchableOpacity onPress={() => router.push('/feedback/new')}>
          <Text style={styles.newButton}>+ New</Text>
        </TouchableOpacity>
      </View>

      <FeedbackFilterBar
        selectedCategory={selectedCategory}
        selectedStatus={selectedStatus}
        onCategoryChange={setSelectedCategory}
        onStatusChange={setSelectedStatus}
      />

      {threads.length === 0 ? (
        <EmptyState
          icon="chatbubbles-outline"
          title="No feedback threads yet"
          actionLabel="Create your first feedback thread"
          onAction={() => router.push('/feedback/new')}
        />
      ) : (
        <FlatList
          data={threads}
          renderItem={({ item }) => (
            <FeedbackCard
              thread={item}
              onPress={() => router.push(`/feedback/${item.id}`)}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.threadsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  newButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  threadsList: {
    padding: 16,
  },
});
