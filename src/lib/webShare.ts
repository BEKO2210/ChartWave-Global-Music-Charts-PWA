export async function shareTrack(title: string, artist: string, url: string): Promise<boolean> {
  const shareData = {
    title: `${title} by ${artist}`,
    text: `Check out "${title}" by ${artist} on ChartWave!`,
    url,
  };

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share(shareData);
      return true;
    } catch {
      // User cancelled or share failed
    }
  }

  // Fallback: copy to clipboard
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch {
      // Clipboard access denied
    }
  }

  return false;
}
