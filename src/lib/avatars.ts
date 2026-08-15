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

export function getAvatarUrl(avatarId?: string | null): string | null {
  if (!avatarId) return null;
  return AVATARS[avatarId] || null;
}
