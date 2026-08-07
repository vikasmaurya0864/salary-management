import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";
import { dashboardPathForRole, ProtectedRoute } from "./auth/ProtectedRoute";
import { Layout } from "./components/Layout";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { PermissionsPage } from "./pages/admin/PermissionsPage";
import { RolesPage } from "./pages/admin/RolesPage";
import { EmployeeDashboard } from "./pages/employee/EmployeeDashboard";
import { HrDashboard } from "./pages/hr/HrDashboard";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { AttendanceListPage } from "./pages/shared/AttendanceListPage";
import { AttendanceReportPage } from "./pages/shared/AttendanceReportPage";
import { CorrectionsPage } from "./pages/shared/CorrectionsPage";
import { MarkAttendancePage } from "./pages/shared/MarkAttendancePage";
import { ProfilePage } from "./pages/shared/ProfilePage";
import { PayrollAnalyticsPage } from "./pages/shared/PayrollAnalyticsPage";
import { SalariesPage } from "./pages/shared/SalariesPage";
import { UsersPage } from "./pages/shared/UsersPage";

function HomeRedirect() {
  const { isAuthenticated, role } = useAuth();
  if (!isAuthenticated || !role) return <Navigate to="/login" replace />;
  return <Navigate to={dashboardPathForRole(role)} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/" element={<HomeRedirect />} />

      <Route element={<ProtectedRoute roles={["ADMIN"]} />}>
        <Route element={<Layout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<UsersPage title="Users" />} />
          <Route path="/admin/roles" element={<RolesPage />} />
          <Route path="/admin/permissions" element={<PermissionsPage />} />
          <Route path="/admin/salaries" element={<SalariesPage />} />
          <Route path="/admin/payroll" element={<PayrollAnalyticsPage />} />
          <Route path="/admin/attendance" element={<AttendanceListPage />} />
          <Route path="/admin/corrections" element={<CorrectionsPage canReview />} />
          <Route path="/admin/report" element={<AttendanceReportPage allowUserId />} />
          <Route path="/admin/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={["HR"]} />}>
        <Route element={<Layout />}>
          <Route path="/hr" element={<HrDashboard />} />
          <Route path="/hr/employees" element={<UsersPage title="Employees" createRoleDefault="EMPLOYEE" />} />
          <Route path="/hr/salaries" element={<SalariesPage />} />
          <Route path="/hr/payroll" element={<PayrollAnalyticsPage />} />
          <Route path="/hr/attendance" element={<AttendanceListPage />} />
          <Route path="/hr/corrections" element={<CorrectionsPage canReview />} />
          <Route path="/hr/report" element={<AttendanceReportPage allowUserId />} />
          <Route path="/hr/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={["EMPLOYEE"]} />}>
        <Route element={<Layout />}>
          <Route path="/employee" element={<EmployeeDashboard />} />
          <Route path="/employee/attendance" element={<MarkAttendancePage />} />
          <Route path="/employee/report" element={<AttendanceReportPage />} />
          <Route path="/employee/salary" element={<SalariesPage />} />
          <Route path="/employee/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
