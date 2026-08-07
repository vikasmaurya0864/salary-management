import { FormEvent, useEffect, useState } from "react";
import { createSalary, generatePayslip, listPayslips, listSalaries } from "../../api/salaries";
import { listUsers } from "../../api/users";
import { useAuth } from "../../auth/AuthContext";
import { ErrorBanner } from "../../components/ErrorBanner";
import { Loading } from "../../components/Loading";
import { PageHeader } from "../../components/PageHeader";
import { PaginationBar } from "../../components/PaginationBar";
import { PAGE_SIZE } from "../../constants";
import type { CurrencyCode, Pagination, Payslip, Salary, User } from "../../types";
import { getErrorMessage } from "../../utils/errors";

const CURRENCIES: CurrencyCode[] = ["USD", "EUR", "GBP", "INR", "AED", "SGD", "AUD", "CAD"];
const EMPTY_PAGINATION: Pagination = { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 };

export function SalariesPage() {
  const { role } = useAuth();
  const canManage = role === "ADMIN" || role === "HR";
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [salaryPagination, setSalaryPagination] = useState<Pagination>(EMPTY_PAGINATION);
  const [payslipPagination, setPayslipPagination] = useState<Pagination>(EMPTY_PAGINATION);
  const [salaryPage, setSalaryPage] = useState(1);
  const [payslipPage, setPayslipPage] = useState(1);
  const [employees, setEmployees] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    userId: "",
    currency: "USD" as CurrencyCode,
    baseSalary: "",
    allowances: "0",
    deductions: "0",
    effectiveFrom: new Date().toISOString().slice(0, 10),
    note: "",
  });
  const [payslipForm, setPayslipForm] = useState({
    userId: "",
    year: String(new Date().getFullYear()),
    month: String(new Date().getMonth() + 1),
  });

  async function loadLists() {
    setLoading(true);
    setError(null);
    try {
      const [salaryResult, payslipResult] = await Promise.all([
        listSalaries({ page: salaryPage, limit: PAGE_SIZE }),
        listPayslips({ page: payslipPage, limit: PAGE_SIZE }),
      ]);
      setSalaries(salaryResult.items);
      setSalaryPagination(salaryResult.pagination);
      setPayslips(payslipResult.items);
      setPayslipPagination(payslipResult.pagination);
      if (canManage) {
        const users = await listUsers(1, PAGE_SIZE);
        setEmployees(users.items.filter((u) => u.role?.name === "EMPLOYEE" || role === "ADMIN"));
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salaryPage, payslipPage]);

  async function onCreateSalary(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createSalary({
        userId: form.userId.trim(),
        currency: form.currency,
        baseSalary: Number(form.baseSalary),
        allowances: Number(form.allowances || 0),
        deductions: Number(form.deductions || 0),
        effectiveFrom: form.effectiveFrom,
        note: form.note || undefined,
      });
      setSalaryPage(1);
      await loadLists();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function onGeneratePayslip(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await generatePayslip({
        userId: payslipForm.userId.trim(),
        year: Number(payslipForm.year),
        month: Number(payslipForm.month),
      });
      setPayslipPage(1);
      await loadLists();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <section>
      <PageHeader
        title="Salaries"
        subtitle={
          canManage
            ? "Set compensation packages and generate monthly payslip snapshots."
            : "Your current package and payslips."
        }
      />
      <ErrorBanner message={error} />

      {canManage ? (
        <>
          <form className="panel form" onSubmit={onCreateSalary}>
            <h3>Create / revise salary package</h3>
            <div className="grid-2">
              <label>
                Employee user ID
                <input
                  list="employee-options"
                  value={form.userId}
                  onChange={(e) => setForm({ ...form, userId: e.target.value })}
                  placeholder="Paste user UUID (or pick from suggestions)"
                  required
                />
                <datalist id="employee-options">
                  {employees.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} ({u.email})
                    </option>
                  ))}
                </datalist>
                <span className="muted">Suggestions show the first {PAGE_SIZE} users only.</span>
              </label>
              <label>
                Currency
                <select
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value as CurrencyCode })}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid-2">
              <label>
                Base salary
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.baseSalary}
                  onChange={(e) => setForm({ ...form, baseSalary: e.target.value })}
                  required
                />
              </label>
              <label>
                Effective from
                <input
                  type="date"
                  value={form.effectiveFrom}
                  onChange={(e) => setForm({ ...form, effectiveFrom: e.target.value })}
                  required
                />
              </label>
            </div>
            <div className="grid-2">
              <label>
                Allowances
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.allowances}
                  onChange={(e) => setForm({ ...form, allowances: e.target.value })}
                />
              </label>
              <label>
                Deductions
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.deductions}
                  onChange={(e) => setForm({ ...form, deductions: e.target.value })}
                />
              </label>
            </div>
            <label>
              Note
              <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </label>
            <button className="btn btn-primary" type="submit">
              Save package
            </button>
          </form>

          <form className="panel form" onSubmit={onGeneratePayslip}>
            <h3>Generate payslip</h3>
            <div className="grid-2">
              <label>
                Employee user ID
                <input
                  list="employee-options"
                  value={payslipForm.userId}
                  onChange={(e) => setPayslipForm({ ...payslipForm, userId: e.target.value })}
                  placeholder="Paste user UUID"
                  required
                />
              </label>
              <label>
                Year / month
                <div className="grid-2">
                  <input
                    type="number"
                    value={payslipForm.year}
                    onChange={(e) => setPayslipForm({ ...payslipForm, year: e.target.value })}
                    required
                  />
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={payslipForm.month}
                    onChange={(e) => setPayslipForm({ ...payslipForm, month: e.target.value })}
                    required
                  />
                </div>
              </label>
            </div>
            <button className="btn btn-primary" type="submit">
              Generate
            </button>
          </form>
        </>
      ) : null}

      {loading ? (
        <Loading />
      ) : (
        <>
          <div className="panel table-wrap">
            <h3>Current / listed packages</h3>
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Currency</th>
                  <th>Base</th>
                  <th>Allowances</th>
                  <th>Deductions</th>
                  <th>From</th>
                  <th>To</th>
                </tr>
              </thead>
              <tbody>
                {salaries.map((s) => (
                  <tr key={s.id}>
                    <td>
                      {s.user ? `${s.user.firstName} ${s.user.lastName}` : s.userId.slice(0, 8)}
                    </td>
                    <td>{s.currency}</td>
                    <td>{s.baseSalary}</td>
                    <td>{s.allowances}</td>
                    <td>{s.deductions}</td>
                    <td>{s.effectiveFrom}</td>
                    <td>{s.effectiveTo ?? "current"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <PaginationBar pagination={salaryPagination} onPageChange={setSalaryPage} disabled={loading} />
          </div>

          <div className="panel table-wrap">
            <h3>Payslips</h3>
            <table>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Period</th>
                  <th>Currency</th>
                  <th>Gross</th>
                  <th>Net</th>
                </tr>
              </thead>
              <tbody>
                {payslips.map((p) => (
                  <tr key={p.id}>
                    <td>{p.user ? `${p.user.firstName} ${p.user.lastName}` : p.userId.slice(0, 8)}</td>
                    <td>
                      {p.year}-{String(p.month).padStart(2, "0")}
                    </td>
                    <td>{p.currency}</td>
                    <td>{p.gross}</td>
                    <td>{p.net}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <PaginationBar pagination={payslipPagination} onPageChange={setPayslipPage} disabled={loading} />
          </div>
        </>
      )}
    </section>
  );
}
