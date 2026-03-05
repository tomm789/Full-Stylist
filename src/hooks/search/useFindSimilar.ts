/**
 * useFindSimilar Hook
 * Manage find similar modal state and data loading
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  findSimilarInWardrobe,
  findSimilarSellable,
  searchOnlineSimilar,
  SimilarityResult,
} from '@/lib/similarity';
import { getWardrobeItemImages } from '@/lib/wardrobe';
import { supabase } from '@/lib/supabase';

type TabType = 'wardrobe' | 'sellable' | 'online';

interface UseFindSimilarProps {
  visible: boolean;
  entityType: 'wardrobe_item' | 'outfit';
  entityId: string;
  categoryId?: string;
}

interface UseFindSimilarReturn {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  wardrobeResults: SimilarityResult[];
  sellableResults: SimilarityResult[];
  onlineResults: any[];
  loading: boolean;
  onlineSearched: boolean;
  loadWardrobeSimilar: () => Promise<void>;
  loadSellableSimilar: () => Promise<void>;
  loadOnlineSimilar: () => Promise<void>;
  handleOnlineTabPress: () => void;
  getItemImageUrl: (itemId: string) => Promise<string | null>;
}

export function useFindSimilar({
  visible,
  entityType,
  entityId,
  categoryId,
}: UseFindSimilarProps): UseFindSimilarReturn {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('wardrobe');
  const [wardrobeResults, setWardrobeResults] = useState<SimilarityResult[]>([]);
  const [sellableResults, setSellableResults] = useState<SimilarityResult[]>([]);
  const [onlineResults, setOnlineResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [onlineSearched, setOnlineSearched] = useState(false);

  useEffect(() => {
    if (visible) {
      // Reset state when modal opens
      setActiveTab('wardrobe');
      setOnlineSearched(false);
      loadWardrobeSimilar();
    }
  }, [visible, entityId]);

  useEffect(() => {
    if (visible && activeTab === 'wardrobe') {
      loadWardrobeSimilar();
    } else if (visible && activeTab === 'sellable') {
      loadSellableSimilar();
    }
  }, [visible, activeTab]);

  const loadWardrobeSimilar = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    const { data } = await findSimilarInWardrobe(
      user.id,
      entityType,
      entityId,
      categoryId,
      20
    );
    if (data) {
      setWardrobeResults(data);
    }
    setLoading(false);
  }, [user, entityType, entityId, categoryId]);

  const loadSellableSimilar = useCallback(async () => {
    setLoading(true);
    const { data } = await findSimilarSellable(entityType, entityId, categoryId, 20);
    if (data) {
      setSellableResults(data);
    }
    setLoading(false);
  }, [entityType, entityId, categoryId]);

  const loadOnlineSimilar = useCallback(async () => {
    setLoading(true);
    const { data } = await searchOnlineSimilar(entityType, entityId, categoryId);
    if (data) {
      setOnlineResults(data);
      setOnlineSearched(true);
    }
    setLoading(false);
  }, [entityType, entityId, categoryId]);

  const handleOnlineTabPress = useCallback(() => {
    setActiveTab('online');
    if (!onlineSearched) {
      loadOnlineSimilar();
    }
  }, [onlineSearched, loadOnlineSimilar]);

  const getItemImageUrl = useCallback(async (itemId: string): Promise<string | null> => {
    const { data: images } = await getWardrobeItemImages(itemId);
    if (images && images.length > 0) {
      const img = images[0].image;
      const bucket = img?.storage_bucket || 'media';
      const key = img?.storage_key;
      if (!key) return null;
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(key);
      return urlData.publicUrl;
    }
    return null;
  }, []);

  return {
    activeTab,
    setActiveTab,
    wardrobeResults,
    sellableResults,
    onlineResults,
    loading,
    onlineSearched,
    loadWardrobeSimilar,
    loadSellableSimilar,
    loadOnlineSimilar,
    handleOnlineTabPress,
    getItemImageUrl,
  };
}
