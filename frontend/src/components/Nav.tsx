"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

export default function Nav() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const navLinks = [
    { href: "/courses", label: "Courses" },
    ...(user ? [{ href: "/dashboard", label: "Dashboard" }] : []),
  ];

  return (
    <header className="border-b border-[var(--color-rule)] bg-[var(--color-bg)] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 h-14 flex items-center justify-between">
        {/* Wordmark */}
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] font-bold text-lg tracking-tight leading-none hover:text-[var(--color-accent)] transition-colors"
        >
          MIT Sloan MBA
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-8">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`eyebrow text-[11px] transition-colors ${
                pathname.startsWith(href)
                  ? "text-[var(--color-accent)]"
                  : "hover:text-[var(--color-accent)]"
              }`}
            >
              {label}
            </Link>
          ))}

          {user ? (
            <button onClick={handleSignOut} className="btn--text text-[11px]">
              Sign out
            </button>
          ) : (
            <Link href="/auth/sign-in" className="btn py-2 px-5 text-[11px]">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
