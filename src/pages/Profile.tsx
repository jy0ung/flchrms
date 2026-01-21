import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { UserCircle, Mail, Phone, Building, Calendar, Briefcase } from 'lucide-react';
import { format } from 'date-fns';

export default function Profile() {
  const { profile, role } = useAuth();

  if (!profile) return null;

  const initials = `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <UserCircle className="w-8 h-8 text-accent" />
          My Profile
        </h1>
        <p className="text-muted-foreground mt-1">View and manage your profile</p>
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
              <div className="flex items-center gap-2 mt-2 justify-center sm:justify-start">
                <Badge className="badge-info capitalize">{role}</Badge>
                <Badge className={profile.status === 'active' ? 'badge-success' : 'badge-warning'}>
                  {profile.status}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="card-stat">
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
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
                <p className="font-medium">{profile.email}</p>
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
    </div>
  );
}
