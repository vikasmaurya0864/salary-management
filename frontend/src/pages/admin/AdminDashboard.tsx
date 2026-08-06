import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getUserStats } from "../../api/users";
import { useAuth } from "../../auth/AuthContext";
import { ErrorBanner } from "../../components/ErrorBanner";
import { Loading } from "../../components/Loading";
import { PageHeader } from "../../components/PageHeader";
import type { UserStats } from "../../types";
import { getErrorMessage } from "../../utils/errors";

const ROLE_LABELS = { ADMIN: "Admin", HR: "HR", EMPLOYEE: "Employee" } as const;

export function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        setStats(await getUserStats());
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <section>
      <PageHeader
        title={`Welcome, ${user?.firstName ?? "Admin"}`}
        subtitle="Full portal access: users, roles, permissions, attendance, and reports."
      />
      <ErrorBanner message={error} />

      {loading ? (
        <Loading />
      ) : stats ? (
        <>
          <div className="stat-grid">
            <div className="stat">
              <span>Total active</span>
              <strong>{stats.totalActive}</strong>
            </div>
            <div className="stat">
              <span>Total inactive</span>
              <strong>{stats.totalInactive}</strong>
            </div>
            {(Object.keys(ROLE_LABELS) as Array<keyof typeof ROLE_LABELS>).map((roleName) => {
              const counts = stats.byRole[roleName];
              if (!counts) return null;
              return (
                <div className="stat" key={roleName}>
                  <span>{ROLE_LABELS[roleName]} (active / inactive)</span>
                  <strong>
                    {counts.active} / {counts.inactive}
                  </strong>
                </div>
              );
            })}
          </div>
          <p className="hint">
            “Active” = currently employed (not removed). “Inactive” = soft-deleted accounts kept for history.
          </p>
        </>
      ) : null}

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
