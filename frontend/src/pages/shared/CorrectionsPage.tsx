import { useEffect, useState } from "react";
import { listCorrections, reviewCorrection } from "../../api/attendance";
import { useAuth } from "../../auth/AuthContext";
import { ErrorBanner } from "../../components/ErrorBanner";
import { Loading } from "../../components/Loading";
import { PageHeader } from "../../components/PageHeader";
import type { CorrectionRequest } from "../../types";
import { getErrorMessage } from "../../utils/errors";

export function CorrectionsPage({ canReview = false }: { canReview?: boolean }) {
  const { role } = useAuth();
  const reviewEnabled = canReview || role === "ADMIN" || role === "HR";
  const [items, setItems] = useState<CorrectionRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await listCorrections({ page: 1, limit: 50 });
      setItems(data.items);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onReview(id: string, action: "APPROVE" | "REJECT") {
    setError(null);
    try {
      await reviewCorrection(id, { action });
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <section>
      <PageHeader title="Correction requests" subtitle="Claims to fix past attendance (or holiday/absent status)." />
      <ErrorBanner message={error} />
      {loading ? (
        <Loading />
      ) : (
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Requester</th>
                <th>Requested</th>
                <th>Reason</th>
                <th>Status</th>
                {reviewEnabled ? <th>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={reviewEnabled ? 6 : 5}>No correction requests.</td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id}>
                    <td>{row.requestedDate}</td>
                    <td>
                      {row.requester
                        ? `${row.requester.firstName} ${row.requester.lastName}`
                        : row.userId}
                    </td>
                    <td>{row.requestedStatus}</td>
                    <td>{row.reason}</td>
                    <td>
                      <span className={`pill status-${row.status.toLowerCase()}`}>{row.status}</span>
                    </td>
                    {reviewEnabled ? (
                      <td className="row-actions">
                        {row.status === "PENDING" ? (
                          <>
                            <button type="button" className="btn btn-primary" onClick={() => void onReview(row.id, "APPROVE")}>
                              Approve
                            </button>
                            <button type="button" className="btn btn-ghost" onClick={() => void onReview(row.id, "REJECT")}>
                              Reject
                            </button>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                    ) : null}
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
