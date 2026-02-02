import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Upload, FileText, X } from 'lucide-react';
import { differenceInDays, startOfDay } from 'date-fns';
import { LeaveType } from '@/types/hrms';
import { LeaveBalance } from '@/hooks/useLeaveBalance';

interface LeaveRequestFormProps {
  leaveTypes: LeaveType[] | undefined;
  balances: LeaveBalance[] | undefined;
  onSubmit: (data: {
    leave_type_id: string;
    start_date: string;
    end_date: string;
    days_count: number;
    reason?: string;
    document_url?: string;
  }) => void;
  onUploadDocument: (file: File) => Promise<string>;
  isPending: boolean;
  isUploading: boolean;
}

export function LeaveRequestForm({
  leaveTypes,
  balances,
  onSubmit,
  onUploadDocument,
  isPending,
  isUploading,
}: LeaveRequestFormProps) {
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const selectedType = useMemo(() => 
    leaveTypes?.find(t => t.id === selectedTypeId),
    [leaveTypes, selectedTypeId]
  );

  const selectedBalance = useMemo(() =>
    balances?.find(b => b.leave_type_id === selectedTypeId),
    [balances, selectedTypeId]
  );

  const daysRequested = useMemo(() => {
    if (!startDate || !endDate) return 0;
    return differenceInDays(new Date(endDate), new Date(startDate)) + 1;
  }, [startDate, endDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!selectedTypeId || !startDate || !endDate) {
      setValidationError('Please fill in all required fields.');
      return;
    }

    if (daysRequested <= 0) {
      setValidationError('End date must be after start date.');
      return;
    }

    // Validate advance notice (min_days = days before leave date)
    if (selectedType && selectedType.min_days > 1) {
      const today = startOfDay(new Date());
      const leaveStartDate = startOfDay(new Date(startDate));
      const daysUntilLeave = differenceInDays(leaveStartDate, today);
      
      if (daysUntilLeave < selectedType.min_days) {
        setValidationError(`${selectedType.name} requires at least ${selectedType.min_days} days advance notice. Your leave starts in ${daysUntilLeave} day(s).`);
        return;
      }
    }

    // Validate balance
    if (selectedBalance && daysRequested > selectedBalance.days_remaining) {
      setValidationError(`Insufficient balance. You have ${selectedBalance.days_remaining} days remaining for ${selectedType?.name}.`);
      return;
    }

    // Check if document is required
    if (selectedType?.requires_document && !documentFile) {
      setValidationError(`${selectedType.name} requires a supporting document.`);
      return;
    }

    let documentUrl: string | undefined;
    if (documentFile) {
      try {
        // Generate a temporary ID for the upload path
        documentUrl = await onUploadDocument(documentFile);
      } catch {
        setValidationError('Failed to upload document. Please try again.');
        return;
      }
    }

    onSubmit({
      leave_type_id: selectedTypeId,
      start_date: startDate,
      end_date: endDate,
      days_count: daysRequested,
      reason: reason || undefined,
      document_url: documentUrl,
    });
  };

  const removeDocument = () => {
    setDocumentFile(null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {validationError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label>Leave Type *</Label>
        <Select value={selectedTypeId} onValueChange={setSelectedTypeId}>
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {leaveTypes?.map(type => {
              const balance = balances?.find(b => b.leave_type_id === type.id);
              return (
                <SelectItem key={type.id} value={type.id}>
                  <div className="flex items-center justify-between w-full gap-4">
                    <span>{type.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {balance ? `${balance.days_remaining} days left` : ''}
                      {type.min_days > 1 && ` • ${type.min_days}d notice`}
                    </span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        {selectedBalance && (
          <p className="text-xs text-muted-foreground">
            Balance: {selectedBalance.days_remaining} of {selectedBalance.days_allowed} days remaining
            {selectedBalance.days_pending > 0 && ` (${selectedBalance.days_pending} pending)`}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Start Date *</Label>
          <Input 
            type="date" 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required 
          />
        </div>
        <div className="space-y-2">
          <Label>End Date *</Label>
          <Input 
            type="date" 
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate}
            required 
          />
        </div>
      </div>

      {daysRequested > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Duration:</span>
          <span className="font-medium">{daysRequested} day{daysRequested !== 1 ? 's' : ''}</span>
          {selectedBalance && daysRequested > selectedBalance.days_remaining && (
            <span className="text-destructive text-xs">(exceeds balance)</span>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label>Reason</Label>
        <Textarea 
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Optional reason for leave..."
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          Supporting Document
          {selectedType?.requires_document && (
            <span className="text-destructive text-xs">* Required</span>
          )}
        </Label>
        {documentFile ? (
          <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
            <FileText className="w-4 h-4 text-accent" />
            <span className="text-sm flex-1 truncate">{documentFile.name}</span>
            <Button 
              type="button" 
              variant="ghost" 
              size="sm"
              onClick={removeDocument}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="relative">
            <Input 
              type="file"
              onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              className="cursor-pointer"
            />
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          <Upload className="w-3 h-3 inline mr-1" />
          Accepted: PDF, JPG, PNG, DOC, DOCX (max 10MB)
        </p>
      </div>

      <Button 
        type="submit" 
        className="w-full" 
        disabled={isPending || isUploading}
      >
        {isUploading ? 'Uploading...' : isPending ? 'Submitting...' : 'Submit Request'}
      </Button>
    </form>
  );
}
