import { atom, computed } from 'nanostores';

const STORAGE_KEY = 'chartwave:favorites';

function loadFavorites(): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as string[]) : [];
  } catch {
    return [];
  }
}

function saveFavorites(ids: string[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Storage full or unavailable
  }
}

export const $favorites = atom<string[]>(loadFavorites());

export function toggleFavorite(trackId: string): void {
  const current = $favorites.get();
  const idx = current.indexOf(trackId);
  const updated = idx >= 0
    ? current.filter((id) => id !== trackId)
    : [...current, trackId];
  $favorites.set(updated);
  saveFavorites(updated);
}

export function isFavorite(trackId: string): boolean {
  return $favorites.get().includes(trackId);
}

export const $favoriteCount = computed($favorites, (f) => f.length);
