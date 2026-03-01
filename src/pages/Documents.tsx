import { useDeferredValue, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useDocuments, useUploadDocument, useDeleteDocument, useGetDocumentSignedUrl, DocumentCategory, Document } from '@/hooks/useDocuments';
import { useEmployees } from '@/hooks/useEmployees';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { FileText, Upload, Trash2, Download, Search, Filter, FolderOpen } from 'lucide-react';
import { format } from 'date-fns';
import { canManageDocuments as canManageDocumentsPermission } from '@/lib/permissions';
import { AppPageContainer, DataTableShell, ModalScaffold, PageHeader, SectionToolbar } from '@/components/system';

const categoryColors: Record<DocumentCategory, string> = {
  contract: 'bg-primary/10 text-primary',
  certificate: 'bg-success/10 text-success',
  official: 'bg-warning/10 text-warning',
  other: 'bg-muted text-muted-foreground',
};

const categoryLabels: Record<DocumentCategory, string> = {
  contract: 'Contract',
  certificate: 'Certificate',
  official: 'Official',
  other: 'Other',
};

export default function Documents() {
  usePageTitle('Documents');
  const { role, user } = useAuth();
  const [selectedEmployee, setSelectedEmployee] = useState<string | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [categoryFilter, setCategoryFilter] = useState<DocumentCategory | 'all'>('all');
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const canManageDocuments = canManageDocumentsPermission(role);
  const { data: documents, isLoading } = useDocuments(canManageDocuments ? selectedEmployee : user?.id);
  const { data: employees } = useEmployees();
  const uploadDocument = useUploadDocument();
  const deleteDocument = useDeleteDocument();
  const getSignedUrl = useGetDocumentSignedUrl();

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    file: null as File | null,
    title: '',
    description: '',
    category: 'other' as DocumentCategory,
    employeeId: '',
  });

  const filteredDocuments = documents?.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(deferredSearchTerm.toLowerCase()) ||
      doc.file_name.toLowerCase().includes(deferredSearchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleUpload = async () => {
    if (!uploadForm.file || !uploadForm.title) return;

    const employeeId = canManageDocuments ? uploadForm.employeeId : user?.id;
    if (!employeeId) return;

    await uploadDocument.mutateAsync({
      file: uploadForm.file,
      employeeId,
      title: uploadForm.title,
      description: uploadForm.description,
      category: uploadForm.category,
    });

    setUploadForm({ file: null, title: '', description: '', category: 'other', employeeId: '' });
    setIsUploadOpen(false);
  };

  const handleDownload = async (doc: Document) => {
    const url = await getSignedUrl.mutateAsync(doc.file_url);
    window.open(url, '_blank');
  };

  const handleDelete = async (doc: Document) => {
    await deleteDocument.mutateAsync({ id: doc.id, fileUrl: doc.file_url });
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <AppPageContainer>
      <PageHeader
        shellDensity="compact"
        title="Document Management"
        description={
          canManageDocuments
            ? 'Manage employee contracts, certificates, and official documents'
            : 'View your documents'
        }
        actionsSlot={
          canManageDocuments ? (
            <Button className="h-9 w-full gap-2 rounded-full lg:w-auto" onClick={() => setIsUploadOpen(true)}>
              <Upload className="w-4 h-4" />
              Upload Document
            </Button>
          ) : null
        }
        toolbarSlot={
          <SectionToolbar
            density="compact"
            search={{
              value: searchTerm,
              onChange: setSearchTerm,
              placeholder: 'Search documents...',
              ariaLabel: 'Search documents',
              inputProps: { className: 'h-9' },
            }}
            filters={[
              {
                id: 'document-category',
                control: (
                  <Select value={categoryFilter} onValueChange={(value) => setCategoryFilter(value as DocumentCategory | 'all')}>
                    <SelectTrigger className="w-full lg:w-44 rounded-full">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="certificate">Certificate</SelectItem>
                      <SelectItem value="official">Official</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                ),
                minWidthClassName: "sm:min-w-[180px]",
              },
              ...(canManageDocuments
                ? [
                    {
                      id: 'document-employee',
                      control: (
                        <Select value={selectedEmployee || 'all'} onValueChange={(value) => setSelectedEmployee(value === 'all' ? undefined : value)}>
                          <SelectTrigger className="w-full lg:w-56 rounded-full">
                            <SelectValue placeholder="All Employees" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Employees</SelectItem>
                            {employees?.map((emp) => (
                              <SelectItem key={emp.id} value={emp.id}>
                                {emp.first_name} {emp.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ),
                      minWidthClassName: "sm:min-w-[220px]",
                    },
                  ]
                : []),
            ]}
          />
        }
      />

      {canManageDocuments ? (
        <ModalScaffold
          open={isUploadOpen}
          onOpenChange={setIsUploadOpen}
          title="Upload Document"
          description="Upload a new document for an employee."
          maxWidth="xl"
          contentClassName="max-h-[90vh] overflow-y-auto"
          body={(
            <div className="space-y-4 py-1">
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select
                  value={uploadForm.employeeId}
                  onValueChange={(value) => setUploadForm({ ...uploadForm, employeeId: value })}
                >
                  <SelectTrigger className="rounded-full">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees?.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.first_name} {emp.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Document Title</Label>
                <Input
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  placeholder="e.g., Employment Contract 2024"
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={uploadForm.category}
                  onValueChange={(value) => setUploadForm({ ...uploadForm, category: value as DocumentCategory })}
                >
                  <SelectTrigger className="rounded-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="certificate">Certificate</SelectItem>
                    <SelectItem value="official">Official</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  placeholder="Brief description of the document"
                  rows={3}
                  className="resize-y min-h-[96px]"
                />
              </div>
              <div className="space-y-2">
                <Label>File</Label>
                <Input
                  type="file"
                  onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files?.[0] || null })}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                />
                <p className="text-xs text-muted-foreground">
                  Accepted: PDF, DOC, DOCX, JPG, PNG (max 10MB)
                </p>
              </div>
            </div>
          )}
          footer={(
            <>
              <Button variant="outline" className="w-full rounded-full sm:w-auto" onClick={() => setIsUploadOpen(false)}>
                Cancel
              </Button>
              <Button
                className="w-full rounded-full sm:w-auto"
                onClick={handleUpload}
                disabled={!uploadForm.file || !uploadForm.title || !uploadForm.employeeId || uploadDocument.isPending}
              >
                {uploadDocument.isPending ? 'Uploading...' : 'Upload'}
              </Button>
            </>
          )}
          footerClassName="flex-col-reverse gap-2 sm:flex-row sm:justify-end"
        />
      ) : null}

      <DataTableShell
        title="Documents"
        description={`${filteredDocuments?.length || 0} document${filteredDocuments?.length !== 1 ? 's' : ''} found`}
        hasData={(filteredDocuments?.length || 0) > 0}
        loading={isLoading}
        loadingSkeleton={
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        }
        emptyState={
          <div className="text-center py-12">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No documents found</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {canManageDocuments ? 'Upload documents to get started' : 'No documents have been uploaded for you yet'}
            </p>
          </div>
        }
        mobileList={
          <div className="space-y-3">
            {filteredDocuments?.map((doc) => (
              <div key={doc.id} className="rounded-xl border border-border/60 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-muted/50 shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium break-words">{doc.title}</p>
                      <Badge className={categoryColors[doc.category]}>
                        {categoryLabels[doc.category]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-1">{doc.file_name}</p>
                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {canManageDocuments && (
                        <p>
                          Employee: {doc.employee?.first_name} {doc.employee?.last_name}
                        </p>
                      )}
                      <p>Size: {formatFileSize(doc.file_size)}</p>
                      <p>Uploaded: {format(new Date(doc.created_at), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => handleDownload(doc)}
                    disabled={getSignedUrl.isPending}
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                  {canManageDocuments && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="rounded-full text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Document</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{doc.title}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(doc)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            ))}
          </div>
        }
        table={
          <div className="overflow-x-auto rounded-xl border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  {canManageDocuments && <TableHead className="hidden sm:table-cell">Employee</TableHead>}
                  <TableHead className="hidden lg:table-cell">Size</TableHead>
                  <TableHead className="hidden md:table-cell">Uploaded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments?.map((doc) => (
                  <TableRow key={doc.id} className="hover:bg-muted/20">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-muted/60">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-medium">{doc.title}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {doc.file_name}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge className={categoryColors[doc.category]}>
                        {categoryLabels[doc.category]}
                      </Badge>
                    </TableCell>
                    {canManageDocuments && (
                      <TableCell className="hidden sm:table-cell">
                        {doc.employee?.first_name} {doc.employee?.last_name}
                      </TableCell>
                    )}
                    <TableCell className="hidden lg:table-cell">
                      {formatFileSize(doc.file_size)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {format(new Date(doc.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          onClick={() => handleDownload(doc)}
                          disabled={getSignedUrl.isPending}
                        >
                          <Download className="w-4 h-4 mr-1" />
                          <span className="hidden lg:inline">Download</span>
                        </Button>
                        {canManageDocuments && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="rounded-full text-destructive hover:text-destructive">
                                <Trash2 className="w-4 h-4 mr-1" />
                                <span className="hidden lg:inline">Delete</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Document</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{doc.title}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(doc)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        }
      />
    </AppPageContainer>
  );
}