import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { dashboardPathForRole } from "../auth/ProtectedRoute";
import { ErrorBanner } from "../components/ErrorBanner";
import { getErrorMessage } from "../utils/errors";

export function LoginPage() {
  const { login, isAuthenticated, role } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      await login(email.trim(), password);
      navigate("/");
    } catch (err) {
      setError(getErrorMessage(err, "Login failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <aside className="auth-hero" aria-hidden={false}>
        <div className="auth-hero-inner">
          <span className="brand-mark">AC</span>
          <h1>ACME Pay</h1>
          <p>Compensation and payroll clarity for every team — across countries, in one place.</p>
        </div>
      </aside>
      <div className="auth-panel-wrap">
        <div className="auth-panel">
          <p className="eyebrow">Welcome back</p>
          <h1>Sign in</h1>
          <p className="lede">Use your work email to open your role dashboard.</p>
          <ErrorBanner message={error} />
          <form className="form" onSubmit={onSubmit}>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                placeholder="you@acme.example"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </label>
            <p className="auth-inline-link">
              <Link to="/forgot-password">Forgot password?</Link>
            </p>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <p className="auth-foot">
            New employee? <Link to="/register">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
