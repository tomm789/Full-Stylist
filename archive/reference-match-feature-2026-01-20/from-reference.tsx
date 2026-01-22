import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { triggerReferenceMatch, triggerAIJobExecution, pollAIJob } from '@/lib/ai-jobs';
import { saveOutfit } from '@/lib/outfits';
import { WardrobeItem, getWardrobeItemImages, uploadImageToStorage } from '@/lib/wardrobe';

interface MatchResult {
  category: string;
  items: Array<{
    wardrobe_item_id: string;
    score: number;
    reasons: string[];
  }>;
}

export default function FromReferenceScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [referenceImageUri, setReferenceImageUri] = useState<string | null>(null);
  const [referenceImageId, setReferenceImageId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [selectedItems, setSelectedItems] = useState<Map<string, string>>(new Map());
  const [itemImages, setItemImages] = useState<Map<string, string>>(new Map());
  const [saving, setSaving] = useState(false);

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setReferenceImageUri(result.assets[0].uri);
        await uploadReference(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error('Image pick error:', error);
      if (Platform.OS === 'web') {
        alert('Failed to pick image');
      } else {
        Alert.alert('Error', 'Failed to pick image');
      }
    }
  };

  const uploadReference = async (uri: string) => {
    if (!user) return;

    setUploading(true);
    try {
      // Convert URI to blob
      const response = await fetch(uri);
      const blob = await response.blob();

      // Upload to storage
      const uploadResult = await uploadImageToStorage(user.id, blob, `reference-${Date.now()}.jpg`);
      if (uploadResult.error) {
        throw uploadResult.error;
      }

      // Create image record
      const { data: imageRecord, error: imageError } = await supabase
        .from('images')
        .insert({
          owner_user_id: user.id,
          storage_bucket: 'media',
          storage_key: uploadResult.data!.path,
          mime_type: 'image/jpeg',
          source: 'upload',
        })
        .select()
        .single();

      if (imageError || !imageRecord) {
        throw imageError || new Error('Failed to create image record');
      }

      setReferenceImageId(imageRecord.id);
      console.log('Reference image uploaded:', imageRecord.id);
      
      if (Platform.OS === 'web') {
        alert('Reference image uploaded!');
      } else {
        Alert.alert('Success', 'Reference image uploaded!');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      if (Platform.OS === 'web') {
        alert(`Error: ${error.message || 'Failed to upload image'}`);
      } else {
        Alert.alert('Error', error.message || 'Failed to upload image');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!user || !referenceImageId) {
      if (Platform.OS === 'web') {
        alert('Please upload a reference image first');
      } else {
        Alert.alert('Error', 'Please upload a reference image first');
      }
      return;
    }

    setAnalyzing(true);
    try {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'from-reference.tsx:110',message:'Starting analysis',data:{userId:user.id,referenceImageId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      // Create reference_match job
      const { data: job, error } = await triggerReferenceMatch(user.id, referenceImageId);
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'from-reference.tsx:118',message:'Job created',data:{jobId:job?.id,hasError:!!error,error:error?.message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
      // #endregion

      if (error || !job) {
        throw new Error('Failed to create analysis job');
      }

      // Trigger execution
      await triggerAIJobExecution(job.id);
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'from-reference.tsx:130',message:'Job execution triggered',data:{jobId:job.id},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D'})}).catch(()=>{});
      // #endregion

      // Poll for completion (increased timeout for processing)
      const { data: completedJob, error: pollError } = await pollAIJob(job.id, 60, 2000);
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'from-reference.tsx:137',message:'Job polling complete',data:{status:completedJob?.status,hasPollError:!!pollError,pollError:pollError?.message,result:completedJob?.result,error:completedJob?.error},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'D,E'})}).catch(()=>{});
      // #endregion

      if (pollError || !completedJob) {
        throw new Error('Analysis timed out. Please try again.');
      }

      if (completedJob.status === 'failed') {
        throw new Error(`Analysis failed: ${completedJob.error || 'Unknown error'}`);
      }

      // Process results
      const result = completedJob.result;
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'from-reference.tsx:153',message:'Processing results',data:{hasResult:!!result,matches:result?.matches,matchCount:result?.matches?.length,debug:result?.debug,notes:result?.notes},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,C'})}).catch(()=>{});
      // #endregion
      
      console.log('Analysis result:', result);
      
      if (result.debug) {
        console.log('Debug info:', result.debug);
      }
      
      setMatches(result.matches || []);

      // Load images for matched items
      await loadItemImages(result.matches || []);
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'from-reference.tsx:164',message:'Images loaded',data:{imageCount:itemImages.size},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      console.log('Analysis complete! Found', result.matches?.length || 0, 'category matches');
      
      if (Platform.OS === 'web') {
        alert('Analysis complete! Review the matches below.');
      } else {
        Alert.alert('Success', 'Analysis complete! Review the matches below.');
      }
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'from-reference.tsx:171',message:'Error caught',data:{errorMessage:error?.message,errorStack:error?.stack},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,D'})}).catch(()=>{});
      // #endregion
      console.error('Analysis error:', error.message);
      
      if (Platform.OS === 'web') {
        alert(`Error: ${error.message || 'Failed to analyze reference'}`);
      } else {
        Alert.alert('Error', error.message || 'Failed to analyze reference');
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const loadItemImages = async (matchResults: MatchResult[]) => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'from-reference.tsx:145',message:'loadItemImages called',data:{matchResultsCount:matchResults.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    const imageMap = new Map<string, string>();

    for (const match of matchResults) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'from-reference.tsx:152',message:'Processing category',data:{category:match.category,itemCount:match.items.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      for (const item of match.items) {
        const { data: images } = await getWardrobeItemImages(item.wardrobe_item_id);
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'from-reference.tsx:159',message:'Item images fetched',data:{itemId:item.wardrobe_item_id,imageCount:images?.length||0},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        
        if (images && images.length > 0) {
          const imageData = images[0].image;
          if (imageData) {
            const { data: urlData } = supabase.storage
              .from(imageData.storage_bucket || 'media')
              .getPublicUrl(imageData.storage_key);
            imageMap.set(item.wardrobe_item_id, urlData.publicUrl);
          }
        }
      }
    }
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'from-reference.tsx:176',message:'All images loaded',data:{totalImages:imageMap.size,imageUrls:Array.from(imageMap.entries())},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    setItemImages(imageMap);
  };

  const toggleItemSelection = (category: string, itemId: string) => {
    setSelectedItems((prev) => {
      const updated = new Map(prev);
      if (updated.get(category) === itemId) {
        updated.delete(category);
      } else {
        updated.set(category, itemId);
      }
      return updated;
    });
  };

  const handleCreateOutfit = async () => {
    if (!user || selectedItems.size === 0) {
      if (Platform.OS === 'web') {
        alert('Please select at least one item');
      } else {
        Alert.alert('Error', 'Please select at least one item');
      }
      return;
    }

    setSaving(true);
    try {
      // Get category IDs for selected items
      const items: Array<{ category_id: string; wardrobe_item_id: string; position: number }> = [];
      
      for (const [categoryName, itemId] of selectedItems.entries()) {
        // Get the category ID from the wardrobe item
        const { data: item } = await supabase
          .from('wardrobe_items')
          .select('category_id')
          .eq('id', itemId)
          .single();

        if (item) {
          items.push({
            category_id: item.category_id,
            wardrobe_item_id: itemId,
            position: items.length,
          });
        }
      }

      // Create the outfit
      const { data, error } = await saveOutfit(
        user.id,
        {
          title: 'From Inspiration',
          notes: 'Created from reference image',
        },
        items
      );

      if (error) {
        throw error;
      }

      if (data && data.outfit.id) {
        if (Platform.OS === 'web') {
          alert('Outfit created!');
          router.replace(`/outfits/${data.outfit.id}`);
        } else {
          Alert.alert('Success', 'Outfit created!', [
            { text: 'OK', onPress: () => router.replace(`/outfits/${data.outfit.id}`) },
          ]);
        }
      }
    } catch (error: any) {
      console.error('Create outfit error:', error);
      if (Platform.OS === 'web') {
        alert(`Error: ${error.message || 'Failed to create outfit'}`);
      } else {
        Alert.alert('Error', error.message || 'Failed to create outfit');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(tabs)/wardrobe');
            }
          }} 
          style={styles.headerButton}
        >
          <Text style={styles.headerButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>Create Outfit from Inspiration</Text>
        <Text style={styles.subtitle}>
          Upload a reference image and we'll match items from your wardrobe
        </Text>

        {/* Reference Image Upload */}
        <View style={styles.section}>
          <Text style={styles.label}>Reference Image</Text>
          {referenceImageUri ? (
            <View style={styles.imageContainer}>
              <ExpoImage
                source={{ uri: referenceImageUri }}
                style={styles.referenceImage}
                contentFit="cover"
              />
              <TouchableOpacity
                style={styles.changeImageButton}
                onPress={handlePickImage}
                disabled={uploading}
              >
                <Text style={styles.changeImageButtonText}>Change Image</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.uploadButton}
              onPress={handlePickImage}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#007AFF" />
              ) : (
                <Text style={styles.uploadButtonText}>Upload Reference Image</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Analyze Button */}
        {referenceImageId && (
          <TouchableOpacity
            style={[styles.analyzeButton, analyzing && styles.buttonDisabled]}
            onPress={handleAnalyze}
            disabled={analyzing}
          >
            {analyzing ? (
              <>
                <ActivityIndicator color="#fff" />
                <Text style={[styles.analyzeButtonText, { marginLeft: 8 }]}>
                  Analyzing... (30-45s)
                </Text>
              </>
            ) : (
              <Text style={styles.analyzeButtonText}>Analyze & Match Items</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Matches */}
        {matches.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>Matches from Your Wardrobe</Text>
            <Text style={styles.hint}>Tap items to select them for your outfit</Text>

            {matches.map((match) => (
              <View key={match.category} style={styles.categorySection}>
                <Text style={styles.categoryTitle}>
                  {match.category} ({match.items.length} matches)
                </Text>

                {match.items.length === 0 ? (
                  <Text style={styles.noMatchesText}>No matches found</Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {match.items.map((item) => {
                      const isSelected = selectedItems.get(match.category) === item.wardrobe_item_id;
                      const imageUrl = itemImages.get(item.wardrobe_item_id);

                      return (
                        <TouchableOpacity
                          key={item.wardrobe_item_id}
                          style={[styles.matchItem, isSelected && styles.matchItemSelected]}
                          onPress={() => toggleItemSelection(match.category, item.wardrobe_item_id)}
                        >
                          {imageUrl && (
                            <ExpoImage
                              source={{ uri: imageUrl }}
                              style={styles.matchImage}
                              contentFit="cover"
                            />
                          )}
                          <View style={styles.matchInfo}>
                            <Text style={styles.matchScore}>
                              {Math.round(item.score * 100)}% match
                            </Text>
                            <Text style={styles.matchReasons} numberOfLines={2}>
                              {item.reasons.join(', ')}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Create Outfit Button */}
        {matches.length > 0 && selectedItems.size > 0 && (
          <TouchableOpacity
            style={[styles.createButton, saving && styles.buttonDisabled]}
            onPress={handleCreateOutfit}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.createButtonText}>
                Create Outfit ({selectedItems.size} items)
              </Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  headerButtonText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  imageContainer: {
    alignItems: 'center',
  },
  referenceImage: {
    width: '100%',
    height: 400,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    marginBottom: 12,
  },
  changeImageButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  changeImageButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    backgroundColor: '#f8f9ff',
  },
  uploadButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  analyzeButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  noMatchesText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  matchItem: {
    width: 120,
    marginRight: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  matchItemSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#f0f8ff',
  },
  matchImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#f0f0f0',
  },
  matchInfo: {
    padding: 8,
  },
  matchScore: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  matchReasons: {
    fontSize: 10,
    color: '#666',
  },
  createButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 40,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
