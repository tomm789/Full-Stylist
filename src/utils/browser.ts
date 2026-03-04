/**
 * In-App Browser
 * Opens external links inside the app using expo-web-browser.
 */

import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

/**
 * Opens a URL in the native in-app browser (SFSafariViewController on iOS,
 * Chrome Custom Tabs on Android, new tab on web).
 */
export async function openInAppBrowser(url: string): Promise<void> {
  if (Platform.OS === 'web') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }

  await WebBrowser.openBrowserAsync(url, {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.AUTOMATIC,
    dismissButtonStyle: 'close',
  });
}
