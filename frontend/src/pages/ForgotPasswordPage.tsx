import { FormEvent, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { forgotPassword, resetPassword } from "../api/auth";
import { useAuth } from "../auth/AuthContext";
import { dashboardPathForRole } from "../auth/ProtectedRoute";
import { ErrorBanner } from "../components/ErrorBanner";
import { getErrorMessage } from "../utils/errors";

type Step = "request" | "reset" | "done";

export function ForgotPasswordPage() {
  const { isAuthenticated, role } = useAuth();
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (isAuthenticated && role) {
    return <Navigate to={dashboardPathForRole(role)} replace />;
  }

  async function onRequestOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const result = await forgotPassword(email.trim());
      setMessage(result.message);
      setStep("reset");
    } catch (err) {
      setError(getErrorMessage(err, "Could not send reset code"));
    } finally {
      setLoading(false);
    }
  }

  async function onResetPassword(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const result = await resetPassword({
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
      });
      setMessage(result.message);
      setStep("done");
    } catch (err) {
      setError(getErrorMessage(err, "Could not reset password"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <aside className="auth-hero">
        <div className="auth-hero-inner">
          <span className="brand-mark">AC</span>
          <h1>ACME Pay</h1>
          <p>Reset access with a one-time code sent to your work email.</p>
        </div>
      </aside>
      <div className="auth-panel-wrap">
        <div className="auth-panel">
          <p className="eyebrow">Account recovery</p>
          <h1>Forgot password</h1>
          <p className="lede">
            {step === "request"
              ? "Enter your email and we will send a 6-digit code valid for 10 minutes."
              : step === "reset"
                ? "Enter the code from your email and choose a new password."
                : "Your password has been updated."}
          </p>
          <ErrorBanner message={error} />
          {message ? <div className="banner banner-success">{message}</div> : null}

          {step === "request" ? (
            <form className="form" onSubmit={onRequestOtp}>
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
              <button className="btn btn-primary" type="submit" disabled={loading}>
                {loading ? "Sending…" : "Send reset code"}
              </button>
            </form>
          ) : null}

          {step === "reset" ? (
            <form className="form" onSubmit={onResetPassword}>
              <label>
                Email
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </label>
              <label>
                6-digit code
                <input
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  autoComplete="one-time-code"
                  placeholder="123456"
                />
              </label>
              <label>
                New password
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </label>
              <label>
                Confirm password
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </label>
              <button className="btn btn-primary" type="submit" disabled={loading}>
                {loading ? "Updating…" : "Update password"}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                disabled={loading}
                onClick={() => {
                  setStep("request");
                  setOtp("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setError(null);
                }}
              >
                Resend code
              </button>
            </form>
          ) : null}

          {step === "done" ? (
            <p className="auth-foot">
              <Link to="/login">Back to sign in</Link>
            </p>
          ) : (
            <p className="auth-foot">
              Remembered it? <Link to="/login">Sign in</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
