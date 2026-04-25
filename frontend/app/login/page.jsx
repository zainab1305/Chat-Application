"use client";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

/* ── Google "G" logo as inline SVG ─────────────────────────── */
function GoogleIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 48 48"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.01 24.01 0 0 0 0 21.56l7.98-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

/* ── Inner login form (needs useSearchParams → Suspense) ───── */
function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isRegistered = searchParams.get("registered") === "1";

  const handleCredentialsLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/dashboard",
    });

    setLoading(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    router.push("/dashboard");
  };

  return (
    <div className="login-page">
      {/* Decorative background orbs */}
      <span className="login-orb login-orb--green" aria-hidden="true" />
      <span className="login-orb login-orb--gold" aria-hidden="true" />

      <div className="login-card">
        {/* ── Logo / Branding ────────────────────────── */}
        <div className="login-brand">
          <div className="login-logo" aria-hidden="true">
            <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
              <rect width="38" height="38" rx="11" fill="#115e42" />
              <path
                d="M10 14a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-4.5l-4 3.5V23H12a2 2 0 0 1-2-2v-7z"
                fill="#f0c66e"
              />
              <circle cx="16" cy="17.5" r="1.4" fill="#115e42" />
              <circle cx="22" cy="17.5" r="1.4" fill="#115e42" />
            </svg>
          </div>
          <h1 className="login-title">WorkspaceOne</h1>
          <p className="login-tagline">
            Your team&rsquo;s hub for chat, tasks &amp; resources.
          </p>
        </div>

        {/* ── Alerts ─────────────────────────────────── */}
        {isRegistered && (
          <div className="login-alert login-alert--success" role="status">
            <span aria-hidden="true">✓</span>
            Account created — you can sign in now.
          </div>
        )}
        {error && (
          <div className="login-alert login-alert--error" role="alert">
            <span aria-hidden="true">!</span>
            {error}
          </div>
        )}

        {/* ── Google button ──────────────────────────── */}
        <button
          type="button"
          id="login-google-btn"
          className="login-google-btn"
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        >
          <GoogleIcon />
          Continue with Google
        </button>

        {/* ── Divider ────────────────────────────────── */}
        <div className="login-divider" aria-hidden="true">
          <span />
          <p>or sign in with email</p>
          <span />
        </div>

        {/* ── Credentials form ───────────────────────── */}
        <form className="login-form" onSubmit={handleCredentialsLogin}>
          <div className="login-field">
            <label htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="login-password">Password</label>
            <div className="login-password-wrap">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button
            id="login-submit-btn"
            type="submit"
            disabled={loading}
            className="login-submit"
          >
            {loading ? (
              <>
                <span className="login-spinner" aria-hidden="true" />
                Signing in…
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* ── Register link ──────────────────────────── */}
        <p className="login-register">
          Don&apos;t have an account?{" "}
          <Link href="/register">Create one</Link>
        </p>

        {/* ── Footer ─────────────────────────────────── */}
        <footer className="login-footer">
          <a href="#">Privacy Policy</a>
          <span aria-hidden="true">·</span>
          <a href="#">Terms of Service</a>
        </footer>
      </div>
    </div>
  );
}

/* ── Page wrapper ──────────────────────────────────────────── */
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="login-page">
          <div className="login-card" style={{ textAlign: "center", padding: 40 }}>
            Loading…
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}