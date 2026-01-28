/**
 * ThreadHeader Component
 * Header section for feedback thread
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { formatDistanceToNow } from 'date-fns';
import { FeedbackThread } from '@/lib/feedback';

const STATUS_COLORS = {
  open: '#007AFF',
  in_progress: '#ff9500',
  resolved: '#34c759',
  closed: '#8e8e93',
};

const CATEGORY_COLORS = {
  bug: '#ff3b30',
  feature: '#007AFF',
  general: '#34c759',
  other: '#8e8e93',
};

interface ThreadHeaderProps {
  thread: FeedbackThread;
  isOwner: boolean;
  onStatusChange: (status: 'open' | 'in_progress' | 'resolved' | 'closed') => void;
}

export function ThreadHeader({
  thread,
  isOwner,
  onStatusChange,
}: ThreadHeaderProps) {
  return (
    <View style={styles.threadHeader}>
      <View style={styles.threadBadges}>
        <View
          style={[
            styles.badge,
            { backgroundColor: CATEGORY_COLORS[thread.category] + '20' },
          ]}
        >
          <Text
            style={[styles.badgeText, { color: CATEGORY_COLORS[thread.category] }]}
          >
            {thread.category}
          </Text>
        </View>
        <View
          style={[
            styles.badge,
            { backgroundColor: STATUS_COLORS[thread.status] + '20' },
          ]}
        >
          <Text style={[styles.badgeText, { color: STATUS_COLORS[thread.status] }]}>
            {thread.status.replace('_', ' ')}
          </Text>
        </View>
      </View>

      <Text style={styles.threadTitle}>{thread.title}</Text>
      <Text style={styles.threadBody}>{thread.body}</Text>

      <View style={styles.threadMeta}>
        <Text style={styles.threadAuthor}>
          {thread.user?.display_name || thread.user?.handle || 'Unknown'}
        </Text>
        <Text style={styles.threadTime}>
          {formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}
        </Text>
      </View>

      {/* Status Changer (Owner Only) */}
      {isOwner && (
        <View style={styles.statusChanger}>
          <Text style={styles.statusLabel}>Change Status:</Text>
          <View style={styles.statusButtons}>
            {(['open', 'in_progress', 'resolved', 'closed'] as const).map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.statusButton,
                  thread.status === status && styles.statusButtonActive,
                  {
                    borderColor: STATUS_COLORS[status],
                    backgroundColor:
                      thread.status === status ? STATUS_COLORS[status] : 'transparent',
                  },
                ]}
                onPress={() => onStatusChange(status)}
              >
                <Text
                  style={[
                    styles.statusButtonText,
                    thread.status === status && styles.statusButtonTextActive,
                    {
                      color: thread.status === status ? '#fff' : STATUS_COLORS[status],
                    },
                  ]}
                >
                  {status.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  threadHeader: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  threadBadges: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  threadTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    color: '#000',
  },
  threadBody: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 16,
  },
  threadMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  threadAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  threadTime: {
    fontSize: 12,
    color: '#999',
  },
  statusChanger: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000',
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusButtonActive: {
    borderWidth: 0,
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statusButtonTextActive: {
    color: '#fff',
  },
});
