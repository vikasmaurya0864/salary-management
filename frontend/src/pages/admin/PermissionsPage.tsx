import { FormEvent, useEffect, useState } from "react";
import { createPermission, deletePermission, listPermissions } from "../../api/permissions";
import { listUsers } from "../../api/users";
import { ErrorBanner } from "../../components/ErrorBanner";
import { Loading } from "../../components/Loading";
import { PageHeader } from "../../components/PageHeader";
import type { HttpMethod, Permission, User } from "../../types";
import { getErrorMessage } from "../../utils/errors";

const COMMON_PATHS = [
  "/api/users",
  "/api/users/:id",
  "/api/roles",
  "/api/roles/:id",
  "/api/attendance",
  "/api/attendance/:id",
  "/api/attendance/report",
  "/api/attendance/corrections",
  "/api/attendance/corrections/:id",
  "/api/attendance/corrections/:id/review",
];

const METHODS: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

export function PermissionsPage() {
  const [items, setItems] = useState<Permission[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ userId: "", path: "/api/attendance", method: "GET" as HttpMethod });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [perms, userPage] = await Promise.all([listPermissions({ limit: 100 }), listUsers(1, 100)]);
      setItems(perms.items);
      setUsers(userPage.items);
      if (!form.userId && userPage.items[0]) {
        setForm((prev) => ({ ...prev, userId: userPage.items[0].id }));
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createPermission({ ...form, status: "ACTIVE" });
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <section>
      <PageHeader
        title="Permissions"
        subtitle="HR and Employees need ACTIVE grants per path + method. Admin bypasses this check."
      />
      <ErrorBanner message={error} />
      <form className="panel form" onSubmit={onCreate}>
        <div className="grid-2">
          <label>
            User
            <select value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} required>
              <option value="">Select user</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName} ({u.role?.name})
                </option>
              ))}
            </select>
          </label>
          <label>
            Method
            <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value as HttpMethod })}>
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Path (route pattern)
          <input list="path-options" value={form.path} onChange={(e) => setForm({ ...form, path: e.target.value })} required />
          <datalist id="path-options">
            {COMMON_PATHS.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </label>
        <button className="btn btn-primary" type="submit">
          Grant permission
        </button>
      </form>

      {loading ? (
        <Loading />
      ) : (
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Method</th>
                <th>Path</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.user ? `${p.user.firstName} ${p.user.lastName}` : p.userId}
                  </td>
                  <td>{p.method}</td>
                  <td>
                    <code>{p.path}</code>
                  </td>
                  <td>{p.status}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={async () => {
                        try {
                          await deletePermission(p.id);
                          await load();
                        } catch (err) {
                          setError(getErrorMessage(err));
                        }
                      }}
                    >
                      Revoke
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
