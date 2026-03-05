import { ShieldAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface AdminAccessDeniedProps {
  title?: string;
  description?: string;
}

export function AdminAccessDenied({
  title = 'Access denied',
  description = 'Your account does not have permission to access this admin section.',
}: AdminAccessDeniedProps) {
  return (
    <Card className="border-border shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldAlert className="h-4 w-4 text-destructive" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Contact an administrator if you need additional access.
        </p>
      </CardContent>
    </Card>
  );
}
