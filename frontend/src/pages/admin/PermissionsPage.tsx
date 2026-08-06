import { FormEvent, useEffect, useState } from "react";
import { createPermission, deletePermission, listPermissions } from "../../api/permissions";
import { ErrorBanner } from "../../components/ErrorBanner";
import { Loading } from "../../components/Loading";
import { PageHeader } from "../../components/PageHeader";
import type { HttpMethod, Permission, RoleName } from "../../types";
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
const ROLES: RoleName[] = ["ADMIN", "HR", "EMPLOYEE"];

export function PermissionsPage() {
  const [items, setItems] = useState<Permission[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    role: "EMPLOYEE" as RoleName,
    path: "/api/attendance",
    method: "GET" as HttpMethod,
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const perms = await listPermissions({ limit: 100 });
      setItems(perms.items);
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
    setSuccess(null);
    try {
      await createPermission({
        role: form.role,
        path: form.path,
        method: form.method,
        status: "ACTIVE",
      });
      setSuccess(
        `Granted ${form.method} ${form.path} to every ${form.role} user — including anyone moved into ${form.role} later.`
      );
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <section>
      <PageHeader
        title="Permissions"
        subtitle="Grant a path + method to every user in a role. HR and Employees need an ACTIVE grant to call an endpoint; Admin bypasses this check."
      />
      <ErrorBanner message={error} />
      {success ? <div className="banner banner-success">{success}</div> : null}
      <form className="panel form" onSubmit={onCreate}>
        <h3>Create permission</h3>
        <div className="grid-2">
          <label>
            Role
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as RoleName })} required>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
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
          Create permission
        </button>
      </form>

      {loading ? (
        <Loading />
      ) : (
        <div className="panel table-wrap">
          <table>
            <thead>
              <tr>
                <th>Role</th>
                <th>Method</th>
                <th>Path</th>
                <th>Status</th>
                <th>Created by</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td>{p.role?.name ?? "—"}</td>
                  <td>{p.method}</td>
                  <td>
                    <code>{p.path}</code>
                  </td>
                  <td>{p.status}</td>
                  <td>{p.creator ? `${p.creator.firstName} ${p.creator.lastName}` : "—"}</td>
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
