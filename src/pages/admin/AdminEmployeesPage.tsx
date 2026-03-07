import { Link } from 'react-router-dom';
import { ArrowUpRight, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminPageCapabilities } from '@/hooks/admin/useAdminCapabilities';
import { EmployeesPage } from '@/modules/employees';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export default function AdminEmployeesPage() {
  const { role } = useAuth();
  const { capabilities, isLoading } = useAdminPageCapabilities(role);

  if (isLoading) {
    return null;
  }

  if (!capabilities.canManageEmployeeProfiles) {
    return (
      <AdminAccessDenied
        title="Employee management is disabled"
        description="Your account does not have the capability to manage employee records."
      />
    );
  }

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Compatibility Route</AlertTitle>
        <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span>Employee management now lives in the canonical employee workspace. This admin path remains available for compatibility.</span>
          <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
            <Link to="/employees">
              Open Employee Workspace
              <ArrowUpRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </AlertDescription>
      </Alert>
      <EmployeesPage entryContext="admin" adminCapabilitiesOverride={capabilities} />
    </div>
  );
}
