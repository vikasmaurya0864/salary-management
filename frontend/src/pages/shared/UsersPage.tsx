import { FormEvent, useEffect, useState } from "react";
import { createUser, deleteUser, listUsers, updateUserRole } from "../../api/users";
import { useAuth } from "../../auth/AuthContext";
import { ErrorBanner } from "../../components/ErrorBanner";
import { Loading } from "../../components/Loading";
import { PageHeader } from "../../components/PageHeader";
import type { RoleName, User } from "../../types";
import { getErrorMessage } from "../../utils/errors";

export function UsersPage({ title = "Users", createRoleDefault = "EMPLOYEE" as RoleName }) {
  const { role } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    mobile: "",
    role: createRoleDefault,
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await listUsers(1, 100);
      setUsers(data.items);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

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
      });
      setForm({ firstName: "", lastName: "", email: "", password: "", mobile: "", role: createRoleDefault });
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function onRoleChange(id: string, nextRole: "HR" | "EMPLOYEE") {
    setError(null);
    try {
      await updateUserRole(id, nextRole);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Soft-delete this user?")) return;
    setError(null);
    try {
      await deleteUser(id);
      await load();
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
                <th>Mobile</th>
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
                  <td>{u.mobile}</td>
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
        </div>
      )}
    </section>
  );
}
