export interface LocalStorageWardrobeItem {
  id: number;
  name: string;
  b64: string;
  url?: string;
  category: string;
  group?: string;
  colorData?: any;
  tags?: string[];
  created_at?: string;
}

export interface LocalStorageOutfit {
  id: number;
  name: string;
  mannequinB64?: string;
  humanB64?: string;
  categories?: string[];
  lookbooks?: string[];
  items?: number[];
  created_at?: string;
}

export interface LocalStorageData {
  version?: number;
  wardrobe?: LocalStorageWardrobeItem[];
  outfits?: LocalStorageOutfit[];
  savedLooks?: any[];
  customCategories?: string[];
  customGroups?: string[];
  lookbooks?: any[];
  workspaceItems?: any[];
  preferences?: any;
}

export function readLocalStorageData(): LocalStorageData | null {
  const STORAGE_KEY = 'full_stylist_data';
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const data = JSON.parse(stored);
    return data as LocalStorageData;
  } catch (e) {
    console.error('Error reading from localStorage:', e);
    return null;
  }
}

export function disableLocalStorageWrites(): void {
  const IMPORT_FLAG_KEY = 'full_stylist_imported';
  localStorage.setItem(IMPORT_FLAG_KEY, 'true');
}

export function isLocalStorageImported(): boolean {
  const IMPORT_FLAG_KEY = 'full_stylist_imported';
  return localStorage.getItem(IMPORT_FLAG_KEY) === 'true';
}
