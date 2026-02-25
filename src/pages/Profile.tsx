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
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <UserCircle className="w-8 h-8 text-accent" />
          My Profile
        </h1>
        <p className="text-muted-foreground mt-1">Manage your account profile and notification settings</p>
      </div>

      <Card className="card-stat">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <Avatar className="w-24 h-24">
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left">
              <h2 className="text-2xl font-bold">{profile.first_name} {profile.last_name}</h2>
              <p className="text-muted-foreground">{profile.job_title || 'Employee'}</p>
              <div className="flex items-center gap-2 mt-2 justify-center sm:justify-start flex-wrap">
                <Badge className="badge-info capitalize">{role}</Badge>
                <Badge className={profile.status === 'active' ? 'badge-success' : 'badge-warning'}>
                  {profile.status}
                </Badge>
                {profile.username && <Badge variant="outline">@{profile.username}</Badge>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="edit">Update Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notification Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card className="card-stat">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Current account profile details used across the HRMS.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <Briefcase className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Employee ID</p>
                    <p className="font-medium">{profile.employee_id || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium break-all">{profile.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <Phone className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{profile.phone || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Hire Date</p>
                    <p className="font-medium">
                      {profile.hire_date ? format(new Date(profile.hire_date), 'MMM d, yyyy') : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="edit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserCog className="w-4 h-4" />
                Update Profile
              </CardTitle>
              <CardDescription>
                Update your personal contact details used in the HRMS. Email, employee ID, and username are managed separately.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isAdminRestrictedEditor && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-700">
                  System Admin profile edits are restricted in this form. Use HR Admin for username alias management.
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="profile_first_name">First Name</Label>
                  <Input
                    id="profile_first_name"
                    value={form.first_name}
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
                    disabled={isAdminRestrictedEditor || isUpdating}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, last_name: event.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="profile_phone">Phone</Label>
                  <Input
                    id="profile_phone"
                    value={form.phone}
                    placeholder="Optional"
                    disabled={isAdminRestrictedEditor || isUpdating}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, phone: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile_email">Email</Label>
                  <Input id="profile_email" value={profile.email} disabled />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
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
