#!/usr/bin/env node
/**
 * Apply Supabase migrations using Supabase client
 * This script can be used if you have a service role key
 * 
 * Usage: 
 *   SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_URL=... node scripts/apply-migrations.js
 * 
 * Or via Supabase Dashboard:
 *   1. Go to SQL Editor
 *   2. Run each migration file in order
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://earlhvpckbcpvppvmxsd.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.log('\nTo apply migrations via Supabase Dashboard:');
  console.log('1. Go to https://supabase.com/dashboard');
  console.log('2. Select your project');
  console.log('3. Go to SQL Editor');
  console.log('4. Run the following files in order:');
  console.log('   - supabase/migrations/0001_init.sql');
  console.log('   - supabase/migrations/0002_rls.sql');
  console.log('   - supabase/seed/0001_taxonomy.sql');
  process.exit(1);
}

async function applyMigrations() {
  console.log('📦 Creating Supabase admin client...');
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const migrations = [
    { file: 'supabase/migrations/0001_init.sql', name: 'Initial Schema' },
    { file: 'supabase/migrations/0002_rls.sql', name: 'Row Level Security' },
    { file: 'supabase/seed/0001_taxonomy.sql', name: 'Taxonomy Seed Data' },
  ];

  for (const migration of migrations) {
    const filePath = path.join(process.cwd(), migration.file);
    
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Migration file not found: ${filePath}`);
      process.exit(1);
    }

    const sql = fs.readFileSync(filePath, 'utf8');
    
    console.log(`\n📄 Applying: ${migration.name} (${migration.file})...`);
    
    try {
      // Note: Supabase JS client doesn't support raw SQL execution
      // This would need to be done via REST API or direct psql connection
      console.log('⚠️  Direct SQL execution not supported via JS client.');
      console.log('   Please apply migrations via Supabase Dashboard SQL Editor or psql.');
      console.log(`   File location: ${filePath}`);
    } catch (error) {
      console.error(`❌ Error applying ${migration.file}:`, error.message);
      process.exit(1);
    }
  }

  console.log('\n✅ Migration files verified!');
  console.log('\nTo apply migrations:');
  console.log('1. Use Supabase Dashboard SQL Editor (recommended)');
  console.log('2. Or use psql with: psql "$DATABASE_URL" -f <migration-file>');
  console.log('3. Or use Supabase CLI: supabase db push');
}

applyMigrations().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});