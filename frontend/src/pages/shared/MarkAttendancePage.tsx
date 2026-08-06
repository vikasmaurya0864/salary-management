import { FormEvent, useState } from "react";
import { markAttendance } from "../../api/attendance";
import { ErrorBanner } from "../../components/ErrorBanner";
import { PageHeader } from "../../components/PageHeader";
import type { Attendance } from "../../types";
import { getErrorMessage, todayDateOnly } from "../../utils/errors";

export function MarkAttendancePage() {
  const today = todayDateOnly();
  const [status, setStatus] = useState<"PRESENT" | "ABSENT">("PRESENT");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Attendance | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const attendance = await markAttendance(
        status === "ABSENT"
          ? { date: today, status: "ABSENT" }
          : { date: today, status: "PRESENT", checkInTime: now }
      );
      setResult(attendance);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function checkOut() {
    setError(null);
    setLoading(true);
    try {
      const attendance = await markAttendance({
        date: today,
        status: "PRESENT",
        checkOutTime: new Date().toISOString(),
      });
      setResult(attendance);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <PageHeader title="Mark attendance" subtitle={`Today’s date (UTC): ${today}. Mon–Fri only.`} />
      <ErrorBanner message={error} />
      <form className="panel form" onSubmit={onSubmit}>
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as "PRESENT" | "ABSENT")}>
            <option value="PRESENT">Present (check-in)</option>
            <option value="ABSENT">Absent</option>
          </select>
        </label>
        <div className="btn-row">
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Saving…" : status === "ABSENT" ? "Mark absent" : "Check in"}
          </button>
          <button className="btn btn-secondary" type="button" onClick={checkOut} disabled={loading}>
            Check out
          </button>
        </div>
      </form>
      {result ? (
        <div className="panel">
          <h3>Latest record</h3>
          <p>
            {result.date} · {result.day} · <span className={`pill status-${result.status.toLowerCase()}`}>{result.status}</span>
          </p>
          <p>Check in: {result.checkInTime ? new Date(result.checkInTime).toLocaleString() : "—"}</p>
          <p>Check out: {result.checkOutTime ? new Date(result.checkOutTime).toLocaleString() : "—"}</p>
          <p>Working hours: {result.workingHours ?? "—"}</p>
        </div>
      ) : null}
    </section>
  );
}
