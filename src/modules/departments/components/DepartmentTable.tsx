import { type KeyboardEvent } from 'react';

import { format } from 'date-fns';
import { Building2, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import type { DepartmentRecord } from '../types';

interface DepartmentTableProps {
  departments?: DepartmentRecord[];
  loading: boolean;
  canViewSensitiveIdentifiers: boolean;
  onOpenDepartment: (department: DepartmentRecord) => void;
}

function formatDate(value: string) {
  return format(new Date(value), 'MMM d, yyyy');
}

export function DepartmentTable({
  departments,
  loading,
  canViewSensitiveIdentifiers,
  onOpenDepartment,
}: DepartmentTableProps) {
  const handleRowKeyDown = (event: KeyboardEvent<HTMLElement>, department: DepartmentRecord) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpenDepartment(department);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="space-y-3 md:hidden">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="border-border shadow-sm">
              <CardContent className="p-4">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 w-1/3 rounded bg-muted" />
                  <div className="h-3 w-2/3 rounded bg-muted" />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="h-16 rounded bg-muted" />
                    <div className="h-16 rounded bg-muted" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="hidden border-border shadow-sm md:block">
          <CardContent className="p-4">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-14 animate-pulse rounded bg-muted" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!departments?.length) {
    return (
      <Card className="border-dashed border-border/80 shadow-sm">
        <CardContent className="py-14 text-center">
          <Building2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
          <p className="text-sm font-medium">No departments match the current search.</p>
          <p className="mt-1 text-sm text-muted-foreground">Adjust the filters or create a new department.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {departments.map((department) => (
          <Card
            key={department.id}
            className="cursor-pointer border-border shadow-sm transition-colors hover:border-accent/50"
            onClick={() => onOpenDepartment(department)}
            onKeyDown={(event) => handleRowKeyDown(event, department)}
            role="button"
            tabIndex={0}
            aria-label={`Open department record for ${department.name}`}
          >
            <CardContent className="space-y-4 p-4">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{department.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {department.description || 'No department description yet.'}
                    </p>
                  </div>
                  <Badge variant="outline">{department.memberCount} members</Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2">
                  <p className="text-muted-foreground">Manager</p>
                  <p className="mt-1 font-medium">
                    {department.manager ? `${department.manager.first_name} ${department.manager.last_name}` : 'Unassigned'}
                  </p>
                </div>
                <div className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2">
                  <p className="text-muted-foreground">Updated</p>
                  <p className="mt-1 font-medium">{formatDate(department.updated_at)}</p>
                </div>
              </div>

              {department.manager && canViewSensitiveIdentifiers ? (
                <p className="text-xs text-muted-foreground">{department.manager.email}</p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="hidden border-border shadow-sm md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((department) => (
                  <TableRow
                    key={department.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => onOpenDepartment(department)}
                    onKeyDown={(event) => handleRowKeyDown(event, department)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Open department record for ${department.name}`}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{department.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {department.description || 'No department description yet.'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {department.manager ? (
                        <div>
                          <p>{department.manager.first_name} {department.manager.last_name}</p>
                          {canViewSensitiveIdentifiers ? (
                            <p className="text-xs text-muted-foreground">{department.manager.email}</p>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        <Users className="h-3 w-3" />
                        {department.memberCount}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(department.updated_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
