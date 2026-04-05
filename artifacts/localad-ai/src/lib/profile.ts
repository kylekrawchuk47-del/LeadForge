export interface BusinessProfile {
  businessName: string;
  category: string;
  location: string;
  services: string;
  offer: string;
  tone: string;
}

const KEY = "lf_profile";

export function saveProfile(profile: BusinessProfile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {}
}

export function loadProfile(): BusinessProfile | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as BusinessProfile) : null;
  } catch {
    return null;
  }
}

export function hasProfile(): boolean {
  try {
    return !!localStorage.getItem(KEY);
  } catch {
    return false;
  }
}
