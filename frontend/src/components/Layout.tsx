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
      { to: "/hr/attendance", label: "Attendance" },
      { to: "/hr/corrections", label: "Corrections" },
      { to: "/hr/report", label: "Reports" },
      { to: "/hr/profile", label: "Profile" },
    ];
  }
  return [
    { to: "/employee", label: "Dashboard" },
    { to: "/employee/attendance", label: "Mark attendance" },
    { to: "/employee/report", label: "Attendance report" },
    { to: "/employee/profile", label: "Profile" },
  ];
}

export function Layout() {
  const { user, role, logout } = useAuth();
  const items = role ? navForRole(role) : [];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">SM</span>
          <div>
            <strong>Salary Portal</strong>
            <small>{role ?? "User"}</small>
          </div>
        </div>
        <nav className="nav">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to.split("/").length <= 2}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <p>
            {user?.firstName} {user?.lastName}
          </p>
          <button type="button" className="btn btn-ghost" onClick={logout}>
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
