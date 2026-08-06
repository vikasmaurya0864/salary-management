import { FormEvent, useEffect, useState } from "react";
import { createRole, deleteRole, listRoles } from "../../api/roles";
import { ErrorBanner } from "../../components/ErrorBanner";
import { Loading } from "../../components/Loading";
import { PageHeader } from "../../components/PageHeader";
import type { Role } from "../../types";
import { getErrorMessage } from "../../utils/errors";

export function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setRoles(await listRoles());
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
      await createRole({ name: name.trim(), description: description.trim() || undefined });
      setName("");
      setDescription("");
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <section>
      <PageHeader title="Roles" subtitle="Canonical roles: ADMIN, HR, EMPLOYEE." />
      <ErrorBanner message={error} />
      <form className="panel form inline-form" onSubmit={onCreate}>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="EMPLOYEE" />
        </label>
        <label>
          Description
          <input value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <button className="btn btn-primary" type="submit">
          Add role
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
                <th>Description</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id}>
                  <td>{role.name}</td>
                  <td>{role.description ?? "—"}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={async () => {
                        try {
                          await deleteRole(role.id);
                          await load();
                        } catch (err) {
                          setError(getErrorMessage(err));
                        }
                      }}
                    >
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
