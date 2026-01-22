import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image as ExpoImage } from 'expo-image';
import { useAuth } from '@/contexts/AuthContext';
import { initializeUserProfile } from '@/lib/user';
import { uploadImageToStorage } from '@/lib/wardrobe';
import { supabase } from '@/lib/supabase';
import { triggerHeadshotGenerate, triggerBodyShotGenerate, triggerAIJobExecution, pollAIJob, getAIJob } from '@/lib/ai-jobs';

type OnboardingStep = 'account' | 'headshot' | 'bodyshot';

export default function OnboardingScreen() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('account');
  
  // Account details
  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [accountPrivacy, setAccountPrivacy] = useState<'public' | 'private'>('public');
  const [searchVisibility, setSearchVisibility] = useState<'visible' | 'hidden'>('visible');
  const [loading, setLoading] = useState(false);
  
  // Headshot state
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [selfieBlob, setSelfieBlob] = useState<Blob | null>(null);
  const [hairStyle, setHairStyle] = useState('');
  const [makeupStyle, setMakeupStyle] = useState('');
  const [generatingHeadshot, setGeneratingHeadshot] = useState(false);
  const [headshotImageId, setHeadshotImageId] = useState<string | null>(null);
  
  // Body shot state
  const [bodyPhotoUri, setBodyPhotoUri] = useState<string | null>(null);
  const [bodyPhotoBlob, setBodyPhotoBlob] = useState<Blob | null>(null);
  const [generatingBodyShot, setGeneratingBodyShot] = useState(false);
  
  // Loading overlay state
  const [loadingMessage, setLoadingMessage] = useState('');
  
  const { user } = useAuth();
  const router = useRouter();

  const validateHandle = (h: string): boolean => {
    // Handle should be alphanumeric and underscores, 3-20 characters
    const handleRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return handleRegex.test(h);
  };

  const handleAccountComplete = async () => {
    
    if (!user) {
      Alert.alert('Error', 'You must be signed in to complete onboarding');
      return;
    }

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

    setLoading(true);

    try {
      const { error } = await initializeUserProfile(user.id, handle.trim(), displayName.trim(), {
        account_privacy: accountPrivacy,
        search_visibility: searchVisibility,
        default_visibility: 'followers',
        allow_external_sharing: true,
      });

      if (error) {
        
        if (error.code === '23505') {
          Alert.alert('Error', 'This handle is already taken. Please choose another.');
        } else {
          Alert.alert('Error', error.message || 'Failed to create profile');
        }
      } else {
        
        // Move to headshot step
        setCurrentStep('headshot');
      }
    } catch (error: any) {
      
      Alert.alert('Error', error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSelfie = async () => {
    
    if (!user) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions');
      return;
    }

    const mediaTypes = (ImagePicker as any).MediaType?.Images || 'images';

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes,
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    const response = await fetch(result.assets[0].uri);
    const blob = await response.blob();
    
    setSelfieUri(result.assets[0].uri);
    setSelfieBlob(blob);
    
  };

  const handleGenerateHeadshot = async () => {
    
    if (!user || !selfieBlob) {
      Alert.alert('Error', 'Please upload a photo first');
      return;
    }

    setGeneratingHeadshot(true);
    setLoadingMessage('Uploading photo...');
    
    
    try {
      // Upload selfie to storage
      const uploadResult = await uploadImageToStorage(user.id, selfieBlob, `selfie-${Date.now()}.jpg`);
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


      setLoadingMessage('Creating headshot job...');

      // Create headshot generation job
      const { data: headshotJob, error: jobError } = await triggerHeadshotGenerate(
        user.id,
        imageRecord.id,
        hairStyle || undefined,
        makeupStyle || undefined
      );

      if (headshotJob && !jobError) {
        
        // Auto-trigger the job
        await triggerAIJobExecution(headshotJob.id);
        
        
        setLoadingMessage('Generating professional headshot...\nThis may take 20-30 seconds.');
        
        const { data: completedJob, error: pollError } = await pollAIJob(headshotJob.id, 30, 2000);
        
        // If polling timed out, do one final check - job might have completed
        let finalJob = completedJob;
        if (pollError || !completedJob) {
          console.log('[Onboarding] Polling timed out, doing final check...');
          const { data: finalCheck } = await getAIJob(headshotJob.id);
          if (finalCheck && (finalCheck.status === 'succeeded' || finalCheck.status === 'failed')) {
            finalJob = finalCheck;
          } else {
            throw new Error('Headshot generation timed out or failed');
          }
        }
        
        if (finalJob.status === 'failed') {
          throw new Error(`Generation failed: ${finalJob.error || 'Unknown error'}`);
        }
        
        
        // Get the generated headshot image ID from user settings
        const { data: settings } = await supabase
          .from('user_settings')
          .select('headshot_image_id')
          .eq('user_id', user.id)
          .single();
        
        if (settings?.headshot_image_id) {
          setHeadshotImageId(settings.headshot_image_id);
        }
        
        
        setGeneratingHeadshot(false);
        setLoadingMessage('');
        
        Alert.alert('Success', 'Headshot generated successfully!');
        // Move to body shot step
        setCurrentStep('bodyshot');
      } else {
        throw jobError || new Error('Failed to create headshot job');
      }
    } catch (error: any) {
      
      setGeneratingHeadshot(false);
      setLoadingMessage('');
      Alert.alert('Error', error.message || 'Failed to generate headshot');
    }
  };

  const handleSkipHeadshot = () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'onboarding.tsx:237',message:'handleSkipHeadshot called',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    
    Alert.alert(
      'Skip Headshot?',
      'You can add your headshot later from your profile. Without it, you won\'t be able to create a studio model for outfit rendering.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Skip', 
          onPress: () => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'onboarding.tsx:248',message:'Skip headshot - navigating to wardrobe',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
            // #endregion
            // Use setTimeout to ensure navigation happens after Alert dismisses
            setTimeout(() => {
              router.replace('/(tabs)/wardrobe');
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'onboarding.tsx:252',message:'router.replace called for skip headshot',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
              // #endregion
            }, 100);
          }
        }
      ]
    );
  };

  const handleUploadBodyPhoto = async () => {
    
    if (!user) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions');
      return;
    }

    const mediaTypes = (ImagePicker as any).MediaType?.Images || 'images';

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes,
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    const response = await fetch(result.assets[0].uri);
    const blob = await response.blob();
    
    setBodyPhotoUri(result.assets[0].uri);
    setBodyPhotoBlob(blob);
    
  };

  const handleGenerateBodyShot = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'onboarding.tsx:277',message:'handleGenerateBodyShot called',data:{hasUser:!!user,hasBodyPhotoBlob:!!bodyPhotoBlob,headshotImageId:headshotImageId||'null'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    
    if (!user || !bodyPhotoBlob) {
      Alert.alert('Error', 'Please upload a body photo first');
      return;
    }

    // Get headshot ID - check state first, then fallback to user_settings
    let finalHeadshotId = headshotImageId;
    if (!finalHeadshotId) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'onboarding.tsx:287',message:'No headshotImageId in state, checking user_settings',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      // Try to get headshot from user_settings as fallback
      const { data: settings } = await supabase
        .from('user_settings')
        .select('headshot_image_id')
        .eq('user_id', user.id)
        .single();
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'onboarding.tsx:295',message:'Fetched headshot from user_settings',data:{headshotImageId:settings?.headshot_image_id||'null'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      
      if (!settings?.headshot_image_id) {
        Alert.alert('Error', 'Headshot is required to generate studio model');
        return;
      }
      // Use the headshot from settings directly (don't rely on state update)
      finalHeadshotId = settings.headshot_image_id;
      // Update local state for future use
      setHeadshotImageId(finalHeadshotId);
    }

    setGeneratingBodyShot(true);
    setLoadingMessage('Uploading photo...');
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'onboarding.tsx:315',message:'Starting body shot generation',data:{headshotImageId:finalHeadshotId||'null'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    
    try {
      // Upload body photo to storage
      const uploadResult = await uploadImageToStorage(user.id, bodyPhotoBlob, `body-${Date.now()}.jpg`);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'onboarding.tsx:310',message:'Body photo upload completed',data:{hasError:!!uploadResult.error,error:uploadResult.error?.message||'none'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
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

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'onboarding.tsx:326',message:'Image record created',data:{hasError:!!imageError,imageId:imageRecord?.id||'null'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      if (imageError || !imageRecord) {
        throw imageError || new Error('Failed to create image record');
      }


      setLoadingMessage('Creating studio model job...');
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'onboarding.tsx:347',message:'Calling triggerBodyShotGenerate',data:{userId:user.id,bodyPhotoImageId:imageRecord.id,headshotImageId:finalHeadshotId||'null'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion

      // Create body shot generation job - PASS headshotImageId explicitly (use finalHeadshotId, not state)
      const { data: bodyShotJob, error: jobError } = await triggerBodyShotGenerate(
        user.id,
        imageRecord.id,
        finalHeadshotId || undefined
      );
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'onboarding.tsx:343',message:'triggerBodyShotGenerate completed',data:{hasJob:!!bodyShotJob,hasError:!!jobError,error:jobError?.message||'none',jobId:bodyShotJob?.id||'null'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion

      if (bodyShotJob && !jobError) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'onboarding.tsx:350',message:'Body shot job created, triggering execution',data:{jobId:bodyShotJob.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        
        // Auto-trigger the job
        await triggerAIJobExecution(bodyShotJob.id);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'onboarding.tsx:354',message:'Job execution triggered, starting polling',data:{jobId:bodyShotJob.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        
        setLoadingMessage('Generating studio model...\nThis may take 30-40 seconds.');
        
        setLoadingMessage('Generating studio model...\nThis may take 30-40 seconds.');
        
        const { data: completedJob, error: pollError } = await pollAIJob(bodyShotJob.id, 50, 2000);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'onboarding.tsx:380',message:'Polling completed',data:{hasJob:!!completedJob,hasError:!!pollError,status:completedJob?.status||'null',error:completedJob?.error||pollError?.message||'none',jobId:bodyShotJob.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        
        // If polling timed out, do one final check - job might have completed
        let finalJob = completedJob;
        if (pollError || !completedJob) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'onboarding.tsx:386',message:'Polling timed out, doing final check',data:{jobId:bodyShotJob.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
          // #endregion
          console.log('[Onboarding] Body shot polling timed out, doing final check...');
          const { data: finalCheck } = await getAIJob(bodyShotJob.id);
          if (finalCheck && (finalCheck.status === 'succeeded' || finalCheck.status === 'failed')) {
            finalJob = finalCheck;
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'onboarding.tsx:391',message:'Final check found job completed',data:{status:finalCheck.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
            // #endregion
          } else {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'onboarding.tsx:395',message:'Final check - job still not complete',data:{status:finalCheck?.status||'null'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
            // #endregion
            throw new Error('Studio model generation timed out. You can check your profile later to see if it completed.');
          }
        }
        
        if (finalJob.status === 'failed') {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'onboarding.tsx:402',message:'Job failed',data:{error:finalJob.error||'Unknown error',status:finalJob.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
          // #endregion
          throw new Error(`Generation failed: ${finalJob.error || 'Unknown error'}`);
        }
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'onboarding.tsx:408',message:'Body shot generation succeeded, navigating',data:{jobId:bodyShotJob.id,result:finalJob.result?JSON.stringify(finalJob.result).substring(0,100):'null'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        
        setGeneratingBodyShot(false);
        setLoadingMessage('');
        
        Alert.alert('Success', 'Studio model generated successfully!');
        // Complete onboarding - navigate to main app
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'onboarding.tsx:401',message:'Navigating to wardrobe after success',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        router.replace('/(tabs)/wardrobe');
      } else {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'onboarding.tsx:380',message:'Body shot job creation failed',data:{error:jobError?.message||'Unknown error'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
        // #endregion
        throw jobError || new Error('Failed to create body shot job');
      }
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'onboarding.tsx:384',message:'Body shot generation error caught',data:{error:error?.message||'Unknown error'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H1'})}).catch(()=>{});
      // #endregion
      
      setGeneratingBodyShot(false);
      setLoadingMessage('');
      Alert.alert('Error', error.message || 'Failed to generate studio model');
    }
  };

  const handleSkipBodyShot = () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'onboarding.tsx:364',message:'handleSkipBodyShot called',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion
    
    Alert.alert(
      'Skip Studio Model?',
      'You can add your studio model later from your profile. Without it, you won\'t be able to render outfits on yourself.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Skip', 
          onPress: () => {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'onboarding.tsx:373',message:'Skip body shot - navigating to wardrobe',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
            // #endregion
            // Use setTimeout to ensure navigation happens after Alert dismisses
            setTimeout(() => {
              router.replace('/(tabs)/wardrobe');
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/28071d19-db3c-4f6a-8e23-153951e513d0',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'onboarding.tsx:377',message:'router.replace called for skip body shot',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'H2'})}).catch(()=>{});
              // #endregion
            }, 100);
          }
        }
      ]
    );
  };

  const renderAccountStep = () => (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Welcome!</Text>
      <Text style={styles.subtitle}>Let's set up your profile</Text>
      <Text style={styles.stepIndicator}>Step 1 of 3</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Handle (username)</Text>
        <TextInput
          style={styles.input}
          placeholder="yourhandle"
          value={handle}
          onChangeText={setHandle}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
        />
        <Text style={styles.hint}>3-20 characters, letters, numbers, and underscores only</Text>

        <Text style={styles.label}>Display Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Your Name"
          value={displayName}
          onChangeText={setDisplayName}
          editable={!loading}
        />

        <View style={styles.section}>
          <Text style={styles.label}>Account Privacy</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={[styles.radioOption, accountPrivacy === 'public' && styles.radioSelected]}
              onPress={() => setAccountPrivacy('public')}
              disabled={loading}
            >
              <Text style={[styles.radioText, accountPrivacy === 'public' && styles.radioTextSelected]}>
                Public
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.radioOption, accountPrivacy === 'private' && styles.radioSelected]}
              onPress={() => setAccountPrivacy('private')}
              disabled={loading}
            >
              <Text style={[styles.radioText, accountPrivacy === 'private' && styles.radioTextSelected]}>
                Private
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Search Visibility</Text>
          <View style={styles.radioGroup}>
            <TouchableOpacity
              style={[styles.radioOption, searchVisibility === 'visible' && styles.radioSelected]}
              onPress={() => setSearchVisibility('visible')}
              disabled={loading}
            >
              <Text style={[styles.radioText, searchVisibility === 'visible' && styles.radioTextSelected]}>
                Visible
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.radioOption, searchVisibility === 'hidden' && styles.radioSelected]}
              onPress={() => setSearchVisibility('hidden')}
              disabled={loading}
            >
              <Text style={[styles.radioText, searchVisibility === 'hidden' && styles.radioTextSelected]}>
                Hidden
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleAccountComplete}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderHeadshotStep = () => (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Create Your Headshot</Text>
      <Text style={styles.subtitle}>Upload a selfie to generate your professional headshot</Text>
      <Text style={styles.stepIndicator}>Step 2 of 3</Text>

      {!selfieUri ? (
        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Upload a Photo</Text>
          <Text style={styles.hint}>
            This will be used to generate your professional headshot for the app
          </Text>

          <TouchableOpacity
            style={styles.uploadButton}
            onPress={handleUploadSelfie}
            disabled={generatingHeadshot}
          >
            <Text style={styles.uploadButtonText}>Choose Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkipHeadshot}
            disabled={generatingHeadshot}
          >
            <Text style={styles.skipButtonText}>Skip for Now</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.form}>
          <View style={styles.imagePreviewContainer}>
            <ExpoImage
              source={{ uri: selfieUri }}
              style={styles.imagePreview}
              contentFit="cover"
            />
          </View>

          <TouchableOpacity style={styles.retakeButton} onPress={() => setSelfieUri(null)}>
            <Text style={styles.retakeButtonText}>Choose Different Photo</Text>
          </TouchableOpacity>

          <View style={styles.section}>
            <Text style={styles.label}>Hairstyle (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Shoulder-length wavy hair"
              value={hairStyle}
              onChangeText={setHairStyle}
              editable={!generatingHeadshot}
            />
            <Text style={styles.hint}>Describe your desired hairstyle or leave blank to keep original</Text>

            <Text style={styles.label}>Makeup Style (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Natural look, Bold red lips"
              value={makeupStyle}
              onChangeText={setMakeupStyle}
              editable={!generatingHeadshot}
            />
            <Text style={styles.hint}>Describe your desired makeup or leave blank for natural look</Text>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleGenerateHeadshot}
            disabled={generatingHeadshot}
          >
            <Text style={styles.buttonText}>Generate Headshot</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkipHeadshot}
            disabled={generatingHeadshot}
          >
            <Text style={styles.skipButtonText}>Skip for Now</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );

  const renderBodyShotStep = () => (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Create Studio Model</Text>
      <Text style={styles.subtitle}>Upload a full-body photo to create your studio model</Text>
      <Text style={styles.stepIndicator}>Step 3 of 3</Text>

      {!bodyPhotoUri ? (
        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Upload Body Photo</Text>
          <Text style={styles.hint}>
            This will be combined with your headshot to create a studio model for outfit rendering
          </Text>

          <TouchableOpacity
            style={styles.uploadButton}
            onPress={handleUploadBodyPhoto}
            disabled={generatingBodyShot}
          >
            <Text style={styles.uploadButtonText}>Choose Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkipBodyShot}
            disabled={generatingBodyShot}
          >
            <Text style={styles.skipButtonText}>Skip for Now</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.form}>
          <View style={styles.imagePreviewContainer}>
            <ExpoImage
              source={{ uri: bodyPhotoUri }}
              style={styles.imagePreview}
              contentFit="cover"
            />
          </View>

          <TouchableOpacity style={styles.retakeButton} onPress={() => setBodyPhotoUri(null)}>
            <Text style={styles.retakeButtonText}>Choose Different Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={handleGenerateBodyShot}
            disabled={generatingBodyShot}
          >
            <Text style={styles.buttonText}>Generate Studio Model</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkipBodyShot}
            disabled={generatingBodyShot}
          >
            <Text style={styles.skipButtonText}>Skip for Now</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );

  const renderLoadingOverlay = () => {
    const isLoading = generatingHeadshot || generatingBodyShot;
    
    return (
      <Modal
        visible={isLoading}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
      >
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingTitle}>
              {generatingHeadshot ? 'Generating Headshot' : 'Generating Studio Model'}
            </Text>
            <Text style={styles.loadingMessage}>{loadingMessage}</Text>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <>
      {currentStep === 'account' && renderAccountStep()}
      {currentStep === 'headshot' && renderHeadshotStep()}
      {currentStep === 'bodyshot' && renderBodyShotStep()}
      {renderLoadingOverlay()}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 40,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  stepIndicator: {
    fontSize: 14,
    color: '#999',
    marginBottom: 32,
    fontWeight: '500',
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
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
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    color: '#000',
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  radioOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: '#000',
    backgroundColor: '#000',
  },
  radioText: {
    fontSize: 14,
    color: '#666',
  },
  radioTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  uploadButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 40,
  },
  skipButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  imagePreviewContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    marginTop: 16,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginTop: 12,
  },
  retakeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    minWidth: 280,
    maxWidth: '80%',
  },
  loadingTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});