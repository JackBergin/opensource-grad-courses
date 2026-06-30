"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      setError("Supabase is not configured for this environment yet.");
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);
    if (error) { setError(error.message); return; }
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
        <div className="max-w-sm">
          <p className="eyebrow mb-4">Almost there</p>
          <h1 className="font-[family-name:var(--font-display)] font-bold text-4xl mb-6">
            Check your email
          </h1>
          <div className="border-l-2 border-[var(--color-accent)] pl-6 py-2">
            <p className="text-[var(--color-muted)]">
              We sent a confirmation link to <strong>{email}</strong>.
              Click it to activate your account.
            </p>
          </div>
          <p className="mt-8 text-sm text-[var(--color-muted)]">
            Already confirmed?{" "}
            <Link href="/auth/sign-in" className="link">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
      <div className="max-w-sm">
        <p className="eyebrow mb-4">Free account</p>
        <h1 className="font-[family-name:var(--font-display)] font-bold text-4xl mb-2">
          Create account
        </h1>
        <p className="text-[var(--color-muted)] text-base mb-10">
          Track your progress across all eight courses. Always free.
        </p>

        <form onSubmit={handleSignUp} className="space-y-5">
          <div>
            <label className="eyebrow block mb-2">Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="w-full border border-[var(--color-rule)] px-4 py-3 text-sm bg-[var(--color-bg)] focus:outline-none focus:border-[var(--color-ink)]"
            />
          </div>

          <div>
            <label className="eyebrow block mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full border border-[var(--color-rule)] px-4 py-3 text-sm bg-[var(--color-bg)] focus:outline-none focus:border-[var(--color-ink)]"
            />
          </div>

          <div>
            <label className="eyebrow block mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Min. 6 characters"
              className="w-full border border-[var(--color-rule)] px-4 py-3 text-sm bg-[var(--color-bg)] focus:outline-none focus:border-[var(--color-ink)]"
            />
          </div>

          {error && (
            <p className="text-sm text-[var(--color-accent)]">{error}</p>
          )}

          <div className="pt-2">
            <button type="submit" disabled={loading} className="btn">
              {loading ? "Creating account…" : "Create free account"}
            </button>
          </div>
        </form>

        <hr className="rule my-8" />

        <p className="text-sm text-[var(--color-muted)]">
          Already have an account?{" "}
          <Link href="/auth/sign-in" className="link">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
