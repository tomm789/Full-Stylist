# Storage Setup Guide

## Overview

This app uses Supabase Storage to store images for wardrobe items, outfits, and other media. The storage bucket `media` needs to be created and configured with proper policies.

## Storage Bucket Configuration

### Bucket Details

- **Bucket Name**: `media`
- **Public Access**: Yes (allows public read access to images)
- **File Size Limit**: 50MB
- **Allowed MIME Types**: 
  - `image/jpeg`
  - `image/png`
  - `image/webp`
  - `image/gif`
  - `image/svg+xml`

### File Organization

Files are organized by user ID:
```
media/
  {userId}/
    {timestamp}.{ext}
```

Example: `media/2b493d69-cecc-41ca-82ca-a48c1199471a/1768738425050.webp`

## Setup Instructions

### Option 1: Using Migration (Recommended)

The storage bucket and policies are defined in `supabase/migrations/0003_storage.sql`.

**To apply the migration:**

1. **Using Supabase Dashboard**:
   - Go to https://supabase.com/dashboard
   - Select your project
   - Navigate to **SQL Editor**
   - Copy and paste the contents of `supabase/migrations/0003_storage.sql`
   - Click **Run**

2. **Using Supabase CLI**:
   ```bash
   supabase db push
   ```

### Option 2: Manual Setup

If you prefer to set up the bucket manually:

1. **Create the Bucket**:
   - Go to Supabase Dashboard → **Storage**
   - Click **New bucket**
   - Name: `media`
   - Public bucket: **Yes** (checked)
   - File size limit: `52428800` (50MB)
   - Allowed MIME types: `image/jpeg,image/png,image/webp,image/gif,image/svg+xml`
   - Click **Create bucket**

2. **Configure Policies**:
   - Go to **Storage** → **Policies** → Select `media` bucket
   - Add the following policies:

   **Policy 1: Users can upload to their own folder**
   ```sql
   CREATE POLICY "Users can upload to their own folder"
   ON storage.objects
   FOR INSERT
   TO authenticated
   WITH CHECK (
     bucket_id = 'media' AND
     (storage.foldername(name))[1] = auth.uid()::text
   );
   ```

   **Policy 2: Users can update their own files**
   ```sql
   CREATE POLICY "Users can update their own files"
   ON storage.objects
   FOR UPDATE
   TO authenticated
   USING (
     bucket_id = 'media' AND
     (storage.foldername(name))[1] = auth.uid()::text
   )
   WITH CHECK (
     bucket_id = 'media' AND
     (storage.foldername(name))[1] = auth.uid()::text
   );
   ```

   **Policy 3: Users can delete their own files**
   ```sql
   CREATE POLICY "Users can delete their own files"
   ON storage.objects
   FOR DELETE
   TO authenticated
   USING (
     bucket_id = 'media' AND
     (storage.foldername(name))[1] = auth.uid()::text
   );
   ```

   **Policy 4: Public can read media files**
   ```sql
   CREATE POLICY "Public can read media files"
   ON storage.objects
   FOR SELECT
   TO public
   USING (bucket_id = 'media');
   ```

   **Policy 5: Authenticated users can read media files**
   ```sql
   CREATE POLICY "Authenticated users can read media files"
   ON storage.objects
   FOR SELECT
   TO authenticated
   USING (bucket_id = 'media');
   ```

## Storage Policies Explained

### Upload Policy
- **Who**: Authenticated users
- **What**: Can upload files
- **Where**: Only to their own folder (`{userId}/*`)
- **Why**: Prevents users from uploading to other users' folders

### Update Policy
- **Who**: Authenticated users
- **What**: Can update files
- **Where**: Only their own files
- **Why**: Allows users to replace/update their images

### Delete Policy
- **Who**: Authenticated users
- **What**: Can delete files
- **Where**: Only their own files
- **Why**: Allows users to remove their images

### Read Policies
- **Who**: Public and authenticated users
- **What**: Can read/view files
- **Where**: All files in `media` bucket
- **Why**: Images need to be accessible for display (public images) and viewing other users' content

## Verification

After setting up the storage bucket:

1. **Check Bucket Exists**:
   - Go to Supabase Dashboard → **Storage**
   - Verify `media` bucket appears in the list

2. **Test Upload** (after completing onboarding):
   - Try adding a wardrobe item with an image
   - Check that the upload succeeds
   - Verify the file appears in Storage → `media` → `{your-user-id}/`

3. **Check Policies**:
   - Go to **Storage** → **Policies** → Select `media` bucket
   - Verify all 5 policies are listed and enabled

## Troubleshooting

### Error: "Bucket not found" or 400 Bad Request
- **Cause**: Storage bucket doesn't exist
- **Solution**: Run the migration or create the bucket manually

### Error: "new row violates row-level security policy"
- **Cause**: Storage policies not configured correctly
- **Solution**: Verify all policies are created and enabled

### Error: "File size exceeds limit"
- **Cause**: File is larger than 50MB
- **Solution**: Compress the image or increase the file size limit in bucket settings

### Error: "Invalid MIME type"
- **Cause**: File type not in allowed list
- **Solution**: Convert image to JPEG, PNG, WebP, GIF, or SVG

## Current Project Configuration

**Bucket Name**: `media`

**File Path Pattern**: `{userId}/{timestamp}.{ext}`

**Example Path**: `2b493d69-cecc-41ca-82ca-a48c1199471a/1768738425050.webp`

## Additional Resources

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Supabase Storage Policies](https://supabase.com/docs/guides/storage/security/access-control)
- [Storage RLS Guide](https://supabase.com/docs/guides/storage/security/row-level-security)
