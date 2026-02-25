import { Briefcase, Shield, UserCog, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export interface AdminStats {
  totalEmployees: number;
  admins: number;
  hrUsers: number;
  managers: number;
}

interface AdminStatsCardsProps {
  stats: AdminStats;
}

export function AdminStatsCards({ stats }: AdminStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="card-stat">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Employees</p>
              <p className="text-2xl font-bold">{stats.totalEmployees}</p>
            </div>
            <Users className="w-8 h-8 text-accent" />
          </div>
        </CardContent>
      </Card>
      <Card className="card-stat">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Admins</p>
              <p className="text-2xl font-bold">{stats.admins}</p>
            </div>
            <Shield className="w-8 h-8 text-red-400" />
          </div>
        </CardContent>
      </Card>
      <Card className="card-stat">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">HR Users</p>
              <p className="text-2xl font-bold">{stats.hrUsers}</p>
            </div>
            <UserCog className="w-8 h-8 text-purple-400" />
          </div>
        </CardContent>
      </Card>
      <Card className="card-stat">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Managers</p>
              <p className="text-2xl font-bold">{stats.managers}</p>
            </div>
            <Briefcase className="w-8 h-8 text-blue-400" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
