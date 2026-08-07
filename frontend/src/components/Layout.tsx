import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import type { RoleName } from "../types";

interface NavItem {
  to: string;
  label: string;
}

function navForRole(role: RoleName): NavItem[] {
  if (role === "ADMIN") {
    return [
      { to: "/admin", label: "Dashboard" },
      { to: "/admin/users", label: "Users" },
      { to: "/admin/roles", label: "Roles" },
      { to: "/admin/permissions", label: "Permissions" },
      { to: "/admin/salaries", label: "Salaries" },
      { to: "/admin/payroll", label: "Payroll analytics" },
      { to: "/admin/attendance", label: "Attendance" },
      { to: "/admin/corrections", label: "Corrections" },
      { to: "/admin/report", label: "Reports" },
      { to: "/admin/profile", label: "Profile" },
    ];
  }
  if (role === "HR") {
    return [
      { to: "/hr", label: "Dashboard" },
      { to: "/hr/employees", label: "Employees" },
      { to: "/hr/salaries", label: "Salaries" },
      { to: "/hr/payroll", label: "Payroll analytics" },
      { to: "/hr/attendance", label: "Attendance" },
      { to: "/hr/corrections", label: "Corrections" },
      { to: "/hr/report", label: "Attendance reports" },
      { to: "/hr/profile", label: "Profile" },
    ];
  }
  return [
    { to: "/employee", label: "Dashboard" },
    { to: "/employee/attendance", label: "Mark attendance" },
    { to: "/employee/report", label: "Attendance report" },
    { to: "/employee/salary", label: "My salary" },
    { to: "/employee/profile", label: "Profile" },
  ];
}

function initials(first?: string, last?: string): string {
  const a = first?.trim().charAt(0) ?? "";
  const b = last?.trim().charAt(0) ?? "";
  return (a + b).toUpperCase() || "U";
}

export function Layout() {
  const { user, role, logout } = useAuth();
  const items = role ? navForRole(role) : [];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">AC</span>
          <div>
            <strong>ACME Pay</strong>
            <small>{role ?? "Workspace"}</small>
          </div>
        </div>
        <nav className="nav" aria-label="Main">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to.split("/").length <= 2}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-chip">
            <span className="user-avatar" aria-hidden>
              {initials(user?.firstName, user?.lastName)}
            </span>
            <p>
              {user?.firstName} {user?.lastName}
              <span>{user?.email}</span>
            </p>
          </div>
          <button type="button" className="btn btn-ghost" onClick={() => void logout()}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
