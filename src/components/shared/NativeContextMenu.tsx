/**
 * NativeContextMenu
 * Wraps children with a native long-press context menu via @react-native-menu/menu.
 * Renders native UIMenu on iOS, PopupMenu on Android, no-op on web.
 */

import React from 'react';
import { Platform } from 'react-native';
import { MenuView, type MenuAction } from '@react-native-menu/menu';

export interface ContextMenuAction {
  id: string;
  title: string;
  /** SF Symbol name (iOS only) */
  image?: string;
  destructive?: boolean;
  disabled?: boolean;
}

interface NativeContextMenuProps {
  actions: ContextMenuAction[];
  onAction: (actionId: string) => void;
  children: React.ReactNode;
  title?: string;
}

export function NativeContextMenu({
  actions,
  onAction,
  children,
  title,
}: NativeContextMenuProps) {
  if (Platform.OS === 'web') {
    return <>{children}</>;
  }

  const menuActions: MenuAction[] = actions.map((a) => ({
    id: a.id,
    title: a.title,
    image: Platform.select({ ios: a.image, default: undefined }),
    attributes: {
      ...(a.destructive && { destructive: true }),
      ...(a.disabled && { disabled: true }),
    },
  }));

  return (
    <MenuView
      title={title}
      actions={menuActions}
      onPressAction={({ nativeEvent }) => onAction(nativeEvent.event)}
      shouldOpenOnLongPress
    >
      {children}
    </MenuView>
  );
}
