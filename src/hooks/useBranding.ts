import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TenantBranding {
  id: string;
  company_name: string;
  company_tagline: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  login_background_url: string | null;
  primary_color: string;
  accent_color: string;
  sidebar_color: string;
}

const BRANDING_DEFAULTS: TenantBranding = {
  id: '',
  company_name: 'FL Group',
  company_tagline: 'HR Management System',
  logo_url: null,
  favicon_url: null,
  login_background_url: null,
  primary_color: '221 83% 53%',
  accent_color: '142 71% 45%',
  sidebar_color: '0 0% 3%',
};

const BRANDING_QUERY_KEY = ['tenant-branding'] as const;

export function useBranding() {
  return useQuery({
    queryKey: BRANDING_QUERY_KEY,
    queryFn: async (): Promise<TenantBranding> => {
      const { data, error } = await supabase
        .from('tenant_branding')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn('Failed to fetch branding, using defaults:', error.message);
        return BRANDING_DEFAULTS;
      }

      if (!data) return BRANDING_DEFAULTS;
      return {
        ...data,
        primary_color: data.primary_color ?? BRANDING_DEFAULTS.primary_color,
        accent_color: data.accent_color ?? BRANDING_DEFAULTS.accent_color,
        sidebar_color: data.sidebar_color ?? BRANDING_DEFAULTS.sidebar_color,
      };
    },
    staleTime: Infinity, // Branding almost never changes — only refetch on explicit invalidation
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

export type BrandingUpdate = Partial<
  Pick<TenantBranding, 'company_name' | 'company_tagline' | 'primary_color' | 'accent_color' | 'sidebar_color' | 'logo_url' | 'favicon_url' | 'login_background_url'>
>;

export function useUpdateBranding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: BrandingUpdate) => {
      // Upsert: try to update the singleton row first
      const { data: existing } = await supabase
        .from('tenant_branding')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('tenant_branding')
          .update(updates)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tenant_branding')
          .insert(updates);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BRANDING_QUERY_KEY });
      toast.success('Branding updated successfully');
    },
    onError: (error) => {
      console.error('Branding update failed:', error);
      toast.error('Failed to update branding');
    },
  });
}

export function useUploadBrandingAsset() {
  return useMutation({
    mutationFn: async ({ file, path }: { file: File; path: string }): Promise<string> => {
      const { error: uploadError } = await supabase.storage
        .from('branding-assets')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('branding-assets')
        .getPublicUrl(path);

      return data.publicUrl;
    },
    onError: (error) => {
      console.error('Branding asset upload failed:', error);
      toast.error('Failed to upload file');
    },
  });
}
