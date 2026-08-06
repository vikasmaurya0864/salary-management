import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { dashboardPathForRole } from "../auth/ProtectedRoute";
import { ErrorBanner } from "../components/ErrorBanner";
import { getErrorMessage } from "../utils/errors";

export function RegisterPage() {
  const { register, isAuthenticated, role } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    mobile: "",
    address: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (isAuthenticated && role) {
    return <Navigate to={dashboardPathForRole(role)} replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        mobile: form.mobile.trim(),
        address: form.address.trim() || undefined,
      });
      navigate("/employee");
    } catch (err) {
      setError(getErrorMessage(err, "Registration failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-panel">
        <p className="eyebrow">Salary Management</p>
        <h1>Employee registration</h1>
        <p className="lede">Self-register as an employee. Admin/HR can assign other roles later.</p>
        <ErrorBanner message={error} />
        <form className="form" onSubmit={onSubmit}>
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
            Email
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </label>
          <label>
            Mobile
            <input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} required placeholder="+919876543210" />
          </label>
          <label>
            Address (optional)
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </label>
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={8}
            />
          </label>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>
        <p className="auth-foot">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
