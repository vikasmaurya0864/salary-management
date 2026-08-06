import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { PageHeader } from "../../components/PageHeader";

export function HrDashboard() {
  const { user } = useAuth();

  return (
    <section>
      <PageHeader
        title={`Welcome, ${user?.firstName ?? "HR"}`}
        subtitle="Manage employees, attendance, corrections, and reports for your team."
      />
      <div className="card-grid">
        <Link className="dash-card" to="/hr/employees">
          <h3>Employees</h3>
          <p>Create and manage employee accounts.</p>
        </Link>
        <Link className="dash-card" to="/hr/attendance">
          <h3>Attendance</h3>
          <p>View employee attendance records.</p>
        </Link>
        <Link className="dash-card" to="/hr/corrections">
          <h3>Corrections</h3>
          <p>Approve or reject attendance claims.</p>
        </Link>
        <Link className="dash-card" to="/hr/report">
          <h3>Reports</h3>
          <p>Pull monthly reports from employee creation onward.</p>
        </Link>
      </div>
      <p className="hint">
        Note: your account needs ACTIVE permission grants from Admin for each API you use.
      </p>
    </section>
  );
}
