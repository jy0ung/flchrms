import { ExternalLink, FileText, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Document } from '@/hooks/useDocuments';

interface DocumentsTabProps {
  documents?: Document[];
  isLoading: boolean;
  openingDocumentId: string | null;
  onOpenDocument: (document: Document) => void;
}

export function DocumentsTab({ documents, isLoading, openingDocumentId, onOpenDocument }: DocumentsTabProps) {
  if (isLoading) {
    return (
      <Card className="border-border/70 shadow-sm">
        <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading documents...
        </CardContent>
      </Card>
    );
  }

  if (!documents?.length) {
    return (
      <Card className="border-border/70 shadow-sm">
        <CardContent className="p-6 text-sm text-muted-foreground">
          No documents are stored for this employee.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <FileText className="h-4 w-4 text-muted-foreground" />
          Employee Documents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {documents.map((document) => (
          <div key={document.id} className="flex flex-col gap-3 rounded-lg border border-border/60 bg-card px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{document.title}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{document.file_name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {document.category} · {new Date(document.created_at).toLocaleDateString()}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onOpenDocument(document)}
              disabled={openingDocumentId === document.id}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              {openingDocumentId === document.id ? 'Opening...' : 'Open'}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
