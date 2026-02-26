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
  const cards = [
    {
      label: 'Total Employees',
      value: stats.totalEmployees,
      icon: Users,
      iconClass: 'text-accent bg-accent/10',
    },
    {
      label: 'Admins',
      value: stats.admins,
      icon: Shield,
      iconClass: 'text-red-500 bg-red-500/10',
    },
    {
      label: 'HR Users',
      value: stats.hrUsers,
      icon: UserCog,
      iconClass: 'text-violet-500 bg-violet-500/10',
    },
    {
      label: 'Managers',
      value: stats.managers,
      icon: Briefcase,
      iconClass: 'text-blue-500 bg-blue-500/10',
    },
  ] as const;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.label} className="card-stat border-border/60 shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-1 text-2xl font-bold sm:text-3xl">{item.value}</p>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.iconClass}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
