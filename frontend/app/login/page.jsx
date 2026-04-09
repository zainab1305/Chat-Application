"use client";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useState } from "react";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md border rounded-lg p-6 space-y-4">
        <h1 className="text-2xl font-bold">Login</h1>

        {isRegistered && (
          <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2">
            Registration successful. You can login now.
          </p>
        )}

        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
            {error}
          </p>
        )}

        <form className="space-y-3" onSubmit={handleCredentialsLogin}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full border rounded px-3 py-2"
            required
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full border rounded px-3 py-2"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white px-6 py-2 rounded disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Login with Email"}
          </button>
        </form>

        <div className="flex items-center gap-2">
          <div className="h-px bg-gray-300 flex-1" />
          <span className="text-xs text-gray-500">OR</span>
          <div className="h-px bg-gray-300 flex-1" />
        </div>

        <button
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
          className="w-full bg-white border text-black px-6 py-2 rounded"
        >
          Sign in with Google
        </button>

        <p className="text-sm text-center">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center px-4">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}