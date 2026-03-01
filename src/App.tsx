import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { RouteErrorBoundary } from "@/components/layout/RouteErrorBoundary";
import { Loader2 } from "lucide-react";
import Auth from "./pages/Auth";
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Employees = lazy(() => import("./pages/Employees"));
const Leave = lazy(() => import("./pages/Leave"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Attendance = lazy(() => import("./pages/Attendance"));
const Training = lazy(() => import("./pages/Training"));
const Performance = lazy(() => import("./pages/Performance"));
const Announcements = lazy(() => import("./pages/Announcements"));
const Profile = lazy(() => import("./pages/Profile"));
const Admin = lazy(() => import("./pages/Admin"));
const Documents = lazy(() => import("./pages/Documents"));
const TeamCalendar = lazy(() => import("./pages/TeamCalendar"));
const Payroll = lazy(() => import("./pages/Payroll"));
import NotFound from "./pages/NotFound";
import { ADMIN_PAGE_ALLOWED_ROLES, EMPLOYEE_DIRECTORY_ALLOWED_ROLES } from "@/lib/permissions";

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

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <RouteErrorBoundary>
              <Suspense fallback={<PageLoadingFallback />}>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/auth" element={<Auth />} />
                <Route element={<AppLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/leave" element={<Leave />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path="/attendance" element={<Attendance />} />
                  <Route path="/training" element={<Training />} />
                  <Route path="/performance" element={<Performance />} />
                  <Route path="/announcements" element={<Announcements />} />
                  <Route path="/calendar" element={<TeamCalendar />} />
                  <Route path="/documents" element={<Documents />} />
                  <Route path="/payroll" element={<Payroll />} />
                  <Route path="/profile" element={<Profile />} />
                  {/* Protected routes - Admin/HR/Manager/GM/Director only */}
                  <Route element={<ProtectedRoute allowedRoles={EMPLOYEE_DIRECTORY_ALLOWED_ROLES} />}>
                    <Route path="/employees" element={<Employees />} />
                  </Route>
                  {/* Admin routes - Admin/HR/Director */}
                  <Route element={<ProtectedRoute allowedRoles={ADMIN_PAGE_ALLOWED_ROLES} />}>
                    <Route path="/admin" element={<Admin />} />
                  </Route>
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </RouteErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;