import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { RouteErrorBoundary } from "@/components/layout/RouteErrorBoundary";
import { SpeedInsights } from "@vercel/speed-insights/react";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
const Leave = lazy(() => import("./pages/Leave"));
const Notifications = lazy(() => import("./pages/Notifications"));
import Attendance from "./pages/Attendance";
import Training from "./pages/Training";
import Performance from "./pages/Performance";
import Announcements from "./pages/Announcements";
import Profile from "./pages/Profile";
const Admin = lazy(() => import("./pages/Admin"));
const Documents = lazy(() => import("./pages/Documents"));
const TeamCalendar = lazy(() => import("./pages/TeamCalendar"));
const Payroll = lazy(() => import("./pages/Payroll"));
import NotFound from "./pages/NotFound";
import { ADMIN_PAGE_ALLOWED_ROLES, EMPLOYEE_DIRECTORY_ALLOWED_ROLES } from "@/lib/permissions";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <RouteErrorBoundary>
            <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading...</div>}>
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
      <SpeedInsights />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
