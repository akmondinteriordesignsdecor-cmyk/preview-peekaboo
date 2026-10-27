// Social links for MiningVault Groups.
export const SOCIALS = {
  x: "https://x.com/minevaultgroups",
  youtube: "https://youtube.com/@miningvaultgroups?si=Ums7HHwligSizINx",
  instagram: "https://instagram.com/miningvaultgroups",
  telegram: "https://t.me/miningvaultgroups",
  whatsappCommunity: "https://chat.whatsapp.com/miningvaultgroups",
};

export const REQUIRED_FOLLOWS = [
  { key: "x", label: "X (Twitter)", url: SOCIALS.x },
  { key: "youtube", label: "YouTube", url: SOCIALS.youtube },
  { key: "instagram", label: "Instagram", url: SOCIALS.instagram },
  { key: "telegram", label: "Telegram channel", url: SOCIALS.telegram },
  { key: "whatsappCommunity", label: "WhatsApp community", url: SOCIALS.whatsappCommunity },
] as const;

const KEY = "mvg_follows";

export function getFollows(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function markFollowed(key: string) {
  const f = getFollows();
  f[key] = true;
  localStorage.setItem(KEY, JSON.stringify(f));
  window.dispatchEvent(new Event("mvg_follows_changed"));
}

export function allFollowed(): boolean {
  const f = getFollows();
  return REQUIRED_FOLLOWS.every((r) => f[r.key]);
}
