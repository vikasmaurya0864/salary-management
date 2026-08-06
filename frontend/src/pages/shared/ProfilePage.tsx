import { FormEvent, useState } from "react";
import { updateUser } from "../../api/users";
import { useAuth } from "../../auth/AuthContext";
import { ErrorBanner } from "../../components/ErrorBanner";
import { PageHeader } from "../../components/PageHeader";
import { getErrorMessage } from "../../utils/errors";

export function ProfilePage() {
  const { user, updateLocalUser } = useAuth();
  const [form, setForm] = useState({
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    mobile: user?.mobile ?? "",
    address: user?.address ?? "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    const current = user;
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const payload: Parameters<typeof updateUser>[1] = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        mobile: form.mobile.trim(),
        address: form.address.trim(),
      };
      if (form.password.trim()) payload.password = form.password;
      const updated = await updateUser(current.id, payload);
      updateLocalUser({ ...updated, role: updated.role ?? current.role });
      setForm((prev) => ({ ...prev, password: "" }));
      setSuccess("Profile updated.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (!user) return null;

  return (
    <section>
      <PageHeader title="Profile" subtitle="Update your name and contact details." />
      <ErrorBanner message={error} />
      {success ? <div className="banner banner-success">{success}</div> : null}
      <form className="panel form" onSubmit={onSubmit}>
        <label>
          Email (read-only)
          <input value={user.email} disabled />
        </label>
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
        <label>
          Mobile / contact
          <input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} required />
        </label>
        <label>
          Address
          <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </label>
        <label>
          New password (optional)
          <input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            minLength={8}
            placeholder="Leave blank to keep current"
          />
        </label>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? "Saving…" : "Save changes"}
        </button>
      </form>
    </section>
  );
}
