"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  courseId: string;
  pageId: string;
}

export default function ProgressButton({ courseId, pageId }: Props) {
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      const { data } = await supabase
        .from("progress")
        .select("completed")
        .eq("user_id", user.id)
        .eq("course_page_id", pageId)
        .maybeSingle();

      const row = data as unknown as { completed: boolean } | null;
      setCompleted(row?.completed ?? false);
      setLoading(false);
    }
    init();
  }, [supabase, pageId]);

  const toggle = async () => {
    if (!userId) {
      window.location.href = "/auth/sign-in";
      return;
    }
    const next = !completed;
    setCompleted(next);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("progress") as any).upsert(
      {
        user_id: userId,
        course_id: courseId,
        course_page_id: pageId,
        completed: next,
        completed_at: next ? new Date().toISOString() : null,
      },
      { onConflict: "user_id,course_page_id" }
    );
  };

  if (loading) return null;

  if (!userId) {
    return (
      <a href="/auth/sign-in" className="btn--text text-xs">
        Sign in to track progress
      </a>
    );
  }

  return (
    <button
      onClick={toggle}
      className={`btn text-xs px-4 py-3 ${completed ? "bg-[var(--color-muted)]" : ""}`}
    >
      {completed ? "✓ Completed" : "Mark complete"}
    </button>
  );
}
