export const AVATARS: Record<string, string> = {
  "avatar_01": "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix&backgroundColor=b6e3f4",
  "avatar_02": "https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka&backgroundColor=ffdfbf",
  "avatar_03": "https://api.dicebear.com/7.x/adventurer/svg?seed=Jude&backgroundColor=c0aede",
  "avatar_04": "https://api.dicebear.com/7.x/adventurer/svg?seed=Nala&backgroundColor=d1d4f9",
  "avatar_05": "https://api.dicebear.com/7.x/adventurer/svg?seed=Bandit&backgroundColor=b6e3f4",
  "avatar_06": "https://api.dicebear.com/7.x/adventurer/svg?seed=Buster&backgroundColor=ffdfbf",
  "avatar_07": "https://api.dicebear.com/7.x/adventurer/svg?seed=Salem&backgroundColor=c0aede",
  "avatar_08": "https://api.dicebear.com/7.x/adventurer/svg?seed=Mimi&backgroundColor=d1d4f9",
  "avatar_09": "https://api.dicebear.com/7.x/adventurer/svg?seed=Luna&backgroundColor=b6e3f4",
  "avatar_10": "https://api.dicebear.com/7.x/adventurer/svg?seed=Tiger&backgroundColor=ffdfbf",
  "avatar_11": "https://api.dicebear.com/7.x/adventurer/svg?seed=Abby&backgroundColor=c0aede",
  "avatar_12": "https://api.dicebear.com/7.x/adventurer/svg?seed=Sammy&backgroundColor=d1d4f9",
};

/**
 * Resolves avatar URL from either a preset ID (e.g. 'avatar_01') or a custom image URL.
 */
export function getAvatarUrl(avatarIdOrUrl?: string | null): string | null {
  if (!avatarIdOrUrl) return null;
  
  const trimmed = avatarIdOrUrl.trim();
  if (!trimmed) return null;

  // Direct uploaded / external image URL
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }

  // Exact preset match
  if (AVATARS[trimmed]) return AVATARS[trimmed];

  // Normalize formats like 'avatar-1', 'avatar-01', or 'avatar_1' to 'avatar_01'
  const match = trimmed.match(/avatar[-_](\d+)/i);
  if (match) {
    const normalizedKey = `avatar_${match[1].padStart(2, "0")}`;
    return AVATARS[normalizedKey] || null;
  }

  return null;
}

/**
 * Returns SVG/initial fallback background colors
 */
export function getFallbackInitials(name?: string | null): string {
  if (!name) return "U";
  const clean = name.trim();
  if (!clean) return "U";
  return clean.charAt(0).toUpperCase();
}
