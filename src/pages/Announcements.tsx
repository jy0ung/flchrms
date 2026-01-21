import { useAnnouncements } from '@/hooks/useAnnouncements';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Megaphone } from 'lucide-react';
import { format } from 'date-fns';

export default function Announcements() {
  const { data: announcements, isLoading } = useAnnouncements();

  const priorityColors: Record<string, string> = {
    low: 'bg-muted text-muted-foreground',
    normal: 'badge-info',
    high: 'badge-warning',
    urgent: 'badge-destructive',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Megaphone className="w-8 h-8 text-accent" />
          Announcements
        </h1>
        <p className="text-muted-foreground mt-1">Company-wide updates and news</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : announcements?.length === 0 ? (
        <Card className="card-stat">
          <CardContent className="py-12 text-center text-muted-foreground">
            No announcements at this time
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements?.map(announcement => (
            <Card key={announcement.id} className="card-stat">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <CardTitle className="text-xl">{announcement.title}</CardTitle>
                  <Badge className={priorityColors[announcement.priority]}>{announcement.priority}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(announcement.published_at), 'EEEE, MMMM d, yyyy')}
                </p>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-wrap">{announcement.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
