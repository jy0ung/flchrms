import { Link } from 'react-router-dom';
import { ArrowUpRight, Info } from 'lucide-react';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminPageCapabilities } from '@/hooks/admin/useAdminCapabilities';
import { usePageTitle } from '@/hooks/usePageTitle';
import { DepartmentsPage } from '@/modules/departments';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export default function AdminDepartmentsPage() {
  usePageTitle('Admin · Departments');

  const { role } = useAuth();
  const { capabilities, isLoading } = useAdminPageCapabilities(role);

  if (isLoading) {
    return null;
  }

  if (!capabilities.canManageDepartments) {
    return (
      <AdminAccessDenied
        title="Department management is disabled"
        description="Your account does not have the capability to manage departments."
      />
    );
  }

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Compatibility Route</AlertTitle>
        <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>Department management now lives in the canonical department workspace. This admin path remains available for compatibility.</span>
          <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
            <Link to="/departments">
              Open Department Workspace
              <ArrowUpRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </AlertDescription>
      </Alert>
      <DepartmentsPage entryContext="admin" adminCapabilitiesOverride={capabilities} />
    </div>
  );
}
