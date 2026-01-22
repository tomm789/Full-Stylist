import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
  FlatList,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/AuthContext';
import { getUserProfile, updateUserProfile, getFullUserProfile } from '@/lib/user';
import { getUserSettings, updateUserSettings } from '@/lib/settings';
import { getFeed, FeedItem } from '@/lib/posts';
import { getOutfitCoverImageUrl } from '@/lib/images';
import { uploadImageToStorage } from '@/lib/wardrobe';
import { supabase } from '@/lib/supabase';

type TabType = 'posts' | 'headshots' | 'bodyshots';

export default function ProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [posts, setPosts] = useState<FeedItem[]>([]);
  const [postImagesCache, setPostImagesCache] = useState<Map<string, string | null>>(new Map());
  const [headshotImages, setHeadshotImages] = useState<Array<{ id: string; url: string }>>([]);
  const [bodyShotImages, setBodyShotImages] = useState<Array<{ id: string; url: string }>>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Reload profile images when screen comes into focus (e.g., after creating a new headshot)
  useFocusEffect(
    React.useCallback(() => {
      if (user && !loading) {
        loadProfileImages();
      }
    }, [user, loading, activeTab])
  );

  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    
    try {
      // Load full profile with stats
      const { data: profileData } = await getFullUserProfile(user.id);
      if (profileData) {
        setProfile(profileData);
        setHandle(profileData.handle || '');
        setDisplayName(profileData.display_name || '');
      }

      // Load settings
      const { data: settingsData } = await getUserSettings(user.id);
      setSettings(settingsData);

      // Load user posts
      const { data: feedData } = await getFeed(user.id, 50, 0);
      if (feedData) {
        const userPosts = feedData.filter((item) => {
          const post = item.type === 'post' ? item.post : item.repost?.original_post;
          return post?.owner_user_id === user.id;
        });
        
        setPosts(userPosts);

        // Cache images for outfit posts
        const imageCache = new Map<string, string | null>();
        for (const item of userPosts) {
          if (item.entity?.outfit) {
            const outfitId = item.entity.outfit.id;
            const url = await getOutfitCoverImageUrl(item.entity.outfit);
            imageCache.set(outfitId, url);
          }
        }
        setPostImagesCache(imageCache);
      }

      // Load headshot and body shot images
      await loadProfileImages();
    } catch (error) {
      console.error('Error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProfileImages = async () => {
    if (!user) return;

    try {
      // Load all user images
      const { data: allImages } = await supabase
        .from('images')
        .select('id, storage_bucket, storage_key, created_at')
        .eq('owner_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (allImages) {
        // Filter for headshots
        const headshotImgs = allImages.filter(img => img.storage_key?.includes('/ai/headshots/'));
        const headshotsWithUrls = headshotImgs.map((img) => {
          const { data } = supabase.storage
            .from(img.storage_bucket)
            .getPublicUrl(img.storage_key);
          return { id: img.id, url: data.publicUrl };
        });
        setHeadshotImages(headshotsWithUrls);
        
        // Filter for body shots
        const bodyShotImgs = allImages.filter(img => img.storage_key?.includes('/ai/body_shots/'));
        const bodyShotsWithUrls = bodyShotImgs.map((img) => {
          const { data } = supabase.storage
            .from(img.storage_bucket)
            .getPublicUrl(img.storage_key);
          return { id: img.id, url: data.publicUrl };
        });
        setBodyShotImages(bodyShotsWithUrls);
      }
    } catch (error) {
      console.error('Error loading profile images:', error);
    }
  };

  const validateHandle = (h: string): boolean => {
    const handleRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return handleRegex.test(h);
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    if (!handle.trim()) {
      Alert.alert('Error', 'Please enter a handle');
      return;
    }

    if (!validateHandle(handle.trim())) {
      Alert.alert(
        'Invalid Handle',
        'Handle must be 3-20 characters and contain only letters, numbers, and underscores'
      );
      return;
    }

    if (!displayName.trim()) {
      Alert.alert('Error', 'Please enter a display name');
      return;
    }

    setSavingProfile(true);

    try {
      const { error } = await updateUserProfile(user.id, {
        handle: handle.trim(),
        display_name: displayName.trim(),
      });

      if (error) {
        if (error.code === '23505') {
          Alert.alert('Error', 'This handle is already taken. Please choose another.');
        } else {
          Alert.alert('Error', error.message || 'Failed to save profile');
        }
      } else {
        Alert.alert('Success', 'Profile updated successfully');
        setShowEditModal(false);
        await loadData();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUploadAvatar = async () => {
    if (!user || !settings) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions');
      return;
    }

    const mediaTypes = (ImagePicker as any).MediaType?.Images || 'images';

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    setUploadingImage(true);
    try {
      const response = await fetch(result.assets[0].uri);
      const blob = await response.blob();

      const uploadResult = await uploadImageToStorage(user.id, blob, `avatar-${Date.now()}.jpg`);
      if (uploadResult.error) throw uploadResult.error;

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

      if (imageError || !imageRecord) throw imageError || new Error('Failed to create image record');

      // Update avatar in settings
      const { error: updateError } = await updateUserSettings(user.id, {
        headshot_image_id: imageRecord.id,
      } as any);

      if (updateError) throw updateError;

      Alert.alert('Success', 'Avatar updated successfully');
      await loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to upload avatar');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleNewHeadshot = () => {
    router.push('/headshot/new' as any);
  };

  const handleUploadBodyShot = () => {
    router.push('/bodyshot/new' as any);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.warningText}>
          Complete your profile to access all features
        </Text>
      </ScrollView>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'posts':
        return (
          <View style={styles.postsGrid}>
            {posts.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="images-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No posts yet</Text>
              </View>
            ) : (
              posts.map((item) => {
                const entity = item.entity?.outfit || item.entity?.lookbook;
                if (!entity) return null;

                const imageUrl = postImagesCache.get(entity.id);

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.postGridItem}
                    onPress={() => router.push(`/users/${user?.id}/feed?postId=${item.id}`)}
                  >
                    {imageUrl ? (
                      <ExpoImage
                        source={{ uri: imageUrl }}
                        style={styles.postImage}
                        contentFit="cover"
                        cachePolicy="memory-disk"
                      />
                    ) : (
                      <View style={styles.postImagePlaceholder}>
                        <Ionicons name="shirt-outline" size={32} color="#999" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        );

      case 'headshots':
        return (
          <View style={styles.imagesGrid}>
            <TouchableOpacity style={styles.uploadCard} onPress={handleNewHeadshot}>
              <Ionicons name="add-circle-outline" size={48} color="#007AFF" />
              <Text style={styles.uploadCardText}>New Headshot</Text>
            </TouchableOpacity>
            {headshotImages.map((img) => (
              <TouchableOpacity
                key={img.id}
                style={styles.imageGridItem}
                onPress={() => router.push(`/headshot/${img.id}` as any)}
              >
                <ExpoImage
                  source={{ uri: img.url }}
                  style={styles.gridImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'bodyshots':
        return (
          <View style={styles.imagesGrid}>
            <TouchableOpacity style={styles.uploadCard} onPress={handleUploadBodyShot}>
              <Ionicons name="add-circle-outline" size={48} color="#007AFF" />
              <Text style={styles.uploadCardText}>New Body Shot</Text>
            </TouchableOpacity>
            {bodyShotImages.map((img) => (
              <TouchableOpacity
                key={img.id}
                style={styles.imageGridItem}
                onPress={() => router.push(`/bodyshot/${img.id}` as any)}
              >
                <ExpoImage
                  source={{ uri: img.url }}
                  style={styles.gridImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              </TouchableOpacity>
            ))}
          </View>
        );
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <View style={styles.avatarContainer}>
          {profile.headshot_image_url ? (
            <ExpoImage
              source={{ uri: profile.headshot_image_url }}
              style={styles.avatar}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <Ionicons name="person-circle-outline" size={100} color="#999" />
          )}
        </View>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setShowEditModal(true)}
        >
          <Ionicons name="create-outline" size={20} color="#007AFF" />
        </TouchableOpacity>

        <Text style={styles.displayName}>{profile.display_name}</Text>
        <Text style={styles.handle}>@{profile.handle}</Text>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.stats?.posts || 0}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.stats?.followers || 0}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile.stats?.following || 0}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'posts' && styles.tabActive]}
          onPress={() => setActiveTab('posts')}
        >
          <Ionicons
            name="grid-outline"
            size={24}
            color={activeTab === 'posts' ? '#000' : '#999'}
          />
          <Text style={[styles.tabText, activeTab === 'posts' && styles.tabTextActive]}>
            Posts
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'headshots' && styles.tabActive]}
          onPress={() => setActiveTab('headshots')}
        >
          <Ionicons
            name="person-outline"
            size={24}
            color={activeTab === 'headshots' ? '#000' : '#999'}
          />
          <Text style={[styles.tabText, activeTab === 'headshots' && styles.tabTextActive]}>
            Headshots
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'bodyshots' && styles.tabActive]}
          onPress={() => setActiveTab('bodyshots')}
        >
          <Ionicons
            name="body-outline"
            size={24}
            color={activeTab === 'bodyshots' ? '#000' : '#999'}
          />
          <Text style={[styles.tabText, activeTab === 'bodyshots' && styles.tabTextActive]}>
            Body Shots
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {renderTabContent()}
      </View>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowEditModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <TouchableOpacity
                style={styles.avatarEditButton}
                onPress={handleUploadAvatar}
                disabled={uploadingImage}
              >
                {profile.headshot_image_url ? (
                  <ExpoImage
                    source={{ uri: profile.headshot_image_url }}
                    style={styles.avatarEdit}
                    contentFit="cover"
                  />
                ) : (
                  <Ionicons name="person-circle-outline" size={100} color="#999" />
                )}
                {uploadingImage ? (
                  <ActivityIndicator style={styles.avatarLoader} size="small" color="#007AFF" />
                ) : (
                  <View style={styles.avatarEditOverlay}>
                    <Ionicons name="camera" size={24} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>

              <Text style={styles.label}>Handle (username)</Text>
              <TextInput
                style={styles.input}
                placeholder="yourhandle"
                value={handle}
                onChangeText={setHandle}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!savingProfile}
              />
              <Text style={styles.hint}>
                3-20 characters, letters, numbers, and underscores only
              </Text>

              <Text style={styles.label}>Display Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Your Name"
                value={displayName}
                onChangeText={setDisplayName}
                editable={!savingProfile}
              />

              <TouchableOpacity
                style={[styles.saveButton, savingProfile && styles.saveButtonDisabled]}
                onPress={handleSaveProfile}
                disabled={savingProfile}
              >
                {savingProfile ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 24,
    marginTop: 20,
  },
  warningText: {
    fontSize: 14,
    color: '#ff9500',
    marginBottom: 16,
    textAlign: 'center',
    padding: 12,
    backgroundColor: '#fff3e0',
    borderRadius: 8,
  },
  heroSection: {
    backgroundColor: '#fff',
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    position: 'relative',
  },
  avatarContainer: {
    marginBottom: 16,
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
  },
  avatar: {
    width: 100,
    height: 100,
  },
  editButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
  displayName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  handle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#000',
  },
  tabText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#000',
    fontWeight: '600',
  },
  tabContent: {
    backgroundColor: '#fff',
    minHeight: 400,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  postGridItem: {
    width: '33.33%',
    aspectRatio: 3 / 4,
    padding: 1,
  },
  postImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  postImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 8,
  },
  uploadCard: {
    width: '31%',
    aspectRatio: 3 / 4,
    backgroundColor: '#f9f9f9',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  uploadCardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginTop: 8,
    textAlign: 'center',
  },
  imageGridItem: {
    width: '31%',
    aspectRatio: 3 / 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  emptyState: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  modalBody: {
    padding: 20,
  },
  avatarEditButton: {
    width: 100,
    height: 100,
    alignSelf: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  avatarEdit: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarEditOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    backgroundColor: '#007AFF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLoader: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
    color: '#000',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    marginBottom: 8,
  },
  saveButton: {
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
