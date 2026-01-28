/**
 * EditItemForm Component
 * Main form fields for editing wardrobe items
 */

import React from 'react';
import { View, Text, StyleSheet, TextInput } from 'react-native';

interface EditItemFormProps {
  title: string;
  description: string;
  brand: string;
  size: string;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
  onBrandChange: (brand: string) => void;
  onSizeChange: (size: string) => void;
}

export function EditItemForm({
  title,
  description,
  brand,
  size,
  onTitleChange,
  onDescriptionChange,
  onBrandChange,
  onSizeChange,
}: EditItemFormProps) {
  return (
    <View style={styles.container}>
      <View style={styles.field}>
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={onTitleChange}
          placeholder="Item title"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={onDescriptionChange}
          placeholder="Item description"
          placeholderTextColor="#999"
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Brand</Text>
        <TextInput
          style={styles.input}
          value={brand}
          onChangeText={onBrandChange}
          placeholder="Brand name"
          placeholderTextColor="#999"
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Size</Text>
        <TextInput
          style={styles.input}
          value={size}
          onChangeText={onSizeChange}
          placeholder="Size"
          placeholderTextColor="#999"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  field: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
});
