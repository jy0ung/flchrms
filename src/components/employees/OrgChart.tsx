import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEmployees } from '@/hooks/useEmployees';
import { buildOrgTree, type OrgNode } from '@/hooks/useEmployeeLifecycle';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

// ── Node component ───────────────────────────────────────────────────────────
function OrgTreeNode({ node, depth = 0 }: { node: OrgNode; depth?: number }) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center" role="treeitem" aria-expanded={node.children.length > 0}>
      {/* Card */}
      <button
        type="button"
        onClick={() => navigate(`/employees/${node.id}`)}
        className={cn(
          'flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 shadow-sm transition-all',
          'hover:border-primary/40 hover:shadow-md cursor-pointer',
          'min-w-[160px] max-w-[220px] text-left',
        )}
      >
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
            {node.first_name[0]}
            {node.last_name[0]}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">
            {node.first_name} {node.last_name}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            {node.job_title ?? 'No title'}
          </p>
          {node.department_name && (
            <p className="text-[10px] text-muted-foreground/70 truncate">
              {node.department_name}
            </p>
          )}
        </div>
      </button>

      {/* Children */}
      {node.children.length > 0 && (
        <div className="relative mt-6" role="group">
          {/* Vertical connector from parent */}
          <div className="absolute left-1/2 -top-6 w-px h-6 bg-border" />

          {/* Horizontal connector bar */}
          {node.children.length > 1 && (
            <div
              className="absolute top-0 h-px bg-border"
              style={{
                left: `${100 / (node.children.length * 2)}%`,
                right: `${100 / (node.children.length * 2)}%`,
              }}
            />
          )}

          <div className="flex items-start gap-6">
            {node.children.map((child) => (
              <div key={child.id} className="relative flex flex-col items-center">
                {/* Vertical connector to child */}
                <div className="w-px h-4 bg-border" />
                <OrgTreeNode node={child} depth={depth + 1} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export function OrgChart() {
  const { data: employees, isLoading } = useEmployees();

  const roots = useMemo(() => {
    if (!employees) return [];
    return buildOrgTree(employees);
  }, [employees]);

  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Loading organization chart…
        </div>
      </div>
    );
  }

  if (!employees?.length) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No employees found to build organization chart.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-8" role="tree" aria-label="Organization chart">
      <div className="inline-flex flex-col items-center gap-6 min-w-max px-8 py-4">
        {roots.map((root) => (
          <OrgTreeNode key={root.id} node={root} />
        ))}
      </div>
    </div>
  );
}
