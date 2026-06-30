import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load root .env
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:54321";
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
export const COURSE_CONTEXT_DIR = path.resolve(
  __dirname,
  "../../",
  process.env.COURSE_CONTEXT_DIR ?? "context/mba_sloan_first_semester_classes"
);
export const ASSESSMENT_CONTEXT_DIR = path.resolve(
  __dirname,
  "../../",
  process.env.ASSESSMENT_CONTEXT_DIR ?? "context/assessments"
);

export function requireSupabaseServiceRoleKey(): string {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌  SUPABASE_SERVICE_ROLE_KEY is not set in .env");
    process.exit(1);
  }

  return SUPABASE_SERVICE_ROLE_KEY;
}
