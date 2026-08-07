import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { PageHeader } from "../../components/PageHeader";

export function EmployeeDashboard() {
  const { user } = useAuth();

  return (
    <section>
      <PageHeader
        title={`Hello, ${user?.firstName ?? "there"}`}
        subtitle="Mark attendance, update your profile, and download your monthly report."
      />
      <div className="card-grid">
        <Link className="dash-card" to="/employee/attendance">
          <h3>Mark attendance</h3>
          <p>Check in / out for today, or mark yourself absent.</p>
        </Link>
        <Link className="dash-card" to="/employee/report">
          <h3>Attendance report</h3>
          <p>View or download reports for the past 6 months.</p>
        </Link>
        <Link className="dash-card" to="/employee/salary">
          <h3>My salary</h3>
          <p>View your current package and payslips.</p>
        </Link>
        <Link className="dash-card" to="/employee/profile">
          <h3>Edit profile</h3>
          <p>Update your name and contact (mobile) details.</p>
        </Link>
      </div>
    </section>
  );
}
