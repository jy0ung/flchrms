import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Profile } from '@/types/hrms';

export interface UpdateMyProfileInput {
  first_name: string;
  last_name: string;
  phone: string | null;
}

export function useUpdateMyProfile() {
  const { user, refreshProfile } = useAuth();

  const mutation = useMutation({
    mutationFn: async (input: UpdateMyProfileInput) => {
      if (!user) throw new Error('Authentication required.');

      const payload = {
        first_name: input.first_name.trim(),
        last_name: input.last_name.trim(),
        phone: input.phone && input.phone.trim() ? input.phone.trim() : null,
      };

      const { data, error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', user.id)
        .select('*')
        .single();

      if (error) throw error;

      await refreshProfile();
      return data as Profile;
    },
  });

  return {
    updateMyProfile: mutation.mutateAsync,
    isUpdating: mutation.isPending,
    error: mutation.error,
  };
}
