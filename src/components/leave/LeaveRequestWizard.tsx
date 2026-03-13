import { useState, useMemo, useCallback } from 'react';
import { format, differenceInDays, startOfDay, eachDayOfInterval, isWeekend } from 'date-fns';
import { ChevronLeft, ChevronRight, Check, Upload, FileText, X, AlertCircle, Loader2, Clock, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { LeavePreviewResult, LeaveType } from '@/types/hrms';
import type { LeaveBalance } from '@/hooks/useLeaveBalance';
import { validateDocumentFile } from '@/lib/validations';

// ── Types ────────────────────────────────────────────────────────────────────
interface WizardFormData {
  leave_type_id: string;
  start_date: string;
  end_date: string;
  days_count: number;
  reason?: string;
  document_url?: string;
}

interface LeaveRequestWizardProps {
  leaveTypes: LeaveType[] | undefined;
  balances: LeaveBalance[] | undefined;
  onSubmit: (data: WizardFormData) => void;
  onPreview: (data: Omit<WizardFormData, 'document_url'> & { reason?: string }) => Promise<LeavePreviewResult>;
  onUploadDocument: (file: File) => Promise<string>;
  onCancel: () => void;
  isPending: boolean;
  isPreviewPending: boolean;
}

type WizardStep = 1 | 2 | 3 | 4;
type StepGuard = {
  message: string;
  tone?: 'muted' | 'destructive';
};

const STEP_LABELS: Record<WizardStep, string> = {
  1: 'Leave Type',
  2: 'Select Dates',
  3: 'Details',
  4: 'Review',
};

// ── Progress indicator ───────────────────────────────────────────────────────
function StepIndicator({ current, total }: { current: WizardStep; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => {
        const step = (i + 1) as WizardStep;
        const isActive = step === current;
        const isCompleted = step < current;
        return (
          <div key={step} className="flex items-center gap-2">
            {i > 0 && (
              <div
                className={cn(
                  'h-px w-6 sm:w-10 transition-colors',
                  isCompleted ? 'bg-primary' : 'bg-border',
                )}
              />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-all',
                  isCompleted && 'bg-primary text-primary-foreground',
                  isActive && 'bg-primary text-primary-foreground ring-2 ring-primary/30',
                  !isActive && !isCompleted && 'bg-muted text-muted-foreground',
                )}
              >
                {isCompleted ? <Check className="h-3.5 w-3.5" /> : step}
              </div>
              <span
                className={cn(
                  'hidden text-xs sm:inline',
                  isActive ? 'font-medium text-foreground' : 'text-muted-foreground',
                )}
              >
                {STEP_LABELS[step]}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Balance ring ─────────────────────────────────────────────────────────────
function BalanceRing({
  used,
  total,
  pending,
  size = 56,
  isUnlimited = false,
}: {
  used: number;
  total: number;
  pending: number;
  size?: number;
  isUnlimited?: boolean;
}) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const remaining = Math.max(total - used, 0);
  const pct = total > 0 ? remaining / total : 0;
  const offset = circumference * (1 - pct);
  const pendingPct = total > 0 ? pending / total : 0;
  const pendingOffset = circumference * (1 - pendingPct);

  const color = isUnlimited
    ? 'text-primary'
    : pct <= 0
      ? 'text-destructive'
      : pct <= 0.2
        ? 'text-orange-500'
        : 'text-primary';

  return (
    <svg width={size} height={size} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={4}
        className="text-muted/40"
      />
      {pending > 0 && !isUnlimited && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={4}
          className="text-amber-400/50"
          strokeDasharray={circumference}
          strokeDashoffset={pendingOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      )}
      {isUnlimited ? (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={4}
          className={color}
          strokeDasharray="3 4"
        />
      ) : (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={4}
          className={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      )}
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        className={cn('fill-current text-xs font-bold', color)}
      >
        {isUnlimited ? '∞' : remaining}
      </text>
    </svg>
  );
}

// ── Step 1: Leave Type Selection ─────────────────────────────────────────────
function StepLeaveType({
  leaveTypes,
  balances,
  selectedTypeId,
  onSelect,
}: {
  leaveTypes: LeaveType[] | undefined;
  balances: LeaveBalance[] | undefined;
  selectedTypeId: string;
  onSelect: (id: string) => void;
}) {
  if (!leaveTypes?.length) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        No leave types available. Contact HR to set up leave types.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">Select Leave Type</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Choose the type of leave you want to request. Types with no available balance are disabled until entitlement becomes available again.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {leaveTypes.map((type) => {
          const balance = balances?.find((b) => b.leave_type_id === type.id);
          const isSelected = selectedTypeId === type.id;
          const isExhausted = balance ? !balance.is_unlimited && balance.days_remaining <= 0 : false;
          const isUnavailable = isExhausted;

          return (
            <button
              key={type.id}
              type="button"
              data-testid={`leave-type-card-${type.id}`}
              disabled={isUnavailable}
              onClick={() => onSelect(type.id)}
              title={isUnavailable ? `${type.name} is unavailable because the current balance is exhausted.` : undefined}
              className={cn(
                'relative flex items-center gap-3 rounded-xl border p-4 text-left transition-all',
                isSelected
                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                  : isUnavailable
                    ? 'cursor-not-allowed border-amber-500/30 bg-amber-500/5 opacity-75'
                    : 'border-border hover:border-primary/30 hover:bg-muted/30 cursor-pointer',
              )}
            >
              {balance && (
                <BalanceRing
                  used={balance.days_used}
                  total={balance.days_allowed}
                  pending={balance.days_pending}
                  isUnlimited={balance.is_unlimited}
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight">{type.name}</p>
                {type.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                    {type.description}
                  </p>
                )}
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {balance && (
                    <span className="text-xs text-muted-foreground">
                      {balance.is_unlimited
                        ? 'Unlimited'
                        : `${balance.days_remaining}/${balance.days_allowed} days`}
                    </span>
                  )}
                  {isExhausted && (
                    <>
                      <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-[10px] px-1.5 py-0 text-amber-700">
                        Unavailable
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Current balance exhausted
                      </span>
                    </>
                  )}
                  {type.min_days > 0 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      <Clock className="mr-0.5 h-2.5 w-2.5" />
                      {type.min_days}d notice
                    </Badge>
                  )}
                  {type.requires_document && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      <FileText className="mr-0.5 h-2.5 w-2.5" />
                      Doc required
                    </Badge>
                  )}
                </div>
              </div>
              {isSelected && (
                <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Step 2: Date Selection with Calendar ─────────────────────────────────────
function StepDates({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  selectedType,
  balance,
}: {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  selectedType: LeaveType | undefined;
  balance: LeaveBalance | undefined;
}) {
  const dateRange = useMemo(() => {
    if (!startDate) return null;
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : start;
    return { from: start, to: end };
  }, [startDate, endDate]);

  const daysCount = useMemo(() => {
    if (!startDate || !endDate) return 0;
    return differenceInDays(new Date(endDate), new Date(startDate)) + 1;
  }, [startDate, endDate]);

  const weekdaysCount = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const days = eachDayOfInterval({ start: new Date(startDate), end: new Date(endDate) });
    return days.filter((d) => !isWeekend(d)).length;
  }, [startDate, endDate]);

  const handleDateSelect = useCallback(
    (range: { from?: Date; to?: Date } | undefined) => {
      if (!range) return;
      if (range.from) {
        onStartDateChange(format(range.from, 'yyyy-MM-dd'));
      }
      if (range.to) {
        onEndDateChange(format(range.to, 'yyyy-MM-dd'));
      } else if (range.from) {
        onEndDateChange(format(range.from, 'yyyy-MM-dd'));
      }
    },
    [onStartDateChange, onEndDateChange],
  );

  const exceedsBalance = balance && !balance.is_unlimited && daysCount > balance.days_remaining;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">Select Dates</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Pick the start and end dates for your leave.
        </p>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Calendar */}
        <div className="rounded-xl border border-border p-3 bg-card">
          <Calendar
            mode="range"
            selected={dateRange ?? undefined}
            onSelect={handleDateSelect}
            numberOfMonths={2}
            disabled={{ before: new Date() }}
            className="rounded-md"
          />
        </div>

        {/* Summary sidebar */}
        <div className="flex-1 space-y-3 min-w-[200px]">
          {/* Manual date inputs as fallback */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Start Date</Label>
              <Input
                type="date"
                data-testid="leave-start-date-input"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">End Date</Label>
              <Input
                type="date"
                data-testid="leave-end-date-input"
                value={endDate}
                onChange={(e) => onEndDateChange(e.target.value)}
                min={startDate}
                className="h-9 text-sm"
              />
            </div>
          </div>

          {daysCount > 0 && (
            <>
              <Separator />
              <div className="space-y-2 rounded-lg bg-muted/40 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Calendar days</span>
                  <span className="font-medium">{daysCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Working days</span>
                  <span className="font-semibold">{weekdaysCount}</span>
                </div>
                {balance && (
                  <>
                    <Separator className="my-1" />
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Current balance</span>
                      <span>{balance.is_unlimited ? 'Unlimited' : `${balance.days_remaining} days`}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">After request</span>
                      <span
                        className={cn(
                          'font-medium',
                          exceedsBalance ? 'text-destructive' : 'text-foreground',
                        )}
                      >
                        {balance.is_unlimited ? 'Unlimited' : `${balance.days_remaining - daysCount} days`}
                      </span>
                    </div>
                  </>
                )}
              </div>
              {exceedsBalance && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <AlertDescription className="text-xs">
                    Exceeds available balance by{' '}
                    {daysCount - (balance?.days_remaining ?? 0)} day(s).
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Step 3: Details (reason + document) ──────────────────────────────────────
function StepDetails({
  reason,
  onReasonChange,
  documentFile,
  onDocumentFileChange,
  selectedType,
}: {
  reason: string;
  onReasonChange: (reason: string) => void;
  documentFile: File | null;
  onDocumentFileChange: (file: File | null) => void;
  selectedType: LeaveType | undefined;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">Additional Details</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Provide a reason and attach any required documents.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-sm">
          Reason
          {selectedType?.requires_document && (
            <span className="text-destructive ml-1">*</span>
          )}
        </Label>
        <Textarea
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="Describe the reason for your leave..."
          rows={3}
          maxLength={2000}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground text-right">{reason.length}/2000</p>
      </div>

      <div className="space-y-2">
        <Label className="text-sm flex items-center gap-2">
          Supporting Document
          {selectedType?.requires_document && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
              Required
            </Badge>
          )}
        </Label>
        {documentFile ? (
          <div className="flex items-center gap-3 rounded-lg border border-border p-3 bg-muted/30">
            <FileText className="h-5 w-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{documentFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(documentFile.size / 1024).toFixed(0)} KB
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => onDocumentFileChange(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-6 transition-colors hover:border-primary/50 hover:bg-primary/5">
            <Upload className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Click or drag to upload
            </span>
            <span className="text-xs text-muted-foreground">
              PDF, JPG, PNG, DOC, DOCX (max 10MB)
            </span>
            <input
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                onDocumentFileChange(file);
                e.target.value = '';
              }}
            />
          </label>
        )}
      </div>
    </div>
  );
}

// ── Step 4: Review ───────────────────────────────────────────────────────────
function StepReview({
  selectedType,
  balance,
  startDate,
  endDate,
  daysCount,
  reason,
  documentFile,
  previewResult,
}: {
  selectedType: LeaveType | undefined;
  balance: LeaveBalance | undefined;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
  documentFile: File | null;
  previewResult: LeavePreviewResult | null;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">Review Your Request</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Please review the details before submitting.
        </p>
      </div>

      <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
        {/* Leave type */}
        <div className="flex items-center gap-3 p-4 bg-card">
          {balance && (
            <BalanceRing
              used={balance.days_used}
              total={balance.days_allowed}
              pending={balance.days_pending}
              size={44}
              isUnlimited={balance.is_unlimited}
            />
          )}
          <div>
            <p className="text-sm font-semibold">{selectedType?.name}</p>
            <p className="text-xs text-muted-foreground">
              {balance
                ? balance.is_unlimited
                  ? 'Unlimited balance'
                  : `${balance.days_remaining} days remaining → ${balance.days_remaining - daysCount} after this request`
                : 'Balance unavailable'}
            </p>
          </div>
        </div>

        {/* Dates */}
        <div className="p-4 space-y-2 bg-card">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {startDate && format(new Date(startDate), 'EEE, d MMM yyyy')}
              {startDate !== endDate && (
                <>
                  {' — '}
                  {endDate && format(new Date(endDate), 'EEE, d MMM yyyy')}
                </>
              )}
            </span>
          </div>
          <p className="text-xs text-muted-foreground ml-6">
            {daysCount} calendar day{daysCount !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Reason */}
        {reason && (
          <div className="p-4 bg-card">
            <p className="text-xs font-medium text-muted-foreground mb-1">Reason</p>
            <p className="text-sm">{reason}</p>
          </div>
        )}

        {/* Document */}
        {documentFile && (
          <div className="p-4 bg-card">
            <p className="text-xs font-medium text-muted-foreground mb-1">Attachment</p>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm">{documentFile.name}</span>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
        <div data-testid="leave-policy-preview-panel" className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Policy Preview</p>
          {previewResult ? (
            <div className="space-y-2">
              <div className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
                <div className="flex justify-between sm:justify-start sm:gap-2">
                  <span className="text-muted-foreground">Requested units</span>
                  <span className="font-medium">{previewResult.requested_units}</span>
                </div>
                <div className="flex justify-between sm:justify-start sm:gap-2">
                  <span className="text-muted-foreground">Available balance</span>
                  <span
                    className={cn(
                      'font-medium',
                      !previewResult.is_unlimited &&
                        previewResult.available_balance < previewResult.requested_units &&
                        'text-destructive',
                    )}
                  >
                    {previewResult.is_unlimited ? 'Unlimited' : previewResult.available_balance}
                  </span>
                </div>
                <div className="flex justify-between sm:justify-start sm:gap-2">
                  <span className="text-muted-foreground">Pending balance</span>
                  <span className="font-medium">{previewResult.pending_balance}</span>
                </div>
                <div className="flex justify-between sm:justify-start sm:gap-2">
                  <span className="text-muted-foreground">Rule unit</span>
                  <span className="font-medium">{previewResult.rule_unit}</span>
                </div>
              </div>
              {previewResult.soft_warnings.length > 0 && (
                <Alert className="py-2">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <AlertDescription className="text-xs">
                    {previewResult.soft_warnings.join(' ')}
                  </AlertDescription>
                </Alert>
              )}
              {previewResult.hard_errors.length > 0 && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <AlertDescription className="text-xs">
                    {previewResult.hard_errors.join(' ')}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Preview runs automatically before submit.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Wizard ──────────────────────────────────────────────────────────────
export function LeaveRequestWizard({
  leaveTypes,
  balances,
  onSubmit,
  onPreview,
  onUploadDocument,
  onCancel,
  isPending,
  isPreviewPending,
}: LeaveRequestWizardProps) {
  const [step, setStep] = useState<WizardStep>(1);
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<LeavePreviewResult | null>(null);

  const selectedType = useMemo(
    () => leaveTypes?.find((t) => t.id === selectedTypeId),
    [leaveTypes, selectedTypeId],
  );

  const selectedBalance = useMemo(
    () => balances?.find((b) => b.leave_type_id === selectedTypeId),
    [balances, selectedTypeId],
  );

  const daysCount = useMemo(() => {
    if (!startDate || !endDate) return 0;
    return differenceInDays(new Date(endDate), new Date(startDate)) + 1;
  }, [startDate, endDate]);

  const selectedTypeUnavailable = useMemo(
    () => Boolean(
      selectedBalance
      && !selectedBalance.is_unlimited
      && selectedBalance.days_remaining <= 0,
    ),
    [selectedBalance],
  );

  const resetPreviewState = useCallback(() => {
    setPreviewResult(null);
  }, []);

  const runPreview = useCallback(async () => {
    setValidationError(null);

    if (!selectedTypeId || !startDate || !endDate || daysCount <= 0) {
      return null;
    }

    try {
      const preview = await onPreview({
        leave_type_id: selectedTypeId,
        start_date: startDate,
        end_date: endDate,
        days_count: daysCount,
        reason: reason || undefined,
      });

      setPreviewResult(preview);

      if (!preview.can_submit || preview.hard_errors.length > 0) {
        setValidationError(preview.hard_errors[0] || 'Leave request failed policy validation.');
      }

      return preview;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to run policy preview.';
      setValidationError(message);
      return null;
    }
  }, [daysCount, endDate, onPreview, reason, selectedTypeId, startDate]);

  const currentStepGuard = useMemo<StepGuard | null>(() => {
    switch (step) {
      case 1:
        if (!selectedTypeId) {
          return { message: 'Select a leave type to continue.', tone: 'muted' };
        }
        if (selectedTypeUnavailable) {
          return {
            message: `${selectedType?.name ?? 'This leave type'} is currently unavailable because the balance is exhausted.`,
            tone: 'destructive',
          };
        }
        return null;

      case 2: {
        if (!startDate || !endDate) {
          return { message: 'Choose both start and end dates to continue.', tone: 'muted' };
        }
        if (daysCount <= 0) {
          return { message: 'End date must be on or after start date.', tone: 'destructive' };
        }

        const today = startOfDay(new Date());
        const leaveStart = startOfDay(new Date(startDate));
        if (leaveStart < today) {
          return { message: 'Start date cannot be in the past.', tone: 'destructive' };
        }

        if (selectedType && selectedType.min_days > 0) {
          const daysUntil = differenceInDays(leaveStart, today);
          if (daysUntil < selectedType.min_days) {
            return {
              message: `${selectedType.name} requires at least ${selectedType.min_days} day(s) advance notice. Your leave starts in ${daysUntil} day(s).`,
              tone: 'destructive',
            };
          }
        }

        if (
          selectedBalance
          && !selectedBalance.is_unlimited
          && daysCount > selectedBalance.days_remaining
        ) {
          return {
            message: `Shorten the request or choose another leave type. This range exceeds the available balance by ${daysCount - selectedBalance.days_remaining} day(s).`,
            tone: 'destructive',
          };
        }

        return null;
      }

      case 3:
        if (selectedType?.requires_document && !documentFile) {
          return {
            message: `Upload a supporting document to continue with ${selectedType.name}.`,
            tone: 'muted',
          };
        }
        if (documentFile) {
          const fileError = validateDocumentFile(documentFile);
          if (fileError) {
            return { message: fileError, tone: 'destructive' };
          }
        }
        return null;

      case 4:
      default:
        return null;
    }
  }, [
    daysCount,
    documentFile,
    endDate,
    selectedBalance,
    selectedType,
    selectedTypeId,
    selectedTypeUnavailable,
    startDate,
    step,
  ]);

  const canAdvance = useCallback((): boolean => {
    setValidationError(null);

    if (currentStepGuard) {
      setValidationError(currentStepGuard.message);
      return false;
    }

    switch (step) {
      case 1:
      case 2:
      case 3:
      case 4:
        return true;

      default:
        return false;
    }
  }, [currentStepGuard, step]);

  const handleNext = async () => {
    if (!canAdvance()) return;

    if (step === 3) {
      const preview = await runPreview();
      if (!preview || !preview.can_submit || preview.hard_errors.length > 0) {
        return;
      }
    }

    setStep((s) => Math.min(s + 1, 4) as WizardStep);
  };

  const handleBack = () => {
    setValidationError(null);
    setStep((s) => Math.max(s - 1, 1) as WizardStep);
  };

  const handleSubmit = async () => {
    if (!canAdvance()) return;

    const preview = await runPreview();
    if (!preview || !preview.can_submit || preview.hard_errors.length > 0) {
      return;
    }

    if (preview.requires_document && !documentFile) {
      setValidationError('This request requires a supporting document by policy.');
      return;
    }

    let documentUrl: string | undefined;
    if (documentFile) {
      try {
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
      days_count: preview.requested_units || daysCount,
      reason: reason || undefined,
      document_url: documentUrl,
    });
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Step indicator */}
      <div className="flex justify-center">
        <StepIndicator current={step} total={4} />
      </div>

      {/* Validation error */}
      {validationError && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-3.5 w-3.5" />
          <AlertDescription className="text-xs">{validationError}</AlertDescription>
        </Alert>
      )}
      {/* Step content */}
      <div className="min-h-[280px]">
        {step === 1 && (
          <StepLeaveType
            leaveTypes={leaveTypes}
            balances={balances}
            selectedTypeId={selectedTypeId}
            onSelect={(id) => {
              setSelectedTypeId(id);
              setValidationError(null);
              resetPreviewState();
            }}
          />
        )}
        {step === 2 && (
          <StepDates
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={(date) => {
              setStartDate(date);
              resetPreviewState();
            }}
            onEndDateChange={(date) => {
              setEndDate(date);
              resetPreviewState();
            }}
            selectedType={selectedType}
            balance={selectedBalance}
          />
        )}
        {step === 3 && (
          <StepDetails
            reason={reason}
            onReasonChange={(nextReason) => {
              setReason(nextReason);
              resetPreviewState();
            }}
            documentFile={documentFile}
            onDocumentFileChange={(file) => {
              setDocumentFile(file);
              resetPreviewState();
            }}
            selectedType={selectedType}
          />
        )}
        {step === 4 && (
          <StepReview
            selectedType={selectedType}
            balance={selectedBalance}
            startDate={startDate}
            endDate={endDate}
            daysCount={daysCount}
            reason={reason}
            documentFile={documentFile}
            previewResult={previewResult}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between border-t border-border pt-4">
        <div>
          {step > 1 ? (
            <Button type="button" variant="ghost" onClick={handleBack} disabled={isPending || isPreviewPending}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
          ) : (
            <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending || isPreviewPending}>
              Cancel
            </Button>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          {step < 4 && currentStepGuard ? (
            <p
              className={cn(
                'max-w-xs text-right text-xs',
                currentStepGuard.tone === 'destructive' ? 'text-destructive' : 'text-muted-foreground',
              )}
            >
              {currentStepGuard.message}
            </p>
          ) : null}
          {step < 4 ? (
            <Button
              type="button"
              data-testid="leave-wizard-next"
              onClick={() => void handleNext()}
              disabled={isPending || isPreviewPending || Boolean(currentStepGuard)}
            >
              {isPreviewPending && step === 3 ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validating…
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </>
              )}
            </Button>
          ) : (
            <Button type="button" data-testid="leave-wizard-submit" onClick={() => void handleSubmit()} disabled={isPending || isPreviewPending}>
              {isPending || isPreviewPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isPreviewPending ? 'Validating…' : 'Submitting…'}
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Submit Request
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
