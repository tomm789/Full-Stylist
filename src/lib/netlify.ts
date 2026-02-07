import Constants from 'expo-constants';
import { NativeModules } from 'react-native';

const LOCALHOST_RE = /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i;

function isDevEnv(): boolean {
  return (
    (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') ||
    (typeof __DEV__ !== 'undefined' && (__DEV__ as boolean) === true)
  );
}

function inferDevUrlFromMetro(): string | null {
  const scriptURL = NativeModules?.SourceCode?.scriptURL;
  if (scriptURL) {
    // scriptURL usually looks like http://192.168.0.145:8081/index.bundle
    const match = scriptURL.match(/^(https?:\/\/)([^/:]+)(?::\d+)?/i);
    if (match) {
      const protocol = match[1];
      const host = match[2];
      return `${protocol}${host}:8888`;
    }
  }

  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as any)?.manifest?.hostUri ||
    (Constants as any)?.manifest2?.extra?.expoClient?.hostUri ||
    (Constants as any)?.manifest?.debuggerHost ||
    '';

  if (!hostUri || typeof hostUri !== 'string') return null;

  // hostUri can be "192.168.0.145:8081" or "exp://192.168.0.145:8081"
  const normalized = hostUri.replace(/^exp:\/\//i, '').replace(/^http:\/\//i, '').replace(/^https:\/\//i, '');
  const host = normalized.split(':')[0];
  if (!host) return null;

  return `http://${host}:8888`;
}

export function resolveNetlifyBaseUrl(): {
  baseUrl: string;
  isDev: boolean;
  inferredFromMetro: boolean;
} {
  const isDev = isDevEnv();

  const devUrlEnv =
    typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_NETLIFY_DEV_URL || '' : '';
  const prodUrlEnv =
    typeof process !== 'undefined' ? process.env.EXPO_PUBLIC_NETLIFY_URL || '' : '';

  let baseUrl = '';

  if (isDev && devUrlEnv) {
    baseUrl = devUrlEnv;
  } else if (prodUrlEnv) {
    baseUrl = prodUrlEnv;
  }

  let inferredFromMetro = false;
  if (isDev && (!baseUrl || LOCALHOST_RE.test(baseUrl))) {
    const inferred = inferDevUrlFromMetro();
    if (inferred) {
      baseUrl = inferred;
      inferredFromMetro = true;
    }
  }

  if (!baseUrl && !isDev) {
    if (typeof window !== 'undefined' && window.location) {
      baseUrl = window.location.origin;
    }
  }

  return { baseUrl, isDev, inferredFromMetro };
}
