import { atom } from 'nanostores';

const STORAGE_KEY = 'chartwave:history';
const MAX_ENTRIES = 100;

interface RecentEntry {
  trackId: string;
  trackTitle: string;
  artistName: string;
  artworkSmall: string;
  playedAt: string;
}

function loadHistory(): RecentEntry[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as RecentEntry[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: RecentEntry[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage full
  }
}

export const $recentlyPlayed = atom<RecentEntry[]>(loadHistory());

export function addToHistory(entry: Omit<RecentEntry, 'playedAt'>): void {
  const current = $recentlyPlayed.get();
  const newEntry: RecentEntry = {
    ...entry,
    playedAt: new Date().toISOString(),
  };

  // Remove duplicate if exists
  const filtered = current.filter((e) => e.trackId !== entry.trackId);
  const updated = [newEntry, ...filtered].slice(0, MAX_ENTRIES);

  $recentlyPlayed.set(updated);
  saveHistory(updated);
}

export type { RecentEntry };
