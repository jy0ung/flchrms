import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TrainingProgram, TrainingEnrollment } from '@/types/hrms';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useTrainingPrograms() {
  return useQuery({
    queryKey: ['training-programs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_programs')
        .select('*')
        .order('title');
      
      if (error) throw error;
      return data as TrainingProgram[];
    },
  });
}

export function useMyEnrollments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['training-enrollments', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('training_enrollments')
        .select(`
          *,
          program:training_programs(*)
        `)
        .eq('employee_id', user!.id)
        .order('enrolled_at', { ascending: false });
      
      if (error) throw error;
      return data as (TrainingEnrollment & { program: TrainingProgram })[];
    },
    enabled: !!user,
  });
}

export function useEnrollInProgram() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (programId: string) => {
      const { data, error } = await supabase
        .from('training_enrollments')
        .insert({
          employee_id: user!.id,
          program_id: programId,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-enrollments'] });
      toast.success('Enrolled in training program');
    },
    onError: (error: Error) => {
      toast.error('Failed to enroll: ' + error.message);
    },
  });
}

export function useCreateTrainingProgram() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (program: Omit<TrainingProgram, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
      const { data, error } = await supabase
        .from('training_programs')
        .insert({
          ...program,
          created_by: user!.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-programs'] });
      toast.success('Training program created');
    },
    onError: (error: Error) => {
      toast.error('Failed to create program: ' + error.message);
    },
  });
}
