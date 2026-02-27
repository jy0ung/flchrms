import { useTrainingPrograms, useMyEnrollments, useEnrollInProgram } from '@/hooks/useTraining';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Clock, BookOpen } from 'lucide-react';
import { AppPageContainer, DataTableShell, PageHeader, StatusBadge } from '@/components/system';

export default function Training() {
  const { data: programs } = useTrainingPrograms();
  const { data: enrollments } = useMyEnrollments();
  const enroll = useEnrollInProgram();

  const enrolledIds = enrollments?.map(e => e.program_id) || [];

  return (
    <AppPageContainer>
      <PageHeader
        shellDensity="compact"
        title="Training & Development"
        description="Enhance your skills with our training programs"
      />

      {enrollments && enrollments.length > 0 && (
        <DataTableShell
          title="My Enrollments"
          headerActions={<Badge variant="outline" className="rounded-full">{enrollments.length} active</Badge>}
          hasData={enrollments.length > 0}
          content={
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {enrollments.map((enrollment) => (
                <Card key={enrollment.id} className="card-stat border-border/60 shadow-sm">
                  <CardContent className="pt-6">
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
        headerActions={<Badge variant="outline" className="rounded-full">{programs?.length || 0} programs</Badge>}
        hasData={Boolean(programs?.length)}
        emptyState={<div className="p-8 text-center text-muted-foreground">No training programs available.</div>}
        content={
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {programs?.map((program) => (
              <Card key={program.id} className="card-stat border-border/60 shadow-sm">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <BookOpen className="w-8 h-8 text-accent" />
                    {program.is_mandatory && (
                      <StatusBadge status="warning" labelOverride="Mandatory" />
                    )}
                  </div>
                  <CardTitle className="text-lg">{program.title}</CardTitle>
                  <CardDescription>{program.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {program.duration_hours || 0} hours
                    </div>
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
