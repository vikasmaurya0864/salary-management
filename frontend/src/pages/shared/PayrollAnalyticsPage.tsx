import { useEffect, useState } from "react";
import { downloadSalaryAnalyticsCsv, getSalaryAnalytics } from "../../api/salaries";
import { ErrorBanner } from "../../components/ErrorBanner";
import { Loading } from "../../components/Loading";
import { PageHeader } from "../../components/PageHeader";
import type { SalaryAnalytics } from "../../types";
import { getErrorMessage } from "../../utils/errors";

const GROUPS: SalaryAnalytics["groupBy"][] = ["currency", "country", "department", "role"];

export function PayrollAnalyticsPage() {
  const [groupBy, setGroupBy] = useState<SalaryAnalytics["groupBy"]>("currency");
  const [data, setData] = useState<SalaryAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const analytics = await getSalaryAnalytics(groupBy);
        if (!cancelled) setData(analytics);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [groupBy]);

  async function onExport() {
    setError(null);
    try {
      const blob = await downloadSalaryAnalyticsCsv(groupBy);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payroll-analytics-${groupBy}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <section>
      <PageHeader
        title="Payroll analytics"
        subtitle="Answer how the org pays people — totals and averages by country, currency, department, or role."
      />
      <ErrorBanner message={error} />
      <div className="panel form" style={{ display: "flex", gap: "1rem", alignItems: "end", flexWrap: "wrap" }}>
        <label>
          Group by
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as SalaryAnalytics["groupBy"])}>
            {GROUPS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn btn-primary" onClick={() => void onExport()}>
          Export CSV
        </button>
      </div>

      {loading ? (
        <Loading />
      ) : data ? (
        <>
          <div className="card-grid">
            <div className="dash-card">
              <h3>On payroll</h3>
              <p className="stat">{data.totalEmployeesOnPayroll}</p>
            </div>
            <div className="dash-card">
              <h3>Groups</h3>
              <p className="stat">{data.buckets.length}</p>
            </div>
          </div>
          <div className="panel table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{data.groupBy}</th>
                  <th>Employees</th>
                  <th>Total gross</th>
                  <th>Total net</th>
                  <th>Avg net</th>
                </tr>
              </thead>
              <tbody>
                {data.buckets.map((b) => (
                  <tr key={b.key}>
                    <td>{b.key}</td>
                    <td>{b.employeeCount}</td>
                    <td>{b.totalGross.toLocaleString()}</td>
                    <td>{b.totalNet.toLocaleString()}</td>
                    <td>{b.averageNet.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </section>
  );
}
