import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import {
  UserCircle,
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
import { toast } from '@/hooks/use-toast';
import { NotificationSettingsCard } from '@/components/notifications/NotificationSettingsCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const PROFILE_TABS = ['overview', 'edit', 'notifications'] as const;
type ProfileTabValue = (typeof PROFILE_TABS)[number];

function coerceProfileTab(value: string | null): ProfileTabValue {
  return PROFILE_TABS.includes((value ?? '') as ProfileTabValue)
    ? (value as ProfileTabValue)
    : 'overview';
}

export default function Profile() {
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
      toast({
        title: 'Profile updates restricted',
        description: 'System Admin profile edits are limited. Use HR Admin for username alias management.',
        variant: 'destructive',
      });
      return;
    }

    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast({
        title: 'Missing required fields',
        description: 'First name and last name are required.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateMyProfile({
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone.trim() || null,
      });
      toast({
        title: 'Profile updated',
        description: 'Your profile information has been saved.',
      });
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast({
        title: 'Unable to update profile',
        description: 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <Card className="card-stat overflow-hidden border-border/60 shadow-sm">
        <CardContent className="p-0">
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/8 via-background to-accent/10 p-5 sm:p-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
                <UserCircle className="h-4 w-4" />
                Account Workspace
              </div>

              <div className="space-y-1">
                <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight md:text-3xl">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                    <UserCircle className="h-5 w-5" />
                  </span>
                  My Profile
                </h1>
                <p className="text-sm text-muted-foreground sm:text-base">
                  Manage your account profile and notification settings.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Badge className="badge-info capitalize rounded-full px-2.5 py-1">{role}</Badge>
                <Badge
                  className={`${profile.status === 'active' ? 'badge-success' : 'badge-warning'} rounded-full px-2.5 py-1`}
                >
                  {profile.status}
                </Badge>
                {profile.username ? (
                  <Badge variant="outline" className="rounded-full px-2.5 py-1">
                    @{profile.username}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="card-stat border-border/60 shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[auto_1fr_auto] lg:items-center">
            <Avatar className="mx-auto h-20 w-20 sm:h-24 sm:w-24 lg:mx-0">
              <AvatarFallback className="bg-primary text-2xl text-primary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className="text-center lg:text-left">
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                {profile.first_name} {profile.last_name}
              </h2>
              <p className="text-sm text-muted-foreground sm:text-base">{profile.job_title || 'Employee'}</p>
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
              <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Access Role</p>
                  <p className="font-medium capitalize">{role}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm">
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
        <TabsList className="grid h-auto w-full grid-cols-1 gap-1 rounded-xl border border-border/60 bg-muted/30 p-1 sm:grid-cols-3 sm:max-w-2xl">
          <TabsTrigger value="overview" className="rounded-lg">
            Overview
          </TabsTrigger>
          <TabsTrigger value="edit" className="rounded-lg">
            Update Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-lg">
            Notification Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card className="card-stat border-border/60 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Current account profile details used across the HRMS.</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex min-h-[84px] items-center gap-3 rounded-xl border border-border/60 bg-background/70 p-3.5 sm:p-4">
                  <div className="rounded-lg bg-muted/70 p-2">
                    <Briefcase className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Employee ID</p>
                    <p className="font-medium leading-tight">{profile.employee_id || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex min-h-[84px] items-center gap-3 rounded-xl border border-border/60 bg-background/70 p-3.5 sm:p-4">
                  <div className="rounded-lg bg-muted/70 p-2">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="break-all font-medium leading-tight">{profile.email}</p>
                  </div>
                </div>
                <div className="flex min-h-[84px] items-center gap-3 rounded-xl border border-border/60 bg-background/70 p-3.5 sm:p-4">
                  <div className="rounded-lg bg-muted/70 p-2">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium leading-tight">{profile.phone || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex min-h-[84px] items-center gap-3 rounded-xl border border-border/60 bg-background/70 p-3.5 sm:p-4">
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="edit" className="space-y-4">
          <Card className="card-stat border-border/60 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <UserCog className="w-4 h-4" />
                Update Profile
              </CardTitle>
              <CardDescription>
                Update your personal contact details used in the HRMS. Email, employee ID, and username are managed separately.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {isAdminRestrictedEditor && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-700">
                  System Admin profile edits are restricted in this form. Use HR Admin for username alias management.
                </div>
              )}

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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <NotificationSettingsCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
