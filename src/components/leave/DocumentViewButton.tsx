import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DocumentViewButtonProps {
  documentPath: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'ghost' | 'outline' | 'default';
  label?: string;
  showLabel?: boolean;
}

export function DocumentViewButton({ 
  documentPath, 
  size = 'sm', 
  variant = 'outline',
  label = 'View Doc',
  showLabel = true,
}: DocumentViewButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleViewDocument = async () => {
    setIsLoading(true);
    try {
      // Check if it's already a full URL (legacy data) or a file path
      if (documentPath.startsWith('http')) {
        // Legacy public URL - open directly (will be migrated over time)
        window.open(documentPath, '_blank', 'noopener,noreferrer');
      } else {
        // New file path format - generate signed URL
        const { data, error } = await supabase.storage
          .from('leave-documents')
          .createSignedUrl(documentPath, 3600); // 1 hour expiry

        if (error) throw error;
        
        window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('Failed to get document URL:', error);
      toast.error('Failed to open document. You may not have permission to view this file.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      size={size} 
      variant={variant} 
      className={cn(
        size === 'sm' && 'h-8 rounded-full px-3 text-xs font-medium shadow-none',
        size !== 'sm' && 'rounded-full',
      )}
      onClick={handleViewDocument}
      disabled={isLoading}
      aria-label={showLabel ? undefined : label}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <FileText className="w-4 h-4" />
      )}
      {showLabel ? <span>{label}</span> : null}
    </Button>
  );
}
