import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../../../config/env';

let client: SupabaseClient | null = null;

/**
 * Retorna um Supabase client server-side configurado com service_role key.
 * Sessão não é persistida — adequado para uso no backend.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!client) {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error(
        'SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios quando UPLOAD_MODE=supabase',
      );
    }
    client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return client;
}
