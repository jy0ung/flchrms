import { supabase } from '@/integrations/supabase/client';

export async function signOutLocalSession() {
  const result = await supabase.auth.signOut({ scope: 'local' });

  if (result.error) {
    console.error('Error signing out of local session:', result.error);
  }

  return result;
}
