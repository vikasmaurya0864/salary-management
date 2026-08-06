import { useEffect, useState } from "react";
import { listAttendance } from "../../api/attendance";
import { ErrorBanner } from "../../components/ErrorBanner";
import { Loading } from "../../components/Loading";
import { PageHeader } from "../../components/PageHeader";
import type { Attendance } from "../../types";
import { getErrorMessage } from "../../utils/errors";

export function AttendanceListPage() {
  const [items, setItems] = useState<Attendance[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const data = await listAttendance({ page: 1, limit: 50 });
        setItems(data.items);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <section>
      <PageHeader title="Attendance" subtitle="Recent attendance records in your access scope." />
      <ErrorBanner message={error} />
      {loading ? (
        <Loading />
      ) : (
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Employee</th>
                <th>Day</th>
                <th>Status</th>
                <th>Hours</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5}>No attendance records found.</td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id}>
                    <td>{row.date}</td>
                    <td>
                      {row.user ? `${row.user.firstName} ${row.user.lastName}` : row.userId}
                    </td>
                    <td>{row.day}</td>
                    <td>
                      <span className={`pill status-${row.status.toLowerCase()}`}>{row.status}</span>
                    </td>
                    <td>{row.workingHours ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
