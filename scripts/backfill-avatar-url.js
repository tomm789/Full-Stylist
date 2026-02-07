#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const env = {};
  for (const line of lines) {
    if (!line || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (!key) continue;
    env[key] = value;
  }
  return env;
}

function getEnv() {
  const envLocal = loadEnvFile(path.resolve(process.cwd(), '.env.local'));
  const env = loadEnvFile(path.resolve(process.cwd(), '.env'));
  return {
    ...env,
    ...envLocal,
    ...process.env,
  };
}

async function main() {
  const env = getEnv();
  const supabaseUrl = env.EXPO_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    console.error('Missing SUPABASE url in env (.env.local or .env).');
    process.exit(1);
  }

  if (!serviceRoleKey && !anonKey) {
    console.error('Missing SUPABASE key. Provide SUPABASE_SERVICE_ROLE_KEY (recommended) or anon key.');
    process.exit(1);
  }

  const supabaseKey = serviceRoleKey || anonKey;
  if (!serviceRoleKey) {
    console.warn('WARNING: Using anon key. This may fail if RLS prevents updates to users.avatar_url.');
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  console.log('Fetching users with missing avatar_url...');
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, avatar_url')
    .is('avatar_url', null);

  if (usersError) {
    console.error('Failed to load users:', usersError);
    process.exit(1);
  }

  if (!users || users.length === 0) {
    console.log('No users missing avatar_url. Done.');
    return;
  }

  console.log(`Found ${users.length} users missing avatar_url.`);

  const userIds = users.map((u) => u.id);

  const { data: settings, error: settingsError } = await supabase
    .from('user_settings')
    .select('user_id, headshot_image_id')
    .in('user_id', userIds)
    .not('headshot_image_id', 'is', null);

  if (settingsError) {
    console.error('Failed to load user_settings:', settingsError);
    process.exit(1);
  }

  const headshotImageIds = [...new Set((settings || []).map((s) => s.headshot_image_id))];

  const { data: images, error: imagesError } = await supabase
    .from('images')
    .select('id, storage_bucket, storage_key')
    .in('id', headshotImageIds);

  if (imagesError) {
    console.error('Failed to load images:', imagesError);
    process.exit(1);
  }

  const imageById = new Map((images || []).map((img) => [img.id, img]));
  const headshotByUserId = new Map();
  (settings || []).forEach((s) => {
    if (s.headshot_image_id) headshotByUserId.set(s.user_id, s.headshot_image_id);
  });

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of users) {
    let image = null;
    const headshotId = headshotByUserId.get(user.id);
    if (headshotId) {
      image = imageById.get(headshotId) || null;
    }

    if (!image || !image.storage_key) {
      const { data: fallbackImages, error: fallbackError } = await supabase
        .from('images')
        .select('id, storage_bucket, storage_key, created_at')
        .eq('owner_user_id', user.id)
        .ilike('storage_key', '%headshot%')
        .order('created_at', { ascending: true })
        .limit(1);

      if (fallbackError) {
        console.error(`Failed to fetch fallback headshot for user ${user.id}:`, fallbackError);
        failed += 1;
        continue;
      }

      image = (fallbackImages && fallbackImages[0]) || null;
    }

    if (!image || !image.storage_key) {
      skipped += 1;
      continue;
    }

    const { data: urlData } = supabase.storage
      .from(image.storage_bucket || 'media')
      .getPublicUrl(image.storage_key);

    const avatarUrl = urlData?.publicUrl;
    if (!avatarUrl) {
      failed += 1;
      continue;
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: avatarUrl })
      .eq('id', user.id);

    if (updateError) {
      console.error(`Failed to update avatar_url for user ${user.id}:`, updateError);
      failed += 1;
      continue;
    }

    updated += 1;
  }

  console.log('Backfill complete.');
  console.log(`Updated: ${updated}`);
  console.log(`Skipped (no headshot): ${skipped}`);
  console.log(`Failed: ${failed}`);

  if (!serviceRoleKey) {
    console.log('Note: If updates failed due to RLS, run again with SUPABASE_SERVICE_ROLE_KEY.');
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
