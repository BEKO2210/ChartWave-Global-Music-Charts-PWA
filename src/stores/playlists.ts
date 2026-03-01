import { atom } from 'nanostores';

const STORAGE_KEY = 'chartwave:playlists';

interface Playlist {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: string;
  updatedAt: string;
}

function loadPlaylists(): Playlist[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as Playlist[]) : [];
  } catch {
    return [];
  }
}

function savePlaylists(playlists: Playlist[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(playlists));
  } catch {
    // Storage full
  }
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export const $playlists = atom<Playlist[]>(loadPlaylists());

export function createPlaylist(name: string): Playlist {
  const now = new Date().toISOString();
  const playlist: Playlist = {
    id: generateId(),
    name,
    trackIds: [],
    createdAt: now,
    updatedAt: now,
  };
  const updated = [...$playlists.get(), playlist];
  $playlists.set(updated);
  savePlaylists(updated);
  return playlist;
}

export function addTrackToPlaylist(playlistId: string, trackId: string): void {
  const playlists = $playlists.get().map((p) => {
    if (p.id !== playlistId) return p;
    if (p.trackIds.includes(trackId)) return p;
    return {
      ...p,
      trackIds: [...p.trackIds, trackId],
      updatedAt: new Date().toISOString(),
    };
  });
  $playlists.set(playlists);
  savePlaylists(playlists);
}

export function removePlaylist(playlistId: string): void {
  const updated = $playlists.get().filter((p) => p.id !== playlistId);
  $playlists.set(updated);
  savePlaylists(updated);
}

export type { Playlist };
