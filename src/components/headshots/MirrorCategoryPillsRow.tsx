import React from 'react';
import { ScrollView, View } from 'react-native';
import { PillButton } from '@/components/shared';
import { useThemeColors } from '@/contexts/ThemeContext';
import { createStyles } from '@/styles/hairAndMakeupStyles';
import type { EditTab } from '@/hooks/headshot';

type MirrorCategoryPillsRowProps = {
  editTab: EditTab;
  onSelectTab: (tab: EditTab) => void;
};

export default function MirrorCategoryPillsRow({
  editTab,
  onSelectTab,
}: MirrorCategoryPillsRowProps) {
  const colors = useThemeColors();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.pillRowStack}>
      <View style={styles.tabPills}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.tabPillsRow}>
            <PillButton
              label="Hair"
              icon="cut-outline"
              selected={editTab === 'hair'}
              onPress={() => onSelectTab('hair')}
              size="medium"
              variant="default"
              layout="vertical"
            />
            <PillButton
              label="Make-Up"
              icon="color-palette-outline"
              selected={editTab === 'makeup'}
              onPress={() => onSelectTab('makeup')}
              size="medium"
              variant="default"
              layout="vertical"
            />
            <PillButton
              label="Accessories"
              icon="glasses-outline"
              selected={editTab === 'accessories'}
              onPress={() => onSelectTab('accessories')}
              size="medium"
              variant="default"
              layout="vertical"
            />
            <PillButton
              label="Jewellery"
              icon="diamond-outline"
              selected={editTab === 'jewellery'}
              onPress={() => onSelectTab('jewellery')}
              size="medium"
              variant="default"
              layout="vertical"
            />
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
