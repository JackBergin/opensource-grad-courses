"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Suspense } from "react";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";

  const [mode, setMode] = useState<"password" | "magic">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [magicSent, setMagicSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      setError("Supabase is not configured for this environment yet.");
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError(error.message); return; }
    router.push(redirectTo);
    router.refresh();
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      setError("Supabase is not configured for this environment yet.");
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=${redirectTo}`,
      },
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setMagicSent(true);
  };

  if (magicSent) {
    return (
      <div className="border-l-2 border-[var(--color-accent)] pl-6 py-2">
        <p className="eyebrow mb-2">Check your inbox</p>
        <p className="text-[var(--color-muted)] text-base">
          We sent a magic link to <strong>{email}</strong>.
          Click it to sign in — no password needed.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={mode === "password" ? handlePasswordSignIn : handleMagicLink} className="space-y-5">
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

      {mode === "password" && (
        <div>
          <label className="eyebrow block mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            className="w-full border border-[var(--color-rule)] px-4 py-3 text-sm bg-[var(--color-bg)] focus:outline-none focus:border-[var(--color-ink)]"
          />
        </div>
      )}

      {error && (
        <p className="text-sm text-[var(--color-accent)]">{error}</p>
      )}

      <div className="flex items-center gap-4 pt-2">
        <button type="submit" disabled={loading} className="btn">
          {loading
            ? "…"
            : mode === "password"
            ? "Sign in"
            : "Send magic link"}
        </button>
        <button
          type="button"
          onClick={() => { setMode(mode === "password" ? "magic" : "password"); setError(""); }}
          className="btn--text"
        >
          {mode === "password" ? "Use magic link instead" : "Use password instead"}
        </button>
      </div>
    </form>
  );
}

export default function SignInPage() {
  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
      <div className="max-w-sm">
        <p className="eyebrow mb-4">Account</p>
        <h1 className="font-[family-name:var(--font-display)] font-bold text-4xl mb-8">
          Sign in
        </h1>

        <Suspense>
          <SignInForm />
        </Suspense>

        <hr className="rule my-8" />

        <p className="text-sm text-[var(--color-muted)]">
          No account?{" "}
          <Link href="/auth/sign-up" className="link">
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  );
}
