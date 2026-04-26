"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true" style={{ flexShrink: 0 }}>
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

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to register");
      }

      router.push("/login?registered=1");
    } catch (err) {
      setError(err.message || "Failed to register");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <span className="login-glow login-glow-primary" aria-hidden="true" />
      <span className="login-glow login-glow-secondary" aria-hidden="true" />

      <section className="login-stage">
        <div className="login-showcase">
          <p className="dashboard-kicker">Join the workspace</p>
          <h1 className="login-stage-title">Create your account and start collaborating in minutes.</h1>
          <p className="login-stage-copy">
            Set up your profile once, then move between rooms, tasks, and shared resources with a single account.
          </p>

          <div className="login-stage-preview" aria-hidden="true">
            <div className="login-preview-card login-preview-card-main">
              <div className="login-preview-head">
                <span className="ui-dot" />
                <span className="ui-dot" />
                <span className="ui-dot" />
                <p>Quick setup</p>
              </div>
              <div className="login-preview-body">
                <div className="login-preview-stat">
                  <strong>3 steps</strong>
                  <span>to enter your first room</span>
                </div>
                <div className="login-preview-row">
                  <span className="login-preview-pill active">Create profile</span>
                  <span className="login-preview-pill">Join room</span>
                </div>
                <div className="login-preview-message">
                  <span>Ready</span>
                  Chat, tasks, and resources unlock right after sign up.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="login-card">
          <div className="login-brand">
            <div className="login-logo" aria-hidden="true">
              <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
                <rect width="38" height="38" rx="11" fill="#1f7a5a" />
                <path
                  d="M10 14a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-4.5l-4 3.5V23H12a2 2 0 0 1-2-2v-7z"
                  fill="#f0c66e"
                />
                <circle cx="16" cy="17.5" r="1.4" fill="#1f7a5a" />
                <circle cx="22" cy="17.5" r="1.4" fill="#1f7a5a" />
              </svg>
            </div>
            <h1 className="login-title">WorkspaceOne</h1>
            <p className="login-tagline">Create your account to join rooms, track work, and share context.</p>
          </div>

          {error ? (
            <div className="login-alert login-alert-error" role="alert">
              <span aria-hidden="true">!</span>
              {error}
            </div>
          ) : null}

          <button
            type="button"
            id="register-google-btn"
            className="login-google-btn"
            onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <div className="login-divider" aria-hidden="true">
            <span />
            <p>or create with email</p>
            <span />
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="register-name">Name</label>
              <input
                id="register-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
                autoComplete="name"
                required
              />
            </div>

            <div className="login-field">
              <label htmlFor="register-email">Email</label>
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="login-field">
              <label htmlFor="register-password">Password</label>
              <input
                id="register-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                minLength={6}
                required
              />
            </div>

            <button id="register-submit-btn" type="submit" disabled={loading} className="login-submit">
              {loading ? (
                <>
                  <span className="login-spinner" aria-hidden="true" />
                  Creating account...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <p className="login-register">
            Already have an account? <Link href="/login">Sign in</Link>
          </p>

          <footer className="login-footer">
            <a href="#">Privacy Policy</a>
            <span aria-hidden="true">|</span>
            <a href="#">Terms of Service</a>
          </footer>
        </div>
      </section>
    </div>
  );
}
