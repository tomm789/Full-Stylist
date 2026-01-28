/**
 * ItemAttributes Component
 * Display wardrobe item attributes and tags
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WardrobeItem } from '@/lib/wardrobe';

interface ItemAttributesProps {
  attributes: any[];
  tags: Array<{ id: string; name: string }>;
  item: WardrobeItem;
}

export function ItemAttributes({
  attributes,
  tags,
  item,
}: ItemAttributesProps) {
  if (attributes.length === 0 && tags.length === 0 && !item.size && !item.material) {
    return null;
  }

  const groupedAttributes = attributes.reduce((acc, attr) => {
    const key = attr.attribute_definitions?.key || attr.definition_id;
    if (!acc[key]) {
      acc[key] = {
        name:
          attr.attribute_definitions?.name ||
          attr.attribute_definitions?.key ||
          key,
        values: [] as string[],
      };
    }
    const value = attr.attribute_values?.value || attr.raw_value || '';
    if (value) {
      acc[key].values.push(value);
    }
    return acc;
  }, {} as Record<string, { name: string; values: string[] }>);

  return (
    <>
      {attributes.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Attributes</Text>
          <View style={styles.attributesList}>
            {Object.entries(groupedAttributes).map(([key, groupData]) => {
              const data = groupData as { name: string; values: string[] };
              return (
                <View key={key} style={styles.attributeItem}>
                  <Text style={styles.attributeKey}>{data.name}:</Text>
                  <Text style={styles.attributeValue}>
                    {data.values.join(', ')}
                  </Text>
                </View>
              );
            })}
            {item.size && (
              <View style={styles.attributeItem}>
                <Text style={styles.attributeKey}>Size:</Text>
                <Text style={styles.attributeValue}>
                  {typeof item.size === 'string'
                    ? item.size
                    : JSON.stringify(item.size)}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {tags.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tags</Text>
          <View style={styles.tagsList}>
            {tags.map((tag) => (
              <View key={tag.id} style={styles.tagPill}>
                <Text style={styles.tagText}>{tag.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {item.material && (
        <View style={styles.section}>
          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Material:</Text>
            <Text style={styles.metadataValue}>
              {typeof item.material === 'string'
                ? item.material
                : JSON.stringify(item.material)}
            </Text>
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  attributesList: {
    gap: 8,
  },
  attributeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  attributeKey: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  attributeValue: {
    fontSize: 14,
    color: '#000',
  },
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagPill: {
    backgroundColor: '#e0e0e0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagText: {
    fontSize: 12,
    color: '#333',
  },
  metadataRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  metadataLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    width: 80,
  },
  metadataValue: {
    fontSize: 14,
    color: '#000',
    flex: 1,
  },
});
