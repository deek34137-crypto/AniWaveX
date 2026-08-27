import { User } from "@supabase/supabase-js";

// Default admin emails configured for repository and project owner
export const DEFAULT_ADMIN_EMAILS = [
  "deek34137@gmail.com",
  "abhiy637hw@gmail.com",
];

export function getAdminEmails(): string[] {
  const envAdmins = process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS || "";
  const parsed = envAdmins.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  const combined = new Set([...DEFAULT_ADMIN_EMAILS.map((e) => e.toLowerCase()), ...parsed]);
  return Array.from(combined);
}

export function isAdminUser(user: User | null | undefined): boolean {
  if (!user || !user.email) return false;
  const email = user.email.toLowerCase().trim();
  const adminEmails = getAdminEmails();

  if (adminEmails.includes(email)) return true;
  if (user.user_metadata?.is_admin === true) return true;
  if (user.app_metadata?.is_admin === true) return true;
  return false;
}
