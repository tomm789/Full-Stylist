import React from 'react';
import { View, TouchableOpacity, type StyleProp, type ViewStyle, type ImageStyle } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ImagePlaceholder, WardrobeCategoryIcon } from '@/components/shared';
import { GRID_IMAGE_PROPS } from '@/lib/images';
import type { WardrobeCategory } from '@/lib/wardrobe';
import type { OutfitCanvasTrimStatus } from '@/lib/outfits/canvasLayout';

export interface SelectedItem {
  id: string;
  imageUrl: string | null;
  trimStatus: OutfitCanvasTrimStatus;
}

export interface PanelItemCardProps {
  item: SelectedItem;
  onRemove: (id: string) => void;
  cardStyle: StyleProp<ViewStyle>;
  placeholderIconSize: number;
  removeIconSize: number;
  imageStyle: StyleProp<ImageStyle>;
  placeholderStyle: StyleProp<ViewStyle>;
  removeButtonStyle: StyleProp<ViewStyle>;
  errorColor: string;
}

export function PanelItemCard({
  item,
  onRemove,
  cardStyle,
  placeholderIconSize,
  removeIconSize,
  imageStyle,
  placeholderStyle,
  removeButtonStyle,
  errorColor,
}: PanelItemCardProps) {
  return (
    <View style={cardStyle}>
      {item.imageUrl ? (
        <Image
          {...GRID_IMAGE_PROPS}
          source={{ uri: item.imageUrl }}
          style={imageStyle}
          recyclingKey={item.id}
        />
      ) : (
        <View style={placeholderStyle}>
          <ImagePlaceholder text="" iconSize={placeholderIconSize} />
        </View>
      )}
      <TouchableOpacity
        style={removeButtonStyle}
        onPress={() => onRemove(item.id)}
        hitSlop={{ top: 4, right: 4, bottom: 4, left: 4 }}
      >
        <Ionicons name="close-circle" size={removeIconSize} color={errorColor} />
      </TouchableOpacity>
    </View>
  );
}

export interface PanelCategoryCardProps {
  category: WardrobeCategory;
  isSelected: boolean;
  onPress: () => void;
  cardStyle: StyleProp<ViewStyle>;
  selectedStyle: StyleProp<ViewStyle>;
  iconSize: number;
  addIconSize: number;
  primaryColor: string;
  secondaryColor: string;
  blackColor: string;
  plusIconStyle: StyleProp<ViewStyle>;
  plusIconOverlayStyle: StyleProp<ViewStyle>;
}

export function PanelCategoryCard({
  category,
  isSelected,
  onPress,
  cardStyle,
  selectedStyle,
  iconSize,
  addIconSize,
  primaryColor,
  secondaryColor,
  blackColor,
  plusIconStyle,
  plusIconOverlayStyle,
}: PanelCategoryCardProps) {
  return (
    <TouchableOpacity
      style={[cardStyle, isSelected && selectedStyle]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <WardrobeCategoryIcon
        categoryName={category.name}
        size={iconSize}
        color={isSelected ? primaryColor : secondaryColor}
      />
      <View style={plusIconStyle}>
        <Ionicons
          name="add-circle"
          size={addIconSize}
          color={blackColor}
          style={plusIconOverlayStyle}
        />
      </View>
    </TouchableOpacity>
  );
}
