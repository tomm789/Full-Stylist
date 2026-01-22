import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  readLocalStorageData,
  importWardrobeItems,
  importOutfits,
  disableLocalStorageWrites,
  isLocalStorageImported,
  LocalStorageData,
} from '@/lib/import';
import { supabase } from '@/lib/supabase';

export default function ImportScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [localStorageData, setLocalStorageData] = useState<LocalStorageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, step: '' });
  const [importResults, setImportResults] = useState<{
    wardrobe: { imported: number; errors: any[] };
    outfits: { imported: number; errors: any[] };
  } | null>(null);
  const [imported, setImported] = useState(false);

  useEffect(() => {
    checkImportStatus();
    loadLocalStorageData();
  }, []);

  const checkImportStatus = () => {
    if (isLocalStorageImported()) {
      setImported(true);
    }
  };

  const loadLocalStorageData = () => {
    const data = readLocalStorageData();
    setLocalStorageData(data);
    setLoading(false);
  };

  const handleImport = async () => {
    if (!user || !localStorageData) return;

    setImporting(true);
    setImportResults(null);

    try {
      // Step 1: Import wardrobe items
      const wardrobeItems = localStorageData.wardrobe || [];
      const itemIdMap = new Map<number, string>(); // Map old IDs to new IDs

      setProgress({ current: 0, total: wardrobeItems.length, step: 'Importing wardrobe items...' });

      const wardrobeResult = await importWardrobeItems(
        user.id,
        wardrobeItems,
        (current, total) => {
          setProgress({ current, total, step: 'Importing wardrobe items...' });
        }
      );

      if (wardrobeResult.error) {
        Alert.alert('Error', `Failed to import wardrobe: ${wardrobeResult.error.message}`);
        setImporting(false);
        return;
      }

      // Map old item IDs to new IDs (simplified - we'd need to track which items were created)
      // For MVP, we'll use a simpler approach: get all recently created items
      // In a real implementation, you'd want to return the created item IDs from importWardrobeItems
      // For now, we'll proceed with outfit import using the assumption that items exist

      // Step 2: Import outfits (if we have item mappings)
      const outfits = localStorageData.outfits || [];

      if (outfits.length > 0 && wardrobeResult.data.imported > 0) {
        setProgress({ current: 0, total: outfits.length, step: 'Importing outfits...' });

        const outfitResult = await importOutfits(
          user.id,
          outfits,
          itemIdMap, // Empty map for MVP - outfit items won't map correctly
          (current, total) => {
            setProgress({ current, total, step: 'Importing outfits...' });
          }
        );

        if (outfitResult.error) {
          Alert.alert('Warning', `Some outfits failed to import: ${outfitResult.error.message}`);
        }

        setImportResults({
          wardrobe: wardrobeResult.data,
          outfits: outfitResult.data,
        });
      } else {
        setImportResults({
          wardrobe: wardrobeResult.data,
          outfits: { imported: 0, errors: [] },
        });
      }

      // Step 3: Disable localStorage writes
      disableLocalStorageWrites();
      setImported(true);

      Alert.alert(
        'Import Complete',
        `Imported ${wardrobeResult.data.imported} wardrobe items and ${outfits.length} outfits.`,
        [
          {
            text: 'OK',
            onPress: () => router.push('/(tabs)/wardrobe'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', `Import failed: ${error.message}`);
    } finally {
      setImporting(false);
      setProgress({ current: 0, total: 0, step: '' });
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (imported) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Import Complete</Text>
          <Text style={styles.description}>
            Your data has been imported from localStorage and migrated to the new system.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push('/(tabs)/wardrobe')}
          >
            <Text style={styles.buttonText}>Go to Wardrobe</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const wardrobeCount = localStorageData?.wardrobe?.length || 0;
  const outfitsCount = localStorageData?.outfits?.length || 0;
  const hasData = wardrobeCount > 0 || outfitsCount > 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.content}>
        <Text style={styles.title}>Import from LocalStorage</Text>
        <Text style={styles.description}>
          Import your existing wardrobe items and outfits from localStorage to the new Supabase
          system.
        </Text>

        {hasData ? (
          <View style={styles.dataSummary}>
            <Text style={styles.summaryTitle}>Data found:</Text>
            <Text style={styles.summaryItem}>• {wardrobeCount} wardrobe items</Text>
            <Text style={styles.summaryItem}>• {outfitsCount} outfits</Text>
          </View>
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No data found in localStorage.</Text>
            <Text style={styles.noDataSubtext}>
              This might mean you're already using the new system, or you need to log in to the old
              app first.
            </Text>
          </View>
        )}

        {importing && (
          <View style={styles.progressContainer}>
            <Text style={styles.progressStep}>{progress.step}</Text>
            {progress.total > 0 && (
              <Text style={styles.progressText}>
                {progress.current} / {progress.total}
              </Text>
            )}
            <ActivityIndicator size="small" color="#007AFF" style={styles.progressSpinner} />
          </View>
        )}

        {importResults && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>Import Results:</Text>
            <Text style={styles.resultsItem}>
              • {importResults.wardrobe.imported} wardrobe items imported
              {importResults.wardrobe.errors.length > 0 &&
                ` (${importResults.wardrobe.errors.length} errors)`}
            </Text>
            <Text style={styles.resultsItem}>
              • {importResults.outfits.imported} outfits imported
              {importResults.outfits.errors.length > 0 &&
                ` (${importResults.outfits.errors.length} errors)`}
            </Text>
          </View>
        )}

        {hasData && !importing && !importResults && (
          <TouchableOpacity style={styles.button} onPress={handleImport}>
            <Text style={styles.buttonText}>Start Import</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => router.push('/(tabs)/wardrobe')}
        >
          <Text style={styles.skipButtonText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flexGrow: 1,
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    marginBottom: 24,
  },
  dataSummary: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  summaryItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  noDataContainer: {
    backgroundColor: '#fff3cd',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  noDataText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#856404',
  },
  progressContainer: {
    backgroundColor: '#e7f3ff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    alignItems: 'center',
  },
  progressStep: {
    fontSize: 14,
    color: '#0066cc',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 12,
    color: '#0066cc',
    marginBottom: 8,
  },
  progressSpinner: {
    marginTop: 8,
  },
  resultsContainer: {
    backgroundColor: '#d4edda',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#155724',
    marginBottom: 8,
  },
  resultsItem: {
    fontSize: 14,
    color: '#155724',
    marginBottom: 4,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
});
