import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async () => {
  const entries = await getCollection('charts');
  const newTracks: Array<{ title: string; artist: string; chart: string; link: string }> = [];

  for (const entry of entries) {
    for (const track of entry.data.tracks) {
      if (track.rankChange === 'new') {
        newTracks.push({
          title: track.title,
          artist: track.artistName,
          chart: entry.data.name,
          link: track.links.lastfm ?? `https://BEKO2210.github.io/ChartWave-Global-Music-Charts-PWA/chart/${entry.data.slug}`,
        });
      }
    }
  }

  const items = newTracks
    .slice(0, 50)
    .map(
      (t) => `
    <item>
      <title><![CDATA[${t.title} by ${t.artist}]]></title>
      <description><![CDATA[New entry on ${t.chart}]]></description>
      <link>${t.link}</link>
      <guid isPermaLink="false">${t.title}-${t.artist}-${t.chart}</guid>
    </item>`
    )
    .join('');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>ChartWave — New Chart Entries</title>
    <description>New entries on music charts worldwide, updated weekly.</description>
    <link>https://BEKO2210.github.io/ChartWave-Global-Music-Charts-PWA/</link>
    <atom:link href="https://BEKO2210.github.io/ChartWave-Global-Music-Charts-PWA/rss.xml" rel="self" type="application/rss+xml"/>
    <language>en</language>
    ${items}
  </channel>
</rss>`;

  return new Response(rss, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
