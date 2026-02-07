/**
 * FeedbackCard Component
 * Display feedback thread in list
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FeedbackThread } from '@/lib/feedback';

interface FeedbackCardProps {
  thread: FeedbackThread;
  onPress: () => void;
}

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

export function FeedbackCard({ thread, onPress }: FeedbackCardProps) {
  const categoryColor = getCategoryColor(thread.category);
  const statusColor = getStatusColor(thread.status);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={2}>
            {thread.title}
          </Text>
          <View style={styles.badges}>
            <View
              style={[styles.categoryBadge, { backgroundColor: categoryColor + '20' }]}
            >
              <Text style={[styles.categoryText, { color: categoryColor }]}>
                {thread.category.charAt(0).toUpperCase() + thread.category.slice(1)}
              </Text>
            </View>
            <View
              style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}
            >
              <Text style={[styles.statusText, { color: statusColor }]}>
                {getStatusLabel(thread.status)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <Text style={styles.body} numberOfLines={3}>
        {thread.body}
      </Text>

      <View style={styles.footer}>
        <View style={styles.meta}>
          <Text style={styles.author}>
            {thread.user?.display_name || thread.user?.handle || 'User'}
          </Text>
          <Text style={styles.time}>{formatTimestamp(thread.created_at)}</Text>
        </View>
        <View style={styles.stats}>
          <Ionicons name="chatbubble-outline" size={16} color="#666" />
          <Text style={styles.commentCount}>{thread.comment_count || 0}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  header: {
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
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
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  body: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  meta: {
    flex: 1,
  },
  author: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  time: {
    fontSize: 11,
    color: '#999',
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentCount: {
    fontSize: 12,
    color: '#666',
  },
});
