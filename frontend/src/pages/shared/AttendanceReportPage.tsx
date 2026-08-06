import { FormEvent, useState } from "react";
import { downloadAttendanceReportCsv, getAttendanceReport } from "../../api/attendance";
import { useAuth } from "../../auth/AuthContext";
import { ErrorBanner } from "../../components/ErrorBanner";
import { Loading } from "../../components/Loading";
import { PageHeader } from "../../components/PageHeader";
import type { AttendanceReport } from "../../types";
import { getErrorMessage } from "../../utils/errors";

export function AttendanceReportPage({ allowUserId = false }: { allowUserId?: boolean }) {
  const { user } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getUTCMonth() + 1);
  const [year, setYear] = useState(now.getUTCFullYear());
  const [userId, setUserId] = useState("");
  const [report, setReport] = useState<AttendanceReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadReport(e?: FormEvent) {
    e?.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await getAttendanceReport({
        month,
        year,
        userId: allowUserId && userId.trim() ? userId.trim() : undefined,
      });
      setReport(data);
    } catch (err) {
      setReport(null);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function onDownload() {
    setError(null);
    try {
      await downloadAttendanceReportCsv({
        month,
        year,
        userId: allowUserId && userId.trim() ? userId.trim() : undefined,
      });
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <section>
      <PageHeader
        title="Attendance report"
        subtitle={
          allowUserId
            ? "View or download monthly attendance for any employee."
            : "Download your attendance for up to the previous 6 months."
        }
      />
      <ErrorBanner message={error} />
      <form className="panel form inline-form" onSubmit={loadReport}>
        <label>
          Month
          <input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Number(e.target.value))} required />
        </label>
        <label>
          Year
          <input type="number" min={2000} max={2100} value={year} onChange={(e) => setYear(Number(e.target.value))} required />
        </label>
        {allowUserId ? (
          <label>
            User ID (optional)
            <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder={user?.id ?? "uuid"} />
          </label>
        ) : null}
        <div className="btn-row">
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Loading…" : "View report"}
          </button>
          <button className="btn btn-secondary" type="button" onClick={onDownload}>
            Download CSV
          </button>
        </div>
      </form>

      {loading ? <Loading /> : null}

      {report ? (
        <div className="stack">
          <div className="stat-grid">
            <div className="stat">
              <span>Present</span>
              <strong>{report.summary.presentDays}</strong>
            </div>
            <div className="stat">
              <span>Absent</span>
              <strong>{report.summary.absentDays}</strong>
            </div>
            <div className="stat">
              <span>Holiday</span>
              <strong>{report.summary.holidayDays}</strong>
            </div>
            <div className="stat">
              <span>Unmarked</span>
              <strong>{report.summary.unmarkedDays}</strong>
            </div>
            <div className="stat">
              <span>Working hours</span>
              <strong>{report.summary.totalWorkingHours}</strong>
            </div>
          </div>
          <div className="panel table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Status</th>
                  <th>Check in</th>
                  <th>Check out</th>
                  <th>Hours</th>
                </tr>
              </thead>
              <tbody>
                {report.records.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No attendance rows for this month.</td>
                  </tr>
                ) : (
                  report.records.map((row) => (
                    <tr key={row.date}>
                      <td>{row.date}</td>
                      <td>{row.day}</td>
                      <td>
                        <span className={`pill status-${row.status.toLowerCase()}`}>{row.status}</span>
                      </td>
                      <td>{row.checkInTime ? new Date(row.checkInTime).toLocaleString() : "—"}</td>
                      <td>{row.checkOutTime ? new Date(row.checkOutTime).toLocaleString() : "—"}</td>
                      <td>{row.workingHours ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
