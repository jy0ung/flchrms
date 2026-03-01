import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { usePageTitle } from '@/hooks/usePageTitle';
import {
  Mail,
  Phone,
  Calendar,
  Briefcase,
  Save,
  UserCog,
  Bell,
  ShieldCheck,
  AtSign,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateMyProfile } from '@/hooks/useProfileSettings';
import { toast } from 'sonner';
import { NotificationSettingsCard } from '@/components/notifications/NotificationSettingsCard';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppPageContainer, CardHeaderStandard, DataTableShell, PageHeader, StatusBadge } from '@/components/system';

const PROFILE_TABS = ['overview', 'edit', 'notifications'] as const;
type ProfileTabValue = (typeof PROFILE_TABS)[number];

function coerceProfileTab(value: string | null): ProfileTabValue {
  return PROFILE_TABS.includes((value ?? '') as ProfileTabValue)
    ? (value as ProfileTabValue)
    : 'overview';
}

export default function Profile() {
  usePageTitle('Profile');
  const { profile, role } = useAuth();
  const { updateMyProfile, isUpdating } = useUpdateMyProfile();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<ProfileTabValue>(() =>
    coerceProfileTab(searchParams.get('tab')),
  );
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
  });

  useEffect(() => {
    const nextTab = coerceProfileTab(searchParams.get('tab'));
    setActiveTab((current) => (current === nextTab ? current : nextTab));
  }, [searchParams]);

  useEffect(() => {
    if (!profile) return;
    setForm({
      first_name: profile.first_name ?? '',
      last_name: profile.last_name ?? '',
      phone: profile.phone ?? '',
    });
  }, [profile]);

  if (!profile) return null;

  const initials = `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase();
  const isAdminRestrictedEditor = role === 'admin';

  const hasProfileChanges =
    form.first_name.trim() !== (profile.first_name ?? '').trim() ||
    form.last_name.trim() !== (profile.last_name ?? '').trim() ||
    (form.phone.trim() || '') !== ((profile.phone ?? '').trim() || '');

  const handleTabChange = (value: string) => {
    const tab = coerceProfileTab(value);
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };

  const handleSaveProfile = async () => {
    if (isAdminRestrictedEditor) {
      toast.error('Profile updates restricted', {
        description: 'System Admin profile edits are limited. Use HR Admin for username alias management.',
      });
      return;
    }

    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.error('Missing required fields', {
        description: 'First name and last name are required.',
      });
      return;
    }

    try {
      await updateMyProfile({
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone.trim() || null,
      });
      toast.success('Profile updated', {
        description: 'Your profile information has been saved.',
      });
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Unable to update profile', {
        description: 'Please try again.',
      });
    }
  };

  return (
    <AppPageContainer maxWidth="6xl" spacing="comfortable">
      <PageHeader
        title="My Profile"
        description="Manage your account profile and notification settings."
        actionsSlot={<StatusBadge status={profile.status} />}
      />

      <Card className="border-border shadow-sm">
        <CardHeaderStandard
          title={`${profile.first_name} ${profile.last_name}`}
          description={profile.job_title || 'Employee'}
          className="p-4 pb-2 sm:p-5 sm:pb-2"
          titleClassName="text-lg font-semibold tracking-tight"
          descriptionClassName="text-sm sm:text-base"
        />
        <CardContent className="pt-0 p-4 sm:p-5">
          <div className="grid gap-4 lg:grid-cols-[auto_1fr_auto] lg:items-center">
            <Avatar className="mx-auto h-16 w-16 sm:h-20 sm:w-20 lg:mx-0">
              <AvatarFallback className="bg-primary text-xl text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="text-center lg:text-left">
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                <Badge variant="outline" className="rounded-full px-2.5 py-1">
                  <AtSign className="mr-1 h-3.5 w-3.5" />
                  {profile.username || 'username not set'}
                </Badge>
                {profile.employee_id ? (
                  <Badge variant="outline" className="rounded-full px-2.5 py-1">
                    {profile.employee_id}
                  </Badge>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Access Role</p>
                  <p className="font-medium capitalize">{role}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm">
                <Bell className="h-4 w-4 text-primary" />
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Notifications</p>
                  <p className="font-medium">Managed in Profile</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-5">
        <TabsList className="inline-flex h-auto w-full overflow-x-auto sm:w-auto">
          <TabsTrigger value="overview">
            Overview
          </TabsTrigger>
          <TabsTrigger value="edit">
            Update Profile
          </TabsTrigger>
          <TabsTrigger value="notifications">
            Notification Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <DataTableShell
            title="Personal Information"
            description="Current account profile details used across the HRMS."
            content={
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex min-h-[84px] items-center gap-3 rounded-lg border border-border bg-background p-3.5 sm:p-4">
                  <div className="rounded-lg bg-muted/70 p-2">
                    <Briefcase className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Employee ID</p>
                    <p className="font-medium leading-tight">{profile.employee_id || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex min-h-[84px] items-center gap-3 rounded-lg border border-border bg-background p-3.5 sm:p-4">
                  <div className="rounded-lg bg-muted/70 p-2">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="break-all font-medium leading-tight">{profile.email}</p>
                  </div>
                </div>
                <div className="flex min-h-[84px] items-center gap-3 rounded-lg border border-border bg-background p-3.5 sm:p-4">
                  <div className="rounded-lg bg-muted/70 p-2">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium leading-tight">{profile.phone || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex min-h-[84px] items-center gap-3 rounded-lg border border-border bg-background p-3.5 sm:p-4">
                  <div className="rounded-lg bg-muted/70 p-2">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Hire Date</p>
                    <p className="font-medium leading-tight">
                      {profile.hire_date ? format(new Date(profile.hire_date), 'MMM d, yyyy') : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            }
          />
        </TabsContent>

        <TabsContent value="edit" className="space-y-4">
          <DataTableShell
            title="Update Profile"
            description="Update your personal contact details used in the HRMS. Email, employee ID, and username are managed separately."
            alertBanner={
              isAdminRestrictedEditor ? (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-700">
                  System Admin profile edits are restricted in this form. Use HR Admin for username alias management.
                </div>
              ) : null
            }
            content={
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="profile_first_name">First Name</Label>
                    <Input
                      id="profile_first_name"
                      value={form.first_name}
                      className="rounded-lg"
                      disabled={isAdminRestrictedEditor || isUpdating}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, first_name: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile_last_name">Last Name</Label>
                    <Input
                      id="profile_last_name"
                      value={form.last_name}
                      className="rounded-lg"
                      disabled={isAdminRestrictedEditor || isUpdating}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, last_name: event.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="profile_phone">Phone</Label>
                    <Input
                      id="profile_phone"
                      value={form.phone}
                      placeholder="Optional"
                      className="rounded-lg"
                      disabled={isAdminRestrictedEditor || isUpdating}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, phone: event.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile_email">Email</Label>
                    <Input id="profile_email" value={profile.email} className="rounded-lg" disabled />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    className="h-10 w-full rounded-lg sm:w-auto"
                    onClick={() => void handleSaveProfile()}
                    disabled={isAdminRestrictedEditor || isUpdating || !hasProfileChanges}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isUpdating ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            }
          />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <NotificationSettingsCard />
        </TabsContent>
      </Tabs>
    </AppPageContainer>
  );
}