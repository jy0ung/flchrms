import { AlertCircle, MessageSquare } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { LeaveRequest } from '@/types/hrms';

interface LeaveAmendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: LeaveRequest | null;
  amendmentNotes: string;
  onAmendmentNotesChange: (value: string) => void;
  onDocumentFileChange: (file: File | null) => void;
  onSubmit: () => void;
  isPending: boolean;
  isUploading: boolean;
}

export function LeaveAmendDialog({
  open,
  onOpenChange,
  request,
  amendmentNotes,
  onAmendmentNotesChange,
  onDocumentFileChange,
  onSubmit,
  isPending,
  isUploading,
}: LeaveAmendDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Amend Leave Request</DialogTitle>
          <DialogDescription>
            Update your request and attach any required documents
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {request?.rejection_reason && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Rejection reason:</strong> {request.rejection_reason}
              </AlertDescription>
            </Alert>
          )}
          {request?.manager_comments && (
            <Alert>
              <MessageSquare className="h-4 w-4" />
              <AlertDescription>
                <strong>Manager&apos;s note:</strong> {request.manager_comments}
              </AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label>Amendment Notes</Label>
            <Textarea
              value={amendmentNotes}
              onChange={(e) => onAmendmentNotesChange(e.target.value)}
              placeholder="Explain the changes or provide additional information..."
              required
              className="min-h-24 resize-y"
            />
          </div>
          <div className="space-y-2">
            <Label>Supporting Document</Label>
            <Input
              type="file"
              onChange={(e) => onDocumentFileChange(e.target.files?.[0] || null)}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            />
            <p className="text-xs text-muted-foreground">Accepted formats: PDF, JPG, PNG, DOC, DOCX</p>
          </div>
        </div>
        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={onSubmit}
            disabled={isPending || isUploading || !amendmentNotes}
            className="w-full sm:w-auto"
          >
            Submit Amendment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
