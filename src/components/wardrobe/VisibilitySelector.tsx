/**
 * VisibilitySelector Component
 * Collapsible dropdown for selecting item visibility
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type VisibilityType = 'public' | 'followers' | 'private_link' | 'private' | 'inherit';

interface VisibilitySelectorProps {
  value: VisibilityType;
  onChange: (value: VisibilityType) => void;
  expanded: boolean;
  onToggleExpanded: () => void;
  showInherit?: boolean;
}

const VISIBILITY_OPTIONS: Array<{ value: VisibilityType; label: string; description: string }> = [
  { value: 'public', label: 'Public', description: 'Anyone can see' },
  { value: 'followers', label: 'Followers', description: 'Only followers can see' },
  { value: 'private_link', label: 'Private Link', description: 'Anyone with link can see' },
  { value: 'private', label: 'Private', description: 'Only you can see' },
  { value: 'inherit', label: 'Inherit', description: 'Use default setting' },
];

export const VisibilitySelector = ({
  value,
  onChange,
  expanded,
  onToggleExpanded,
  showInherit = true,
}: VisibilitySelectorProps) => {
  const options = showInherit ? VISIBILITY_OPTIONS : VISIBILITY_OPTIONS.filter(o => o.value !== 'inherit');
  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Visibility</Text>
      <TouchableOpacity
        style={styles.selector}
        onPress={onToggleExpanded}
      >
        <View style={styles.selectedValue}>
          <Text style={styles.selectedText}>{selectedOption.label}</Text>
          <Text style={styles.descriptionText}>{selectedOption.description}</Text>
        </View>
        <Ionicons 
          name={expanded ? 'chevron-up' : 'chevron-down'} 
          size={20} 
          color="#999" 
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.dropdown}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.option,
                value === option.value && styles.optionSelected,
              ]}
              onPress={() => {
                onChange(option.value);
                onToggleExpanded();
              }}
            >
              <View style={styles.optionContent}>
                <Text style={[
                  styles.optionLabel,
                  value === option.value && styles.optionLabelSelected,
                ]}>
                  {option.label}
                </Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </View>
              {value === option.value && (
                <Ionicons name="checkmark" size={20} color="#007AFF" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
  },
  selectedValue: {
    flex: 1,
  },
  selectedText: {
    fontSize: 16,
    color: '#000',
    marginBottom: 2,
  },
  descriptionText: {
    fontSize: 12,
    color: '#666',
  },
  dropdown: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  optionSelected: {
    backgroundColor: '#f0f8ff',
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    color: '#000',
    marginBottom: 2,
  },
  optionLabelSelected: {
    fontWeight: '600',
    color: '#007AFF',
  },
  optionDescription: {
    fontSize: 12,
    color: '#666',
  },
});
