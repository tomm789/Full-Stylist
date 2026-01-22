import React, { useState, useEffect } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { getFeedbackThreads, FeedbackThread, FeedbackThreadFilters } from '@/lib/feedback';

// Helper function to format timestamps
const formatTimestamp = (timestamp: string): string => {
  const now = new Date();
  const posted = new Date(timestamp);
  const diffMs = now.getTime() - posted.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  if (posted.getFullYear() !== now.getFullYear()) {
    options.year = 'numeric';
  }
  return posted.toLocaleDateString('en-US', options);
};

const getCategoryColor = (category: string): string => {
  switch (category) {
    case 'bug':
      return '#ff3b30';
    case 'feature':
      return '#007AFF';
    case 'general':
      return '#34c759';
    case 'other':
      return '#8e8e93';
    default:
      return '#8e8e93';
  }
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'open':
      return '#007AFF';
    case 'in_progress':
      return '#ff9500';
    case 'resolved':
      return '#34c759';
    case 'closed':
      return '#8e8e93';
    default:
      return '#8e8e93';
  }
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'open':
      return 'Open';
    case 'in_progress':
      return 'In Progress';
    case 'resolved':
      return 'Resolved';
    case 'closed':
      return 'Closed';
    default:
      return status;
  }
};

export default function FeedbackListScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [threads, setThreads] = useState<FeedbackThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'bug' | 'feature' | 'general' | 'other' | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'open' | 'in_progress' | 'resolved' | 'closed' | 'all'>('all');

  useEffect(() => {
    if (user) {
      loadThreads();
    }
  }, [user, selectedCategory, selectedStatus]);

  const loadThreads = async () => {
    if (!user) return;

    setLoading(true);
    const filters: FeedbackThreadFilters = {};
    if (selectedCategory !== 'all') {
      filters.category = selectedCategory;
    }
    if (selectedStatus !== 'all') {
      filters.status = selectedStatus;
    }

    const { data, error } = await getFeedbackThreads(filters);
    if (data) {
      setThreads(data);
    }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadThreads();
    setRefreshing(false);
  };

  const renderThread = ({ item }: { item: FeedbackThread }) => {
    const categoryColor = getCategoryColor(item.category);
    const statusColor = getStatusColor(item.status);

    return (
      <TouchableOpacity
        style={styles.threadCard}
        onPress={() => router.push(`/feedback/${item.id}`)}
      >
        <View style={styles.threadHeader}>
          <View style={styles.threadTitleRow}>
            <Text style={styles.threadTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <View style={[styles.categoryBadge, { backgroundColor: categoryColor + '20' }]}>
              <Text style={[styles.categoryBadgeText, { color: categoryColor }]}>
                {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusBadgeText, { color: statusColor }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>

        <Text style={styles.threadBody} numberOfLines={3}>
          {item.body}
        </Text>

        <View style={styles.threadFooter}>
          <View style={styles.threadMeta}>
            <Text style={styles.threadAuthor}>
              {item.user?.display_name || item.user?.handle || 'User'}
            </Text>
            <Text style={styles.threadTime}>{formatTimestamp(item.created_at)}</Text>
          </View>
          <View style={styles.threadStats}>
            <Ionicons name="chatbubble-outline" size={16} color="#666" />
            <Text style={styles.threadCommentCount}>{item.comment_count || 0}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
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
        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
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

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Category:</Text>
          <View style={styles.filterButtons}>
            {['all', 'bug', 'feature', 'general', 'other'].map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.filterButton,
                  selectedCategory === cat && styles.filterButtonActive,
                ]}
                onPress={() => setSelectedCategory(cat as any)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    selectedCategory === cat && styles.filterButtonTextActive,
                  ]}
                >
                  {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Status:</Text>
          <View style={styles.filterButtons}>
            {['all', 'open', 'in_progress', 'resolved', 'closed'].map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterButton,
                  selectedStatus === status && styles.filterButtonActive,
                ]}
                onPress={() => setSelectedStatus(status as any)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    selectedStatus === status && styles.filterButtonTextActive,
                  ]}
                >
                  {status === 'all' ? 'All' : getStatusLabel(status)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {threads.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No feedback threads yet</Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => router.push('/feedback/new')}
          >
            <Text style={styles.emptyButtonText}>Create your first feedback thread</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={threads}
          renderItem={renderThread}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.threadsList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
  filtersContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
  },
  filterRow: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  threadsList: {
    padding: 16,
  },
  threadCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  threadHeader: {
    marginBottom: 8,
  },
  threadTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  threadTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginRight: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  threadBody: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  threadFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  threadMeta: {
    flex: 1,
  },
  threadAuthor: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  threadTime: {
    fontSize: 11,
    color: '#999',
  },
  threadStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  threadCommentCount: {
    fontSize: 12,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
