import { audioPlayer } from './audioPlayer';
import { $volume, $fullScreenOpen, $queueDrawerOpen, $repeatMode, $isShuffle } from '../stores/player';

function isInputFocused(): boolean {
  const active = document.activeElement;
  if (!active) return false;
  const tag = active.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || active.hasAttribute('contenteditable');
}

export function initKeyboardShortcuts(): void {
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (isInputFocused()) return;

    switch (e.key) {
      case ' ':
        e.preventDefault();
        audioPlayer.toggle();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        audioPlayer.seek(Math.max(0, ($volume.get() || 0) - 0.1));
        break;
      case 'ArrowRight':
        e.preventDefault();
        break;
      case 'ArrowUp':
        e.preventDefault();
        audioPlayer.setVolume($volume.get() + 0.1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        audioPlayer.setVolume($volume.get() - 0.1);
        break;
      case 'm':
      case 'M':
        audioPlayer.toggleMute();
        break;
      case 'l':
      case 'L': {
        const modes: Array<'none' | 'one' | 'all'> = ['none', 'one', 'all'];
        const current = $repeatMode.get();
        const idx = modes.indexOf(current);
        const next = modes[(idx + 1) % modes.length];
        if (next != null) $repeatMode.set(next);
        break;
      }
      case 's':
      case 'S':
        $isShuffle.set(!$isShuffle.get());
        break;
      case 'f':
      case 'F':
        $fullScreenOpen.set(!$fullScreenOpen.get());
        break;
      case 'q':
      case 'Q':
        $queueDrawerOpen.set(!$queueDrawerOpen.get());
        break;
      case 'Escape':
        if ($fullScreenOpen.get()) $fullScreenOpen.set(false);
        break;
    }
  });
}
