import { useTrainingPrograms, useMyEnrollments, useEnrollInProgram } from '@/hooks/useTraining';
import { usePageTitle } from '@/hooks/usePageTitle';
import { BookOpenCheck, GraduationCap, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AppPageContainer, CardHeaderStandard, DataTableShell, PageHeader, QueryErrorState, StatusBadge } from '@/components/system';
import { SummaryRail } from '@/components/workspace/SummaryRail';
import { WorkspaceStatePanel } from '@/components/workspace/WorkspaceStatePanel';

export default function Training() {
  usePageTitle('Training');
  const { data: programs, isLoading: programsLoading, isError: programsError, refetch: refetchPrograms } = useTrainingPrograms();
  const { data: enrollments, isLoading: enrollmentsLoading } = useMyEnrollments();
  const enroll = useEnrollInProgram();

  const enrolledIds = enrollments?.map(e => e.program_id) || [];
  const mandatoryPrograms = programs?.filter((program) => program.is_mandatory).length ?? 0;
  const activeEnrollments = enrollments?.length ?? 0;

  return (
    <AppPageContainer maxWidth="7xl">
      <PageHeader
        title="Training & Development"
        description="Training programs and enrollment status."
      />

      {!programsLoading || !enrollmentsLoading ? (
        <SummaryRail
          items={[
            {
              id: 'active-enrollments',
              label: 'Active Enrollments',
              value: activeEnrollments,
              helper: 'Programs currently assigned to you.',
              icon: BookOpenCheck,
              tone: activeEnrollments > 0 ? 'info' : 'default',
            },
            {
              id: 'available-programs',
              label: 'Available Programs',
              value: programs?.length ?? 0,
              helper: 'Open learning opportunities in the catalog.',
              icon: GraduationCap,
            },
            {
              id: 'mandatory-programs',
              label: 'Mandatory',
              value: mandatoryPrograms,
              helper: mandatoryPrograms > 0 ? 'Required training in the current catalog.' : 'No required programs right now.',
              icon: ShieldCheck,
              tone: mandatoryPrograms > 0 ? 'warning' : 'default',
            },
          ]}
        />
      ) : null}

      {programsError && (
        <QueryErrorState label="training programs" onRetry={() => refetchPrograms()} />
      )}

      {enrollments && enrollments.length > 0 && (
        <DataTableShell
          title="My Enrollments"
          headerActions={<Badge variant="outline" className="rounded-full">{enrollments.length} active</Badge>}
          hasData={enrollments.length > 0}
          content={
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {enrollments.map((enrollment) => (
                <Card key={enrollment.id} className="border-border shadow-sm">
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold">{enrollment.program?.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{enrollment.program?.category}</p>
                      </div>
                      <StatusBadge
                        status={enrollment.status}
                        labelOverride={enrollment.status.replace('_', ' ')}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          }
        />
      )}

      <DataTableShell
        title="Available Programs"
        description="Browse the current learning catalog and enroll where eligible."
        headerActions={<Badge variant="outline" className="rounded-full">{programs?.length || 0} programs</Badge>}
        loading={programsLoading}
        hasData={Boolean(programs?.length)}
        emptyState={
          <WorkspaceStatePanel
            title="No training programs available"
            description="New learning opportunities will appear here when the catalog is updated."
            icon={GraduationCap}
          />
        }
        content={
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {programs?.map((program) => (
              <Card key={program.id} className="border-border shadow-sm">
                <CardHeaderStandard
                  title={program.title}
                  description={program.description}
                  actions={program.is_mandatory ? <StatusBadge status="warning" labelOverride="Mandatory" /> : undefined}
                  className="p-4 pb-2"
                  titleClassName="text-lg"
                />
                <CardContent>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">{program.duration_hours || 0} hours</p>
                    {enrolledIds.includes(program.id) ? (
                      <StatusBadge status="enrolled" />
                    ) : (
                      <Button
                        size="sm"
                        className="w-full rounded-full sm:w-auto"
                        onClick={() => enroll.mutate(program.id)}
                        disabled={enroll.isPending}
                      >
                        Enroll
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        }
      />
    </AppPageContainer>
  );
}
