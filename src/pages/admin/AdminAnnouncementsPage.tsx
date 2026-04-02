import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Megaphone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  useAnnouncements,
  useCreateAnnouncement,
  useDeleteAnnouncement,
  useUpdateAnnouncement,
} from '@/hooks/useAnnouncements';
import { useAdminPageCapabilities } from '@/hooks/admin/useAdminCapabilities';
import { AdminTableLoadingSkeleton } from '@/components/admin/AdminLoadingSkeletons';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ContextChip, ModalScaffold, ModalSection, TaskEmptyState } from '@/components/system';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';
import { TableRowSkeleton } from '@/components/system';
import { SummaryRail, type SummaryRailItem } from '@/components/workspace/SummaryRail';
import { UtilityLayout } from '@/layouts/UtilityLayout';

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700 border-slate-200',
  normal: 'bg-blue-50 text-blue-700 border-blue-200',
  high: 'bg-amber-50 text-amber-700 border-amber-200',
  urgent: 'bg-red-50 text-red-700 border-red-200',
};

interface AnnouncementForm {
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  expires_at: string;
}

const emptyForm: AnnouncementForm = { title: '', content: '', priority: 'normal', expires_at: '' };
const emptyReason = '';
const minimumGovernanceReasonLength = 5;

export default function AdminAnnouncementsPage() {
  usePageTitle('Admin · Announcements');
  const { role } = useAuth();
  const { capabilities, isLoading: capabilitiesLoading } = useAdminPageCapabilities(role);
  const { data: announcements, isLoading } = useAnnouncements();
  const createMutation = useCreateAnnouncement();
  const updateMutation = useUpdateAnnouncement();
  const deleteMutation = useDeleteAnnouncement();

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<AnnouncementForm>(emptyForm);
  const [changeReason, setChangeReason] = useState(emptyReason);
  const [deleteReason, setDeleteReason] = useState(emptyReason);

  const hasValidChangeReason = changeReason.trim().length >= minimumGovernanceReasonLength;
  const hasValidDeleteReason = deleteReason.trim().length >= minimumGovernanceReasonLength;

  const resetFormState = () => {
    setForm(emptyForm);
    setChangeReason(emptyReason);
  };

  const closeCreateDialog = (open: boolean) => {
    setCreateOpen(open);
    if (!open) {
      resetFormState();
    }
  };

  const closeEditDialog = (open: boolean) => {
    setEditOpen(open);
    if (!open) {
      resetFormState();
      setEditId(null);
    }
  };

  const closeDeleteDialog = (open: boolean) => {
    setDeleteOpen(open);
    if (!open) {
      setDeleteReason(emptyReason);
      setEditId(null);
    }
  };

  const handleCreate = async () => {
    await createMutation.mutateAsync({
      title: form.title,
      content: form.content,
      priority: form.priority,
      expires_at: form.expires_at || undefined,
      reason: changeReason.trim(),
    });
    setCreateOpen(false);
    resetFormState();
  };

  const handleEdit = (ann: { id: string; title: string; content: string; priority: string; expires_at: string | null }) => {
    setEditId(ann.id);
    setForm({
      title: ann.title,
      content: ann.content,
      priority: (ann.priority as AnnouncementForm['priority']) || 'normal',
      expires_at: ann.expires_at?.slice(0, 10) ?? '',
    });
    setChangeReason(emptyReason);
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editId) return;
    await updateMutation.mutateAsync({
      id: editId,
      title: form.title,
      content: form.content,
      priority: form.priority,
      expires_at: form.expires_at || null,
      reason: changeReason.trim(),
    });
    setEditOpen(false);
    setEditId(null);
    resetFormState();
  };

  const handleDelete = async () => {
    if (!editId) return;
    await deleteMutation.mutateAsync({ id: editId, reason: deleteReason.trim() });
    setDeleteOpen(false);
    setEditId(null);
    setDeleteReason(emptyReason);
  };

  const sortedAnnouncements = useMemo(
    () => [...(announcements ?? [])].sort((a, b) =>
      new Date(b.published_at ?? b.created_at).getTime() - new Date(a.published_at ?? a.created_at).getTime()
    ),
    [announcements],
  );
  const summaryItems = useMemo((): SummaryRailItem[] => {
    const now = Date.now();
    const urgentCount = sortedAnnouncements.filter((announcement) => announcement.priority === 'urgent').length;
    const publishedCount = sortedAnnouncements.filter((announcement) => Boolean(announcement.published_at)).length;
    const expiringSoonCount = sortedAnnouncements.filter((announcement) => {
      if (!announcement.expires_at) return false;
      const expiresAt = new Date(announcement.expires_at).getTime();
      const sevenDaysFromNow = now + (7 * 24 * 60 * 60 * 1000);
      return expiresAt >= now && expiresAt <= sevenDaysFromNow;
    }).length;

    return [
      {
        id: 'published',
        label: 'Published announcements',
        value: publishedCount,
        helper: 'Organization-wide announcements currently in the managed queue.',
      },
      {
        id: 'urgent',
        label: 'Urgent priority',
        value: urgentCount,
        helper: 'High-visibility announcements requiring deliberate governance review.',
      },
      {
        id: 'expiring-soon',
        label: 'Expiring within 7 days',
        value: expiringSoonCount,
        helper: 'Announcements that may need extension, replacement, or retirement soon.',
      },
    ];
  }, [sortedAnnouncements]);

  if (capabilitiesLoading) {
    return (
      <UtilityLayout
        eyebrow="Governance"
        title="Announcement Management"
        description="Create, edit, and manage company-wide announcements."
        metaSlot={(
          <>
            <ContextChip tone="info">Scope: organization communications</ContextChip>
            <ContextChip>Mode: announcement governance</ContextChip>
          </>
        )}
      >
        <AdminTableLoadingSkeleton
          title="Loading announcements"
          description="Checking announcement-management capabilities and preparing the latest entries."
          sectionTitle="Announcement queue"
          sectionDescription="Preparing the published announcements list and management actions."
        />
      </UtilityLayout>
    );
  }

  if (!capabilities.canManageAnnouncements) {
    return (
      <AdminAccessDenied
        title="Announcement management is disabled"
        description="Your account does not have the capability to manage announcements."
      />
    );
  }

  const formFields = (
    <div className="space-y-4">
      <ModalSection title="Announcement Details">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ann-title">Title</Label>
            <Input
              id="ann-title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Announcement title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ann-content">Content</Label>
            <Textarea
              id="ann-content"
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              placeholder="Write announcement content..."
              rows={4}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(v) => setForm((f) => ({ ...f, priority: v as AnnouncementForm['priority'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ann-expires">Expires At</Label>
              <Input
                id="ann-expires"
                type="date"
                value={form.expires_at}
                onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
              />
            </div>
          </div>
        </div>
      </ModalSection>
      <ModalSection
        title="Governance Reason"
        description="Required for the audit trail. Explain why this announcement change is needed."
        tone="muted"
      >
        <div className="space-y-2">
          <Label htmlFor="ann-reason">Change reason</Label>
          <Textarea
            id="ann-reason"
            value={changeReason}
            onChange={(e) => setChangeReason(e.target.value)}
            placeholder="Explain why this announcement should be published or changed..."
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            Minimum {minimumGovernanceReasonLength} characters. This reason is captured in the governance audit trail.
          </p>
        </div>
      </ModalSection>
    </div>
  );

  return (
    <UtilityLayout
      eyebrow="Governance"
      title="Announcement Management"
      description="Create, edit, and manage company-wide announcements."
      metaSlot={(
        <>
          <ContextChip tone="info">Scope: organization communications</ContextChip>
          <ContextChip>Mode: announcement governance</ContextChip>
        </>
      )}
      actionsSlot={(
        <Button onClick={() => { resetFormState(); setCreateOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          New Announcement
        </Button>
      )}
      leadSlot={(
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <section className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Current workspace
            </p>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Announcement queue and publication controls
            </h2>
            <p className="text-sm text-muted-foreground">
              Review active announcements, adjust priority or expiry, and publish new organization-wide updates from one governed communication workspace.
            </p>
          </section>
          <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Communication caution
            </p>
            <p className="mt-2 text-sm font-medium text-foreground">
              Publish only verified organization updates
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Changes in this workspace affect what employees see across the app. Reserve urgent priority for time-sensitive updates that require immediate attention.
            </p>
          </div>
        </div>
      )}
      summarySlot={<SummaryRail items={summaryItems} variant="subtle" compactBreakpoint="xl" />}
      supportingSlot={(
        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Governance notes
          </p>
          <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
            <p className="text-sm font-medium text-foreground">Review priority and expiry together</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Use priority to communicate urgency, then confirm the expiry window still matches the intended communication lifecycle before publishing changes.
            </p>
          </div>
        </section>
      )}
      supportingSurface="none"
    >

      <Card className="border-border shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-4 p-4">
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-foreground">Announcement queue</h2>
                <p className="text-sm text-muted-foreground">
                  Loading published announcements and their management actions.
                </p>
              </div>
              <TableRowSkeleton rows={5} columns={5} />
            </div>
          ) : sortedAnnouncements.length === 0 ? (
            <div className="p-6">
              <TaskEmptyState
                title="No announcements yet"
                description="Create your first announcement to publish updates to the organization."
                icon={Megaphone}
                action={(
                  <Button variant="outline" className="rounded-full" onClick={() => { resetFormState(); setCreateOpen(true); }}>
                    Create First Announcement
                  </Button>
                )}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAnnouncements.map((ann) => (
                  <TableRow key={ann.id}>
                    <TableCell className="font-medium max-w-[300px] truncate">{ann.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={PRIORITY_COLORS[ann.priority ?? 'normal'] ?? ''}>
                        {ann.priority ?? 'normal'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {ann.published_at
                        ? new Date(ann.published_at).toLocaleDateString()
                        : '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {ann.expires_at
                        ? new Date(ann.expires_at).toLocaleDateString()
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label={`Edit announcement ${ann.title}`}
                          title={`Edit announcement ${ann.title}`}
                          onClick={() => handleEdit(ann)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          aria-label={`Delete announcement ${ann.title}`}
                          title={`Delete announcement ${ann.title}`}
                          onClick={() => { setEditId(ann.id); setDeleteReason(emptyReason); setDeleteOpen(true); }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <ModalScaffold
        open={createOpen}
        onOpenChange={closeCreateDialog}
        title="Create Announcement"
        description="Publish a new announcement visible to all employees."
        maxWidth="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => closeCreateDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.title.trim() || !form.content.trim() || !hasValidChangeReason || createMutation.isPending}>
              {createMutation.isPending ? 'Publishing...' : 'Publish'}
            </Button>
          </div>
        }
        body={formFields}
      />

      {/* Edit Dialog */}
      <ModalScaffold
        open={editOpen}
        onOpenChange={closeEditDialog}
        title="Edit Announcement"
        description="Update the announcement details."
        maxWidth="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => closeEditDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={!form.title.trim() || !form.content.trim() || !hasValidChangeReason || updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        }
        body={formFields}
      />

      {/* Delete Confirmation */}
      <ModalScaffold
        open={deleteOpen}
        onOpenChange={closeDeleteDialog}
        title="Delete Announcement"
        description="This action cannot be undone. The announcement will be permanently removed and captured in the governance audit trail."
        maxWidth="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => closeDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={!hasValidDeleteReason || deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        }
        body={
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete this announcement? This will remove it for all employees.
            </p>
            <ModalSection
              title="Governance Reason"
              description="Required for the audit trail before this announcement can be deleted."
              tone="danger"
            >
              <div className="space-y-2">
                <Label htmlFor="ann-delete-reason">Deletion reason</Label>
                <Textarea
                  id="ann-delete-reason"
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Explain why this announcement must be removed..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum {minimumGovernanceReasonLength} characters. This reason is captured in the governance audit trail.
                </p>
              </div>
            </ModalSection>
          </div>
        }
      />
    </UtilityLayout>
  );
}
