/**
 * Untyped Supabase client wrapper for tables, RPCs, and queries
 * that exist in the database but are NOT yet reflected in the
 * auto-generated types.ts file.
 *
 * Usage:
 *   import { untypedFrom, untypedRpc } from '@/integrations/supabase/untyped-client';
 *   const { data } = await untypedFrom('my_table').select('*');
 *   const { data } = await untypedRpc('my_rpc', { arg: 'value' });
 *
 * Once the types file is regenerated to include these entities,
 * migrate callers back to the standard typed `supabase` client
 * and delete references to this module.
 */
import { supabase } from './client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const client = supabase as any;

/**
 * Access a table not present in the generated Database type.
 * Returns the same builder as `supabase.from(tableName)` but without type checks.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function untypedFrom(tableName: string): any {
  return client.from(tableName);
}

/**
 * Call an RPC function not present in the generated Database type.
 * Returns `{ data, error }` just like `supabase.rpc(...)`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function untypedRpc(fnName: string, args?: Record<string, unknown>): Promise<{ data: any; error: any }> {
  return client.rpc(fnName, args);
}
