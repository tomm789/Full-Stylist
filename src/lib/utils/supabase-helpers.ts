import { supabase } from '../supabase';

/**
 * Standard error response type
 */
export interface QueryResult<T> {
  data: T | null;
  error: any;
}

export interface QueryListResult<T> {
  data: T[];
  error: any;
}

type OrderBy = { column: string; ascending?: boolean };

function applyFilters(
  query: any,
  filters?: Record<string, any>
) {
  if (!filters) return query;

  Object.entries(filters).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      query = query.in(key, value);
    } else if (value === null) {
      query = query.is(key, null);
    } else {
      query = query.eq(key, value);
    }
  });

  return query;
}

function applyOrderLimitOffset(
  query: any,
  options?: { orderBy?: OrderBy; limit?: number; offset?: number }
) {
  if (options?.orderBy) {
    query = query.order(options.orderBy.column, {
      ascending: options.orderBy.ascending ?? false,
    });
  }

  if (options?.limit !== undefined) {
    query = query.limit(options.limit);
  }

  if (options?.offset !== undefined) {
    query = query.range(
      options.offset,
      options.offset + (options.limit || 50) - 1
    );
  }

  return query;
}

/**
 * Generic single record fetch with consistent error handling
 */
export async function fetchSingle<T>(
  table: string,
  selectQuery: string,
  filters: Record<string, any>
): Promise<QueryResult<T>> {
  try {
    let query = supabase.from(table).select(selectQuery);
    query = applyFilters(query, filters);

    const { data, error } = await query.single();
    return { data: (data as T) ?? null, error };
  } catch (error: any) {
    return { data: null, error };
  }
}

/**
 * Generic list fetch with consistent error handling
 */
export async function fetchList<T>(
  table: string,
  selectQuery: string,
  options?: {
    filters?: Record<string, any>;
    orderBy?: OrderBy;
    limit?: number;
    offset?: number;
  }
): Promise<QueryListResult<T>> {
  try {
    let query = supabase.from(table).select(selectQuery);

    query = applyFilters(query, options?.filters);
    query = applyOrderLimitOffset(query, options);

    const { data, error } = await query;
    return { data: ((data as T[]) ?? []) as T[], error };
  } catch (error: any) {
    return { data: [], error };
  }
}

/**
 * Search helper using ilike across one or more columns.
 *
 * IMPORTANT: matches existing call sites that pass:
 * - `searchColumns: string[]`
 * - `options.additionalFilters` (legacy name used in your codebase)
 */
export async function searchRecords<T>(
  table: string,
  selectQuery: string,
  searchColumns: string[] | string,
  searchTerm: string,
  options?: {
    additionalFilters?: Record<string, any>;
    orderBy?: OrderBy;
    limit?: number;
    offset?: number;
  }
): Promise<QueryListResult<T>> {
  const term = (searchTerm || '').trim();
  if (!term) return { data: [], error: null };

  try {
    const cols = Array.isArray(searchColumns) ? searchColumns : [searchColumns];

    let query = supabase.from(table).select(selectQuery);

    if (cols.length > 0) {
      // OR across columns
      const orExpr = cols.map((c) => `${c}.ilike.%${term}%`).join(',');
      query = query.or(orExpr);
    }

    query = applyFilters(query, options?.additionalFilters);
    query = applyOrderLimitOffset(query, options);

    const { data, error } = await query;
    return { data: ((data as T[]) ?? []) as T[], error };
  } catch (error: any) {
    return { data: [], error };
  }
}