import { format } from 'date-fns';
import { Building2, ChevronRight, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { WorkspaceStatePanel } from '@/components/workspace/WorkspaceStatePanel';

import type { DepartmentRecord } from '../types';

interface DepartmentTableProps {
  departments?: DepartmentRecord[];
  loading: boolean;
  canViewSensitiveIdentifiers: boolean;
  onOpenDepartment: (department: DepartmentRecord, trigger?: HTMLElement | null) => void;
  embedded?: boolean;
}

function formatDate(value: string) {
  return format(new Date(value), 'MMM d, yyyy');
}

export function DepartmentTable({
  departments,
  loading,
  canViewSensitiveIdentifiers,
  onOpenDepartment,
  embedded = false,
}: DepartmentTableProps) {
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
      <WorkspaceStatePanel
        title="No departments match the current search"
        description="Adjust the search term or create a new department."
        icon={Building2}
      />
    );
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        {departments.map((department) => (
          <Card
            key={department.id}
            className="border-border shadow-sm transition-colors hover:border-accent/50"
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

              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  aria-label={`Open department record for ${department.name}`}
                  onClick={(event) => onOpenDepartment(department, event.currentTarget)}
                >
                  Open record
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className={embedded ? "hidden overflow-x-auto rounded-xl border border-border/60 md:block" : "hidden md:block"}>
        <Card className={embedded ? "border-0 shadow-none" : "border-border shadow-sm"}>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                  <TableHead>Department</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-[124px] text-right">Open</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.map((department) => (
                    <TableRow key={department.id} className="hover:bg-muted/30">
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
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="rounded-full"
                          aria-label={`Open department record for ${department.name}`}
                          onClick={(event) => onOpenDepartment(department, event.currentTarget)}
                        >
                          Open
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
