import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DocumentViewButton } from '@/components/leave/DocumentViewButton';
import type { LeaveRequest } from '@/types/hrms';

interface DocumentsTabProps {
  request: LeaveRequest;
}

export function DocumentsTab({ request }: DocumentsTabProps) {
  if (!request.document_url) {
    return (
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Documents</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No supporting document is attached to this request.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Documents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>Supporting document is available for this request.</p>
        <DocumentViewButton documentPath={request.document_url} />
      </CardContent>
    </Card>
  );
}
