import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import Leave from "./pages/Leave";
import Attendance from "./pages/Attendance";
import Training from "./pages/Training";
import Performance from "./pages/Performance";
import Announcements from "./pages/Announcements";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import Documents from "./pages/Documents";
import TeamCalendar from "./pages/TeamCalendar";
import Payroll from "./pages/Payroll";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/leave" element={<Leave />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/training" element={<Training />} />
              <Route path="/performance" element={<Performance />} />
              <Route path="/announcements" element={<Announcements />} />
              <Route path="/calendar" element={<TeamCalendar />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/payroll" element={<Payroll />} />
              <Route path="/profile" element={<Profile />} />
              {/* Protected routes - Admin/HR/Manager/GM/Director only */}
              <Route element={<ProtectedRoute allowedRoles={['admin', 'hr', 'manager', 'general_manager', 'director']} />}>
                <Route path="/employees" element={<Employees />} />
              </Route>
              {/* Admin routes - Admin/HR only */}
              <Route element={<ProtectedRoute allowedRoles={['admin', 'hr']} />}>
                <Route path="/admin" element={<Admin />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
