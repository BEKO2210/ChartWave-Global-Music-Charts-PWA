import { atom, computed } from 'nanostores';

interface TrackInfo {
  id: string;
  title: string;
  artistName: string;
  artistSlug: string;
  albumTitle?: string;
  duration?: number;
  previewUrl: string | null;
  artwork: {
    small: string;
    medium: string;
    large: string;
    xl?: string;
    placeholder: string;
  };
  links: {
    lastfm?: string;
    itunes?: string;
  };
}

export const $currentTrack = atom<TrackInfo | null>(null);
export const $queue = atom<TrackInfo[]>([]);
export const $queueIndex = atom<number>(0);
export const $isPlaying = atom<boolean>(false);
export const $isLoading = atom<boolean>(false);
export const $progress = atom<number>(0);
export const $currentTime = atom<number>(0);
export const $duration = atom<number>(30);
export const $volume = atom<number>(0.8);
export const $isMuted = atom<boolean>(false);
export const $repeatMode = atom<'none' | 'one' | 'all'>('none');
export const $isShuffle = atom<boolean>(false);
export const $playerVisible = atom<boolean>(false);
export const $fullScreenOpen = atom<boolean>(false);
export const $queueDrawerOpen = atom<boolean>(false);

export const $hasNext = computed([$queue, $queueIndex, $repeatMode], (q, i, r) =>
  r === 'all' ? q.length > 0 : i < q.length - 1
);

export const $hasPrev = computed($queueIndex, (i) => i > 0);

export const $progressPercent = computed($progress, (p) => `${(p * 100).toFixed(2)}%`);

export const $currentTimeFormatted = computed($currentTime, (t) => {
  const s = Math.floor(t);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
});

export const $durationFormatted = computed($duration, (d) => {
  const s = Math.floor(d);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
});

export const $queueLength = computed($queue, (q) => q.length);

export const $effectiveVolume = computed([$volume, $isMuted], (v, m) => (m ? 0 : v));

export type { TrackInfo };
