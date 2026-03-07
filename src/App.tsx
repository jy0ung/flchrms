import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { BrandingProvider } from "@/contexts/BrandingContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { RouteErrorBoundary } from "@/components/layout/RouteErrorBoundary";
import { Loader2 } from "lucide-react";
import Auth from "./pages/Auth";
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Employees = lazy(() => import("./pages/Employees"));
const Departments = lazy(() => import("./pages/Departments"));
const Leave = lazy(() => import("./pages/Leave"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Attendance = lazy(() => import("./pages/Attendance"));
const Training = lazy(() => import("./pages/Training"));
const Performance = lazy(() => import("./pages/Performance"));
const Announcements = lazy(() => import("./pages/Announcements"));
const Profile = lazy(() => import("./pages/Profile"));
const Documents = lazy(() => import("./pages/Documents"));
const TeamCalendar = lazy(() => import("./pages/TeamCalendar"));
const Payroll = lazy(() => import("./pages/Payroll"));
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminEntryRedirect } from "@/components/admin/AdminEntryRedirect";
const AdminDashboardPage = lazy(() => import("./pages/admin/AdminDashboardPage"));
const AdminEmployeesPage = lazy(() => import("./pages/admin/AdminEmployeesPage"));
const AdminDepartmentsPage = lazy(() => import("./pages/admin/AdminDepartmentsPage"));
const AdminRolesPage = lazy(() => import("./pages/admin/AdminRolesPage"));
const AdminLeavePoliciesPage = lazy(() => import("./pages/admin/AdminLeavePoliciesPage"));
const AdminAnnouncementsPage = lazy(() => import("./pages/admin/AdminAnnouncementsPage"));
const AdminAuditLogPage = lazy(() => import("./pages/admin/AdminAuditLogPage"));
const AdminSettingsPage = lazy(() => import("./pages/admin/AdminSettingsPage"));
const AdminQuickActionsPage = lazy(() => import("./pages/admin/AdminQuickActionsPage"));
const EmployeeProfile = lazy(() => import("./pages/EmployeeProfile"));
import NotFound from "./pages/NotFound";
import {
  AUTHENTICATED_APP_ROLES,
  EMPLOYEE_DIRECTORY_ALLOWED_ROLES,
  DOCUMENT_MANAGER_ROLES,
  PERFORMANCE_REVIEW_CONDUCTOR_ROLES,
  MANAGER_AND_ABOVE_ROLES,
} from "@/lib/permissions";



const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 300_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PageLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
);

/** Passes location.pathname as resetKey so the error boundary clears on navigation. */
function LocationAwareErrorBoundary({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  return <RouteErrorBoundary resetKey={location.pathname}>{children}</RouteErrorBoundary>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrandingProvider>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
        <TooltipProvider>
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
            <LocationAwareErrorBoundary>
              <Suspense fallback={<PageLoadingFallback />}>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/auth" element={<Auth />} />
                <Route element={<AppLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/leave" element={<Leave />} />
                  <Route path="/departments" element={<Departments />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/attendance" element={<Attendance />} />
                  <Route path="/training" element={<Training />} />
                  <Route path="/announcements" element={<Announcements />} />
                  <Route path="/profile" element={<Profile />} />
                  {/* Protected routes — role-gated sensitive pages */}
                  <Route element={<ProtectedRoute allowedRoles={PERFORMANCE_REVIEW_CONDUCTOR_ROLES} />}>
                    <Route path="/performance" element={<Performance />} />
                  </Route>
                  <Route element={<ProtectedRoute allowedRoles={MANAGER_AND_ABOVE_ROLES} />}>
                    <Route path="/calendar" element={<TeamCalendar />} />
                  </Route>
                  <Route element={<ProtectedRoute allowedRoles={DOCUMENT_MANAGER_ROLES} />}>
                    <Route path="/documents" element={<Documents />} />
                  </Route>
                  <Route path="/payroll" element={<Payroll />} />
                  {/* Protected routes - Admin/HR/Manager/GM/Director only */}
                  <Route element={<ProtectedRoute allowedRoles={EMPLOYEE_DIRECTORY_ALLOWED_ROLES} />}>
                    <Route path="/employees" element={<Employees />} />
                    <Route path="/employees/:employeeId" element={<EmployeeProfile />} />
                  </Route>
                </Route>
                {/* Admin panel — dedicated layout with its own sidebar */}
                <Route element={<ProtectedRoute allowedRoles={AUTHENTICATED_APP_ROLES} />}>
                  <Route element={<AdminLayout />}>
                    <Route path="/admin" element={<AdminEntryRedirect />} />
                    <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
                    <Route path="/admin/employees" element={<AdminEmployeesPage />} />
                    <Route path="/admin/departments" element={<AdminDepartmentsPage />} />
                    <Route path="/admin/roles" element={<AdminRolesPage />} />
                    <Route path="/admin/leave-policies" element={<AdminLeavePoliciesPage />} />
                    <Route path="/admin/announcements" element={<AdminAnnouncementsPage />} />
                    <Route path="/admin/audit-log" element={<AdminAuditLogPage />} />
                    <Route path="/admin/settings" element={<AdminSettingsPage />} />
                    <Route path="/admin/quick-actions" element={<AdminQuickActionsPage />} />
                  </Route>
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </LocationAwareErrorBoundary>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </BrandingProvider>
  </QueryClientProvider>
);

export default App;
