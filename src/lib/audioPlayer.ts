import { Howl, Howler } from 'howler';
import {
  $currentTrack,
  $queue,
  $queueIndex,
  $isPlaying,
  $isLoading,
  $progress,
  $currentTime,
  $duration,
  $volume,
  $isMuted,
  $repeatMode,
  $isShuffle,
  $playerVisible,
} from '../stores/player';
import type { TrackInfo } from '../stores/player';

class AudioPlayerManager {
  private howl: Howl | null = null;
  private progressInterval: ReturnType<typeof setInterval> | null = null;
  private preloadedHowl: Howl | null = null;

  async loadAndPlay(track: TrackInfo): Promise<void> {
    if (!track.previewUrl) {
      this.dispatchError(track, 'No preview available for this track');
      return;
    }

    this.stopProgressTracking();
    this.howl?.unload();

    $isLoading.set(true);
    $currentTrack.set(track);
    $playerVisible.set(true);
    $duration.set(30);
    $progress.set(0);
    $currentTime.set(0);

    this.howl = new Howl({
      src: [track.previewUrl],
      html5: true,
      format: ['mp3'],
      volume: $isMuted.get() ? 0 : $volume.get(),
      preload: true,
      onload: () => {
        $isLoading.set(false);
        const dur = this.howl?.duration();
        if (dur != null) $duration.set(dur);
        this.preloadNext();
      },
      onplay: () => {
        $isPlaying.set(true);
        $isLoading.set(false);
        this.startProgressTracking();
        this.updateMediaSession(track);
      },
      onpause: () => {
        $isPlaying.set(false);
        this.stopProgressTracking();
      },
      onstop: () => {
        $isPlaying.set(false);
        $progress.set(0);
        $currentTime.set(0);
      },
      onend: () => {
        this.handleTrackEnd();
      },
      onloaderror: (_id, err) => {
        $isLoading.set(false);
        this.dispatchError(track, `Load error: ${String(err)}`);
      },
      onplayerror: (_id, err) => {
        $isLoading.set(false);
        this.dispatchError(track, `Play error: ${String(err)}`);
      },
    });

    this.howl.play();
  }

  private startProgressTracking(): void {
    this.progressInterval = setInterval(() => {
      if (!this.howl) return;
      const seek = this.howl.seek() as number;
      const dur = this.howl.duration() || 30;
      $currentTime.set(seek);
      $progress.set(seek / dur);
    }, 100);
  }

  private stopProgressTracking(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  private handleTrackEnd(): void {
    $isPlaying.set(false);
    this.stopProgressTracking();
    const repeat = $repeatMode.get();

    if (repeat === 'one') {
      this.howl?.seek(0);
      this.howl?.play();
      return;
    }

    if (repeat === 'all' || $queueIndex.get() < $queue.get().length - 1) {
      this.playNext();
    } else {
      $progress.set(0);
      $currentTime.set(0);
    }
  }

  private preloadNext(): void {
    const queue = $queue.get();
    const nextIndex = $queueIndex.get() + 1;
    const nextTrack = queue[nextIndex];
    if (!nextTrack?.previewUrl) return;

    this.preloadedHowl?.unload();
    this.preloadedHowl = new Howl({
      src: [nextTrack.previewUrl],
      html5: true,
      preload: true,
    });
  }

  play(): void {
    this.howl?.play();
  }

  pause(): void {
    this.howl?.pause();
  }

  toggle(): void {
    if ($isPlaying.get()) {
      this.pause();
    } else {
      this.play();
    }
  }

  seek(percent: number): void {
    if (!this.howl) return;
    const dur = this.howl.duration() || 30;
    this.howl.seek(percent * dur);
    $progress.set(percent);
    $currentTime.set(percent * dur);
  }

  setVolume(v: number): void {
    const clamped = Math.max(0, Math.min(1, v));
    $volume.set(clamped);
    if (!$isMuted.get()) {
      Howler.volume(clamped);
    }
  }

  toggleMute(): void {
    const muted = !$isMuted.get();
    $isMuted.set(muted);
    Howler.volume(muted ? 0 : $volume.get());
  }

  async playNext(): Promise<void> {
    const queue = $queue.get();
    if (queue.length === 0) return;

    let nextIndex: number;
    if ($isShuffle.get()) {
      nextIndex = Math.floor(Math.random() * queue.length);
    } else {
      nextIndex = $queueIndex.get() + 1;
    }

    if (nextIndex >= queue.length) {
      if ($repeatMode.get() === 'all') {
        nextIndex = 0;
      } else {
        return;
      }
    }

    const track = queue[nextIndex];
    if (!track) return;

    $queueIndex.set(nextIndex);
    await this.loadAndPlay(track);
  }

  async playPrev(): Promise<void> {
    const queue = $queue.get();
    const prevIndex = Math.max(0, $queueIndex.get() - 1);
    const track = queue[prevIndex];
    if (!track) return;

    $queueIndex.set(prevIndex);
    await this.loadAndPlay(track);
  }

  addToQueue(track: TrackInfo, position: 'next' | 'end' = 'end'): void {
    const queue = [...$queue.get()];
    if (position === 'next') {
      queue.splice($queueIndex.get() + 1, 0, track);
    } else {
      queue.push(track);
    }
    $queue.set(queue);
  }

  playChart(tracks: TrackInfo[], startIndex = 0): void {
    const playable = tracks.filter((t) => t.previewUrl !== null);
    if (playable.length === 0) return;

    const adjustedIndex = Math.min(startIndex, playable.length - 1);
    $queue.set(playable);
    $queueIndex.set(adjustedIndex);

    const track = playable[adjustedIndex];
    if (track) {
      this.loadAndPlay(track);
    }
  }

  private updateMediaSession(track: TrackInfo): void {
    if (typeof navigator === 'undefined' || !navigator.mediaSession) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artistName,
      album: track.albumTitle ?? 'ChartWave Preview',
      artwork: [
        { src: track.artwork.small, sizes: '100x100', type: 'image/jpeg' },
        { src: track.artwork.medium, sizes: '300x300', type: 'image/jpeg' },
        { src: track.artwork.large, sizes: '600x600', type: 'image/jpeg' },
      ],
    });

    navigator.mediaSession.setActionHandler('play', () => this.play());
    navigator.mediaSession.setActionHandler('pause', () => this.pause());
    navigator.mediaSession.setActionHandler('nexttrack', () => this.playNext());
    navigator.mediaSession.setActionHandler('previoustrack', () => this.playPrev());

    // Announce to screen reader
    const announcer = document.getElementById('player-announcements');
    if (announcer) {
      announcer.textContent = `Now playing: ${track.title} by ${track.artistName}`;
    }
  }

  private dispatchError(track: TrackInfo, message: string): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('chartwave:playback-error', {
          detail: { track, message },
        })
      );
    }
  }

  destroy(): void {
    this.stopProgressTracking();
    this.howl?.unload();
    this.preloadedHowl?.unload();
    this.howl = null;
    this.preloadedHowl = null;
  }
}

export const audioPlayer = new AudioPlayerManager();
