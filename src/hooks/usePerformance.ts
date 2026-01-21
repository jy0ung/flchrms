import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PerformanceReview, Profile } from '@/types/hrms';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useMyReviews() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['performance-reviews', 'mine', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performance_reviews')
        .select(`
          *,
          reviewer:profiles!performance_reviews_reviewer_id_fkey(id, first_name, last_name)
        `)
        .eq('employee_id', user!.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as (PerformanceReview & { reviewer: Profile })[];
    },
    enabled: !!user,
  });
}

export function useReviewsToConduct() {
  const { user, role } = useAuth();

  return useQuery({
    queryKey: ['performance-reviews', 'to-conduct', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('performance_reviews')
        .select(`
          *,
          employee:profiles!performance_reviews_employee_id_fkey(id, first_name, last_name, job_title)
        `)
        .eq('reviewer_id', user!.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as (PerformanceReview & { employee: Profile })[];
    },
    enabled: !!user && (role === 'manager' || role === 'hr' || role === 'admin'),
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (review: {
      employee_id: string;
      review_period: string;
      overall_rating?: number;
      strengths?: string;
      areas_for_improvement?: string;
      goals?: string;
      comments?: string;
    }) => {
      const { data, error } = await supabase
        .from('performance_reviews')
        .insert({
          ...review,
          reviewer_id: user!.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });
      toast.success('Review created successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to create review: ' + error.message);
    },
  });
}

export function useSubmitReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reviewId: string) => {
      const { data, error } = await supabase
        .from('performance_reviews')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
        })
        .eq('id', reviewId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });
      toast.success('Review submitted successfully');
    },
    onError: (error: Error) => {
      toast.error('Failed to submit review: ' + error.message);
    },
  });
}

export function useAcknowledgeReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reviewId: string) => {
      const { data, error } = await supabase
        .from('performance_reviews')
        .update({
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', reviewId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['performance-reviews'] });
      toast.success('Review acknowledged');
    },
    onError: (error: Error) => {
      toast.error('Failed to acknowledge review: ' + error.message);
    },
  });
}
