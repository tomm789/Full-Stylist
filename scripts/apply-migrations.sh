#!/bin/bash
# Script to apply Supabase migrations
# Usage: SUPABASE_DB_URL="postgresql://..." ./scripts/apply-migrations.sh

set -e

echo "Applying Supabase migrations..."

if [ -z "$SUPABASE_DB_URL" ]; then
  echo "Error: SUPABASE_DB_URL environment variable is required"
  echo "Example: SUPABASE_DB_URL='postgresql://postgres:password@host:port/dbname'"
  exit 1
fi

# Apply initial migration
echo "Applying 0001_init.sql..."
psql "$SUPABASE_DB_URL" -f supabase/migrations/0001_init.sql

# Apply RLS migration
echo "Applying 0002_rls.sql..."
psql "$SUPABASE_DB_URL" -f supabase/migrations/0002_rls.sql

# Apply seed data
echo "Applying seed data (0001_taxonomy.sql)..."
psql "$SUPABASE_DB_URL" -f supabase/seed/0001_taxonomy.sql

echo "✅ All migrations and seed data applied successfully!"