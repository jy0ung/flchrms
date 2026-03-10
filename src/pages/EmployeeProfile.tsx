import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowLeft,
  Mail,
  Phone,
  Building,
  Calendar,
  MapPin,
  Briefcase,
  AlertCircle,
  Shield,
  CreditCard,
  UserCheck,
  Clock,
} from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useEmployee } from '@/hooks/useEmployees';
import { useLeaveBalance } from '@/hooks/useLeaveBalance';
import {
  useEmployeeProfile,
  useEmployeeLifecycle,
  useOnboardingChecklist,
  useToggleChecklistItem,
  useSeedOnboardingChecklist,
  type LifecycleEvent,
  type OnboardingChecklistItem,
} from '@/hooks/useEmployeeLifecycle';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { StatusBadge, AppPageContainer, TaskEmptyState } from '@/components/system';
import { cn } from '@/lib/utils';

// ── Lifecycle Event Timeline ─────────────────────────────────────────────────
const EVENT_ICONS: Record<string, string> = {
  hired: '🎉',
  promoted: '🚀',
  transferred: '🔄',
  salary_change: '💰',
  role_change: '🏷️',
  probation_completed: '✅',
  contract_renewed: '📝',
  warning_issued: '⚠️',
  suspended: '🚫',
  reinstated: '✅',
  resigned: '👋',
  terminated: '❌',
  retired: '🎊',
};

function LifecycleTimeline({ events }: { events: LifecycleEvent[] }) {
  if (!events.length) {
    return (
      <TaskEmptyState
        title="No lifecycle events recorded yet"
        description="Major employment milestones will appear here as the employee record changes over time."
        compact
      />
    );
  }

  return (
    <div className="relative space-y-0">
      {/* Vertical line */}
      <div className="absolute left-5 top-2 bottom-2 w-px bg-border" />

      {events.map((event) => (
        <div key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
          {/* Dot */}
          <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-border bg-card text-sm">
            {EVENT_ICONS[event.event_type] ?? '📋'}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium capitalize">
                {event.event_type.replace(/_/g, ' ')}
              </p>
              <time className="text-xs text-muted-foreground shrink-0">
                {format(new Date(event.event_date), 'MMM d, yyyy')}
              </time>
            </div>
            {event.description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{event.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Onboarding Checklist ─────────────────────────────────────────────────────
function OnboardingSection({
  items,
  employeeId,
}: {
  items: OnboardingChecklistItem[];
  employeeId: string;
}) {
  const toggleItem = useToggleChecklistItem();
  const seedChecklist = useSeedOnboardingChecklist();

  // Group by category — must be above any conditional returns (React hooks rule)
  const grouped = useMemo(() => {
    const map = new Map<string, OnboardingChecklistItem[]>();
    for (const item of items) {
      const cat = item.category || 'general';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    return Array.from(map.entries());
  }, [items]);

  if (!items.length) {
    return (
      <div className="space-y-3 py-8">
        <TaskEmptyState
          title="No onboarding checklist found"
          description="Create the default checklist to start tracking onboarding progress for this employee."
          compact
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => seedChecklist.mutate(employeeId)}
          disabled={seedChecklist.isPending}
        >
          Create Default Checklist
        </Button>
      </div>
    );
  }

  const totalItems = items.length;
  const completedItems = items.filter((i) => i.is_completed).length;
  const progressPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Progress summary */}
      <div className="flex items-center gap-3">
        <Progress value={progressPct} className="flex-1 h-2" />
        <span className="text-sm font-medium text-muted-foreground">
          {completedItems}/{totalItems} ({progressPct}%)
        </span>
      </div>

      {grouped.map(([category, catItems]) => (
        <div key={category} className="space-y-2">
          <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground capitalize">
            {category.replace(/_/g, ' ')}
          </h4>
          <div className="space-y-1">
            {catItems.map((item) => (
              <label
                key={item.id}
                className={cn(
                  'flex items-center gap-3 rounded-lg border border-border p-3 transition-colors cursor-pointer',
                  item.is_completed ? 'bg-muted/30' : 'hover:bg-muted/20',
                )}
              >
                <Checkbox
                  checked={item.is_completed}
                  onCheckedChange={(checked) =>
                    toggleItem.mutate({
                      itemId: item.id,
                      completed: !!checked,
                      employeeId,
                    })
                  }
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-sm',
                      item.is_completed && 'line-through text-muted-foreground',
                    )}
                  >
                    {item.task_name}
                  </p>
                  {item.description && (
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  )}
                </div>
                {item.due_date && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    Due {format(new Date(item.due_date), 'MMM d')}
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Leave Balance Ring (mini) ────────────────────────────────────────────────
function MiniBalanceRing({
  remaining,
  total,
  isUnlimited,
}: {
  remaining: number;
  total: number;
  isUnlimited: boolean;
}) {
  const size = 40;
  const sw = 3;
  const r = (size - sw * 2) / 2;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? Math.max(remaining, 0) / total : 0;
  const offset = c * (1 - pct);
  const color = isUnlimited
    ? 'text-primary'
    : remaining <= 0
      ? 'text-destructive'
      : remaining <= 2
        ? 'text-orange-500'
        : 'text-primary';

  return (
    <svg width={size} height={size} className="shrink-0" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={sw} className="text-muted/30" />
      {isUnlimited ? (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={sw}
          className={color}
          strokeDasharray="2 3"
        />
      ) : (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={sw}
          className={color}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      )}
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className={cn('fill-current font-bold', color)} fontSize="11">
        {isUnlimited ? '∞' : remaining}
      </text>
    </svg>
  );
}

// ── Info row helper ──────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function EmployeeProfile() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();

  const { data: basicProfile, isLoading: profileLoading } = useEmployee(employeeId ?? '');
  const { data: extProfile } = useEmployeeProfile(employeeId);
  const { data: balances } = useLeaveBalance(employeeId);
  const { data: lifecycleEvents } = useEmployeeLifecycle(employeeId);
  const { data: checklistItems } = useOnboardingChecklist(employeeId);

  const profile = extProfile ?? basicProfile;
  const isHR = role === 'hr' || role === 'admin' || role === 'director';

  usePageTitle(profile ? `${profile.first_name} ${profile.last_name}` : 'Employee Profile');

  if (profileLoading) {
    return (
      <AppPageContainer maxWidth="7xl">
        <div className="space-y-6">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-32 bg-muted animate-pulse rounded-xl" />
          <div className="h-64 bg-muted animate-pulse rounded-xl" />
        </div>
      </AppPageContainer>
    );
  }

  if (!profile) {
    return (
      <AppPageContainer maxWidth="7xl">
        <div className="text-center py-16 space-y-3">
          <AlertCircle className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">Employee not found.</p>
          <Button variant="outline" onClick={() => navigate('/employees')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Directory
          </Button>
        </div>
      </AppPageContainer>
    );
  }

  return (
    <AppPageContainer maxWidth="7xl">
      {/* Back + header */}
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 -ml-2"
        onClick={() => navigate('/employees')}
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to Directory
      </Button>

      {/* Hero card */}
      <Card className="border-border shadow-sm overflow-hidden mb-6">
        <div className="h-16 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
        <CardContent className="relative -mt-8 pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <Avatar className="h-16 w-16 border-4 border-card shadow-sm">
              <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                {profile.first_name[0]}
                {profile.last_name[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">
                  {profile.first_name} {profile.last_name}
                </h1>
                <StatusBadge status={profile.status} />
              </div>
              <p className="text-sm text-muted-foreground">
                {profile.job_title ?? 'No title'}
                {basicProfile?.department?.name && ` · ${basicProfile.department.name}`}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {profile.email}
                </span>
                {profile.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {profile.phone}
                  </span>
                )}
                {profile.hire_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Hired {format(new Date(profile.hire_date), 'MMM d, yyyy')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
          <TabsTrigger value="employment" className="text-xs sm:text-sm">Employment</TabsTrigger>
          <TabsTrigger value="leave" className="text-xs sm:text-sm">Leave</TabsTrigger>
          <TabsTrigger value="timeline" className="text-xs sm:text-sm">Timeline</TabsTrigger>
          {isHR && (
            <TabsTrigger value="onboarding" className="text-xs sm:text-sm">Onboarding</TabsTrigger>
          )}
        </TabsList>

        {/* ── Overview ──────────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Contact Info */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-border">
                <InfoRow icon={Mail} label="Email" value={profile.email} />
                <InfoRow icon={Phone} label="Phone" value={profile.phone} />
                <InfoRow
                  icon={AlertCircle}
                  label="Emergency Contact"
                  value={
                    extProfile?.emergency_contact_name
                      ? `${extProfile.emergency_contact_name}${extProfile.emergency_contact_phone ? ` (${extProfile.emergency_contact_phone})` : ''}`
                      : null
                  }
                />
                <InfoRow icon={MapPin} label="Work Location" value={extProfile?.work_location} />
              </CardContent>
            </Card>

            {/* Leave Summary */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Leave Balance</CardTitle>
              </CardHeader>
              <CardContent>
                {balances?.length ? (
                  <div className="space-y-2">
                    {balances.slice(0, 5).map((b) => (
                      <div key={b.leave_type_id} className="flex items-center gap-3">
                        <MiniBalanceRing
                          remaining={b.days_remaining}
                          total={b.days_allowed}
                          isUnlimited={b.is_unlimited}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{b.leave_type_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {b.is_unlimited ? 'Unlimited' : `${b.days_remaining} of ${b.days_allowed} left`}
                            {b.days_pending > 0 && ` · ${b.days_pending} pending`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No leave balance data.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent lifecycle events */}
          {lifecycleEvents && lifecycleEvents.length > 0 && (
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <LifecycleTimeline events={lifecycleEvents.slice(0, 3)} />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Employment ────────────────────────────────────────────── */}
        <TabsContent value="employment" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Employment Details</CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-border">
                <InfoRow icon={Briefcase} label="Job Title" value={profile.job_title} />
                <InfoRow icon={Building} label="Department" value={basicProfile?.department?.name ?? null} />
                <InfoRow
                  icon={UserCheck}
                  label="Employment Type"
                  value={extProfile?.employment_type ? extProfile.employment_type.replace(/_/g, ' ') : null}
                />
                <InfoRow
                  icon={Calendar}
                  label="Hire Date"
                  value={profile.hire_date ? format(new Date(profile.hire_date), 'MMM d, yyyy') : null}
                />
                <InfoRow
                  icon={Clock}
                  label="Probation End"
                  value={extProfile?.probation_end_date ? format(new Date(extProfile.probation_end_date), 'MMM d, yyyy') : null}
                />
                <InfoRow icon={MapPin} label="Work Location" value={extProfile?.work_location} />
              </CardContent>
            </Card>

            {isHR && (
              <Card className="border-border shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Personal & Financial</CardTitle>
                </CardHeader>
                <CardContent className="divide-y divide-border">
                  <InfoRow
                    icon={Calendar}
                    label="Date of Birth"
                    value={extProfile?.date_of_birth ? format(new Date(extProfile.date_of_birth), 'MMM d, yyyy') : null}
                  />
                  <InfoRow icon={Shield} label="National ID" value={extProfile?.national_id} />
                  <InfoRow icon={CreditCard} label="Bank" value={extProfile?.bank_name} />
                  <InfoRow icon={CreditCard} label="Bank Account" value={extProfile?.bank_account} />
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ── Leave ─────────────────────────────────────────────────── */}
        <TabsContent value="leave" className="space-y-4">
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Leave Balance</CardTitle>
            </CardHeader>
            <CardContent>
              {balances?.length ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {balances.map((b) => (
                    <div
                      key={b.leave_type_id}
                      className="flex items-center gap-3 rounded-lg border border-border p-3"
                    >
                      <MiniBalanceRing
                        remaining={b.days_remaining}
                        total={b.days_allowed}
                        isUnlimited={b.is_unlimited}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{b.leave_type_name}</p>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {b.days_used} used · {b.is_unlimited ? 'Unlimited' : `${b.days_remaining} remaining`}
                          </span>
                        </div>
                        {b.days_pending > 0 && (
                          <p className="text-[11px] text-amber-600">{b.days_pending} pending</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <TaskEmptyState
                  title="No leave balance data available"
                  description="Leave balances will appear here after entitlements are configured for this employee."
                  compact
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Timeline ──────────────────────────────────────────────── */}
        <TabsContent value="timeline" className="space-y-4">
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Lifecycle Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <LifecycleTimeline events={lifecycleEvents ?? []} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Onboarding ────────────────────────────────────────────── */}
        {isHR && (
          <TabsContent value="onboarding" className="space-y-4">
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Onboarding Checklist</CardTitle>
              </CardHeader>
              <CardContent>
                <OnboardingSection
                  items={checklistItems ?? []}
                  employeeId={employeeId!}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </AppPageContainer>
  );
}
