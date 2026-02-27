import React from 'react';
import { Text, TextInput, View } from 'react-native';
import { useThemeColors } from '@/contexts/ThemeContext';
import { createStyles } from '@/styles/hairAndMakeupStyles';
import { ADVANCED_FIELDS } from '@/lib/headshot/hairAndMakeupTypes';

type AdvancedFieldsPanelProps = {
  advancedFields: Record<string, string>;
  setAdvancedField: (id: string, value: string) => void;
};

export default function AdvancedFieldsPanel({
  advancedFields,
  setAdvancedField,
}: AdvancedFieldsPanelProps) {
  const colors = useThemeColors();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  return (
    <>
      {ADVANCED_FIELDS.map((field) => (
        <View key={field.id} style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>{field.label}</Text>
          <TextInput
            style={styles.advancedInput}
            placeholder={field.placeholder}
            placeholderTextColor={colors.textTertiary}
            multiline
            blurOnSubmit={false}
            value={advancedFields[field.id] || ''}
            onChangeText={(text) => setAdvancedField(field.id, text)}
          />
        </View>
      ))}
    </>
  );
}
