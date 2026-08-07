import { FormEvent, useEffect, useState } from "react";
import { createUser, deleteUser, listUsers, updateUserRole } from "../../api/users";
import { useAuth } from "../../auth/AuthContext";
import { ErrorBanner } from "../../components/ErrorBanner";
import { Loading } from "../../components/Loading";
import { PageHeader } from "../../components/PageHeader";
import { PaginationBar } from "../../components/PaginationBar";
import { PAGE_SIZE } from "../../constants";
import type { CurrencyCode, Pagination, RoleName, User } from "../../types";
import { getErrorMessage } from "../../utils/errors";

const CURRENCIES: CurrencyCode[] = ["USD", "EUR", "GBP", "INR", "AED", "SGD", "AUD", "CAD"];

const EMPTY_PAGINATION: Pagination = { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 };

export function UsersPage({ title = "Users", createRoleDefault = "EMPLOYEE" as RoleName }) {
  const { role } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination>(EMPTY_PAGINATION);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    mobile: "",
    role: createRoleDefault,
    country: "",
    currency: "USD" as CurrencyCode,
    department: "",
    jobTitle: "",
  });

  async function load(nextPage = page) {
    setLoading(true);
    setError(null);
    try {
      const data = await listUsers(nextPage, PAGE_SIZE);
      setUsers(data.items);
      setPagination(data.pagination);
      setPage(data.pagination.page);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when page changes
  }, [page]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createUser({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        mobile: form.mobile.trim(),
        role: form.role,
        country: form.country.trim() ? form.country.trim().toUpperCase() : null,
        currency: form.currency,
        department: form.department.trim() || null,
        jobTitle: form.jobTitle.trim() || null,
      });
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        mobile: "",
        role: createRoleDefault,
        country: "",
        currency: "USD",
        department: "",
        jobTitle: "",
      });
      setPage(1);
      await load(1);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function onRoleChange(id: string, nextRole: "HR" | "EMPLOYEE") {
    setError(null);
    try {
      await updateUserRole(id, nextRole);
      await load(page);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Soft-delete this user?")) return;
    setError(null);
    try {
      await deleteUser(id);
      await load(page);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <section>
      <PageHeader title={title} subtitle="Manage accounts visible to your role." />
      <ErrorBanner message={error} />

      <form className="panel form" onSubmit={onCreate}>
        <h3>Create user</h3>
        <div className="grid-2">
          <label>
            First name
            <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
          </label>
          <label>
            Last name
            <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
          </label>
        </div>
        <div className="grid-2">
          <label>
            Email
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </label>
          <label>
            Mobile
            <input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} required />
          </label>
        </div>
        <div className="grid-2">
          <label>
            Password
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
          </label>
          <label>
            Role
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as RoleName })}
              disabled={role === "HR"}
            >
              {role === "ADMIN" ? <option value="HR">HR</option> : null}
              <option value="EMPLOYEE">Employee</option>
            </select>
          </label>
        </div>
        <div className="grid-2">
          <label>
            Country (ISO-2)
            <input
              value={form.country}
              maxLength={2}
              placeholder="IN"
              onChange={(e) => setForm({ ...form, country: e.target.value })}
            />
          </label>
          <label>
            Currency
            <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value as CurrencyCode })}>
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
            Department
            <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          </label>
          <label>
            Job title
            <input value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} />
          </label>
        </div>
        <button className="btn btn-primary" type="submit">
          Create
        </button>
      </form>

      {loading ? (
        <Loading />
      ) : (
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Country</th>
                <th>Currency</th>
                <th>Dept</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    {u.firstName} {u.lastName}
                  </td>
                  <td>{u.email}</td>
                  <td>{u.country ?? "—"}</td>
                  <td>{u.currency ?? "—"}</td>
                  <td>{u.department ?? "—"}</td>
                  <td>{u.role?.name ?? "—"}</td>
                  <td className="row-actions">
                    {role === "ADMIN" && u.role?.name !== "ADMIN" ? (
                      <select
                        value={u.role?.name === "HR" ? "HR" : "EMPLOYEE"}
                        onChange={(e) => void onRoleChange(u.id, e.target.value as "HR" | "EMPLOYEE")}
                      >
                        <option value="HR">HR</option>
                        <option value="EMPLOYEE">Employee</option>
                      </select>
                    ) : null}
                    <button type="button" className="btn btn-ghost" onClick={() => void onDelete(u.id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationBar pagination={pagination} onPageChange={setPage} disabled={loading} />
        </div>
      )}
    </section>
  );
}
