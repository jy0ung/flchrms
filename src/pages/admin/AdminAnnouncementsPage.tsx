import { useState, useMemo } from 'react';
import { Plus, Pencil, Trash2, Megaphone } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useAnnouncements, useCreateAnnouncement } from '@/hooks/useAnnouncements';
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
import { ModalScaffold } from '@/components/system';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { sanitizeErrorMessage } from '@/lib/error-utils';

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700 border-slate-200',
  normal: 'bg-blue-50 text-blue-700 border-blue-200',
  high: 'bg-amber-50 text-amber-700 border-amber-200',
  urgent: 'bg-red-50 text-red-700 border-red-200',
};

function useUpdateAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...update }: { id: string; title?: string; content?: string; priority?: string; is_active?: boolean; expires_at?: string | null }) => {
      const { error } = await supabase.from('announcements').update(update).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Announcement updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update announcement', { description: sanitizeErrorMessage(error) });
    },
  });
}

function useDeleteAnnouncement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Announcement deleted');
    },
    onError: (error: Error) => {
      toast.error('Failed to delete announcement', { description: sanitizeErrorMessage(error) });
    },
  });
}

interface AnnouncementForm {
  title: string;
  content: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  expires_at: string;
}

const emptyForm: AnnouncementForm = { title: '', content: '', priority: 'normal', expires_at: '' };

export default function AdminAnnouncementsPage() {
  usePageTitle('Admin · Announcements');
  const { data: announcements, isLoading } = useAnnouncements();
  const createMutation = useCreateAnnouncement();
  const updateMutation = useUpdateAnnouncement();
  const deleteMutation = useDeleteAnnouncement();

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<AnnouncementForm>(emptyForm);

  const handleCreate = async () => {
    await createMutation.mutateAsync({
      title: form.title,
      content: form.content,
      priority: form.priority,
      expires_at: form.expires_at || undefined,
    });
    setCreateOpen(false);
    setForm(emptyForm);
  };

  const handleEdit = (ann: { id: string; title: string; content: string; priority: string; expires_at: string | null }) => {
    setEditId(ann.id);
    setForm({
      title: ann.title,
      content: ann.content,
      priority: (ann.priority as AnnouncementForm['priority']) || 'normal',
      expires_at: ann.expires_at?.slice(0, 10) ?? '',
    });
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
    });
    setEditOpen(false);
    setEditId(null);
    setForm(emptyForm);
  };

  const handleDelete = async () => {
    if (!editId) return;
    await deleteMutation.mutateAsync(editId);
    setDeleteOpen(false);
    setEditId(null);
  };

  const sortedAnnouncements = useMemo(
    () => [...(announcements ?? [])].sort((a, b) =>
      new Date(b.published_at ?? b.created_at).getTime() - new Date(a.published_at ?? a.created_at).getTime()
    ),
    [announcements],
  );

  const formFields = (
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
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Announcement Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create, edit, and manage company-wide announcements.
          </p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setCreateOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          New Announcement
        </Button>
      </div>

      <Card className="border-border shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              Loading announcements...
            </div>
          ) : sortedAnnouncements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Megaphone className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No announcements yet.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => { setForm(emptyForm); setCreateOpen(true); }}>
                Create First Announcement
              </Button>
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
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(ann)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => { setEditId(ann.id); setDeleteOpen(true); }}
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
        onOpenChange={setCreateOpen}
        title="Create Announcement"
        description="Publish a new announcement visible to all employees."
        maxWidth="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.title.trim() || !form.content.trim() || createMutation.isPending}>
              {createMutation.isPending ? 'Publishing...' : 'Publish'}
            </Button>
          </div>
        }
        body={formFields}
      />

      {/* Edit Dialog */}
      <ModalScaffold
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Edit Announcement"
        description="Update the announcement details."
        maxWidth="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={!form.title.trim() || !form.content.trim() || updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        }
        body={formFields}
      />

      {/* Delete Confirmation */}
      <ModalScaffold
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Announcement"
        description="This action cannot be undone. The announcement will be permanently removed."
        maxWidth="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        }
        body={
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this announcement? This will remove it for all employees.
          </p>
        }
      />
    </div>
  );
}
