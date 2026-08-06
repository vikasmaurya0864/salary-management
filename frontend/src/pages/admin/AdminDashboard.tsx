import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { PageHeader } from "../../components/PageHeader";

export function AdminDashboard() {
  const { user } = useAuth();

  return (
    <section>
      <PageHeader
        title={`Welcome, ${user?.firstName ?? "Admin"}`}
        subtitle="Full portal access: users, roles, permissions, attendance, and reports."
      />
      <div className="card-grid">
        <Link className="dash-card" to="/admin/users">
          <h3>Users</h3>
          <p>Create HR/Employee accounts and allocate roles.</p>
        </Link>
        <Link className="dash-card" to="/admin/permissions">
          <h3>Permissions</h3>
          <p>Grant path + method access so HR/Employees can call APIs.</p>
        </Link>
        <Link className="dash-card" to="/admin/attendance">
          <h3>Attendance</h3>
          <p>Review everyone’s attendance and correction claims.</p>
        </Link>
        <Link className="dash-card" to="/admin/report">
          <h3>Reports</h3>
          <p>Download monthly attendance reports for any user.</p>
        </Link>
      </div>
    </section>
  );
}
