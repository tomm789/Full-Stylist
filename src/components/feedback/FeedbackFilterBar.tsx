/**
 * FeedbackFilterBar Component
 * Category and status filters for feedback threads
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface FeedbackFilterBarProps {
  selectedCategory: 'bug' | 'feature' | 'general' | 'other' | 'all';
  selectedStatus: 'open' | 'in_progress' | 'resolved' | 'closed' | 'all';
  onCategoryChange: (category: 'bug' | 'feature' | 'general' | 'other' | 'all') => void;
  onStatusChange: (status: 'open' | 'in_progress' | 'resolved' | 'closed' | 'all') => void;
}

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'in_progress':
      return 'In Progress';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
};

export function FeedbackFilterBar({
  selectedCategory,
  selectedStatus,
  onCategoryChange,
  onStatusChange,
}: FeedbackFilterBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Category:</Text>
        <View style={styles.filterButtons}>
          {(['all', 'bug', 'feature', 'general', 'other'] as const).map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.filterButton,
                selectedCategory === cat && styles.filterButtonActive,
              ]}
              onPress={() => onCategoryChange(cat)}
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
          {(['all', 'open', 'in_progress', 'resolved', 'closed'] as const).map(
            (status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterButton,
                  selectedStatus === status && styles.filterButtonActive,
                ]}
                onPress={() => onStatusChange(status)}
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
            )
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
});
