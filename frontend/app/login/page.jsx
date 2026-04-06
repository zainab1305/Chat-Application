"use client";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div className="h-screen flex flex-col justify-center items-center gap-4">
      <h1 className="text-2xl font-bold">Login</h1>

      <button
        onClick={() => signIn("google", { callbackUrl: "/chat" })}
        className="bg-black text-white px-6 py-2 rounded"
      >
        Sign in with Google
      </button>
    </div>
  );
}