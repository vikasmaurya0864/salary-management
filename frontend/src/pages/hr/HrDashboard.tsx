import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { PageHeader } from "../../components/PageHeader";

export function HrDashboard() {
  const { user } = useAuth();

  return (
    <section>
      <PageHeader
        title={`Welcome, ${user?.firstName ?? "HR"}`}
        subtitle="Manage people, compensation, and payroll insights for ACME — without spreadsheets."
      />
      <div className="card-grid">
        <Link className="dash-card" to="/hr/employees">
          <h3>Employees</h3>
          <p>Create employees with country, currency, department, and title.</p>
        </Link>
        <Link className="dash-card" to="/hr/salaries">
          <h3>Salaries</h3>
          <p>Set packages, revise pay, and generate monthly payslips.</p>
        </Link>
        <Link className="dash-card" to="/hr/payroll">
          <h3>Payroll analytics</h3>
          <p>Totals and averages by country, currency, department, or role.</p>
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
          <h3>Attendance reports</h3>
          <p>Pull monthly attendance reports for employees.</p>
        </Link>
      </div>
    </section>
  );
}
