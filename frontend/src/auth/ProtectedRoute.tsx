import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import type { RoleName } from "../types";

export function ProtectedRoute({ roles }: { roles?: RoleName[] }) {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && role && !roles.includes(role)) {
    return <Navigate to={dashboardPathForRole(role)} replace />;
  }

  return <Outlet />;
}

export function dashboardPathForRole(role: RoleName): string {
  if (role === "ADMIN") return "/admin";
  if (role === "HR") return "/hr";
  return "/employee";
}
