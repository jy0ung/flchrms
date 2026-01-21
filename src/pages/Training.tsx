import { useTrainingPrograms, useMyEnrollments, useEnrollInProgram } from '@/hooks/useTraining';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Clock, BookOpen } from 'lucide-react';

export default function Training() {
  const { data: programs } = useTrainingPrograms();
  const { data: enrollments } = useMyEnrollments();
  const enroll = useEnrollInProgram();

  const enrolledIds = enrollments?.map(e => e.program_id) || [];

  const statusColors: Record<string, string> = {
    enrolled: 'badge-info',
    in_progress: 'badge-warning',
    completed: 'badge-success',
    dropped: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <GraduationCap className="w-8 h-8 text-accent" />
          Training & Development
        </h1>
        <p className="text-muted-foreground mt-1">Enhance your skills with our training programs</p>
      </div>

      {enrollments && enrollments.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">My Enrollments</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {enrollments.map(enrollment => (
              <Card key={enrollment.id} className="card-stat">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{enrollment.program?.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{enrollment.program?.category}</p>
                    </div>
                    <Badge className={statusColors[enrollment.status]}>{enrollment.status.replace('_', ' ')}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Available Programs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {programs?.map(program => (
            <Card key={program.id} className="card-stat">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <BookOpen className="w-8 h-8 text-accent" />
                  {program.is_mandatory && <Badge variant="destructive">Mandatory</Badge>}
                </div>
                <CardTitle className="text-lg">{program.title}</CardTitle>
                <CardDescription>{program.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {program.duration_hours || 0} hours
                  </div>
                  {enrolledIds.includes(program.id) ? (
                    <Badge className="badge-success">Enrolled</Badge>
                  ) : (
                    <Button size="sm" onClick={() => enroll.mutate(program.id)} disabled={enroll.isPending}>
                      Enroll
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
