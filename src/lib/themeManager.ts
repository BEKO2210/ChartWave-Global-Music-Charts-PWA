export function getThemeInitScript(): string {
  return `
    (function() {
      const stored = localStorage.getItem('chartwave:settings');
      let theme = 'dark';
      if (stored) {
        try {
          const s = JSON.parse(stored);
          if (s.theme === 'light') theme = 'light';
          else if (s.theme === 'system') {
            theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
          }
        } catch {}
      }
      if (theme === 'light') document.documentElement.setAttribute('data-theme', 'light');
    })();
  `.trim();
}

export function toggleTheme(): void {
  const html = document.documentElement;
  const isLight = html.getAttribute('data-theme') === 'light';
  const newTheme = isLight ? 'dark' : 'light';

  if (newTheme === 'light') {
    html.setAttribute('data-theme', 'light');
  } else {
    html.removeAttribute('data-theme');
  }

  try {
    const stored = localStorage.getItem('chartwave:settings');
    const settings = stored ? JSON.parse(stored) : {};
    settings.theme = newTheme;
    localStorage.setItem('chartwave:settings', JSON.stringify(settings));
  } catch {
    // localStorage might be unavailable
  }
}
