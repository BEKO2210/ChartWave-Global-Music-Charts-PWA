/**
 * Generate PWA icon PNG files from scratch using Node.js built-in modules.
 * Creates simple ChartWave-branded icons (red waveform bars on black background).
 *
 * Output: public/pwa-64x64.png, pwa-192x192.png, pwa-512x512.png,
 *         maskable-icon-512x512.png, apple-touch-icon.png
 */

import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = resolve(__dirname, '..', 'public');

// Colors
const BG_R = 0, BG_G = 0, BG_B = 0; // Black background
const BAR_R = 220, BAR_G = 38, BAR_B = 38; // #dc2626 red

// Waveform bar definitions (relative positions and heights within a 128x128 viewBox)
const BARS = [
  { x: 20, y: 70, w: 12, h: 28 },
  { x: 38, y: 50, w: 12, h: 48 },
  { x: 56, y: 30, w: 12, h: 68 },
  { x: 74, y: 44, w: 12, h: 54 },
  { x: 92, y: 58, w: 12, h: 40 },
];

function createPNG(width: number, height: number, maskable: boolean): Buffer {
  // Create pixel data (RGBA)
  const pixels = Buffer.alloc(width * height * 4);

  // Scale factor from 128x128 viewBox to actual size
  const scale = width / 128;

  // For maskable icons, add safe-zone padding (10% on each side)
  const maskPadding = maskable ? width * 0.1 : 0;
  const contentScale = maskable ? (width - maskPadding * 2) / 128 : scale;
  const offsetX = maskable ? maskPadding : 0;
  const offsetY = maskable ? maskPadding : 0;

  // Fill background
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    pixels[idx] = BG_R;
    pixels[idx + 1] = BG_G;
    pixels[idx + 2] = BG_B;
    pixels[idx + 3] = 255;
  }

  // Draw rounded rect bars
  for (const bar of BARS) {
    const bx = Math.round(bar.x * contentScale + offsetX);
    const by = Math.round(bar.y * contentScale + offsetY);
    const bw = Math.max(1, Math.round(bar.w * contentScale));
    const bh = Math.max(1, Math.round(bar.h * contentScale));
    const radius = Math.round(6 * contentScale);

    for (let py = by; py < by + bh && py < height; py++) {
      for (let px = bx; px < bx + bw && px < width; px++) {
        // Simple rounded corner check
        const inTopLeft = px < bx + radius && py < by + radius;
        const inTopRight = px >= bx + bw - radius && py < by + radius;
        const inBotLeft = px < bx + radius && py >= by + bh - radius;
        const inBotRight = px >= bx + bw - radius && py >= by + bh - radius;

        let draw = true;
        if (inTopLeft) {
          const dx = bx + radius - px;
          const dy = by + radius - py;
          draw = dx * dx + dy * dy <= radius * radius;
        } else if (inTopRight) {
          const dx = px - (bx + bw - radius);
          const dy = by + radius - py;
          draw = dx * dx + dy * dy <= radius * radius;
        } else if (inBotLeft) {
          const dx = bx + radius - px;
          const dy = py - (by + bh - radius);
          draw = dx * dx + dy * dy <= radius * radius;
        } else if (inBotRight) {
          const dx = px - (bx + bw - radius);
          const dy = py - (by + bh - radius);
          draw = dx * dx + dy * dy <= radius * radius;
        }

        if (draw && py >= 0 && px >= 0) {
          const idx = (py * width + px) * 4;
          // Apply a gradient effect (top = slightly orange, bottom = red)
          const t = (py - by) / bh;
          const r = Math.round(BAR_R + (249 - BAR_R) * (1 - t) * 0.3);
          const g = Math.round(BAR_G + (115 - BAR_G) * (1 - t) * 0.3);
          const b = Math.round(BAR_B + (22 - BAR_B) * (1 - t) * 0.3);
          pixels[idx] = r;
          pixels[idx + 1] = g;
          pixels[idx + 2] = b;
          pixels[idx + 3] = 255;
        }
      }
    }
  }

  // Encode as PNG
  return encodePNG(width, height, pixels);
}

function encodePNG(width: number, height: number, pixels: Buffer): Buffer {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type: RGB (no alpha needed for solid backgrounds)
  ihdr[10] = 0; // compression method
  ihdr[11] = 0; // filter method
  ihdr[12] = 0; // interlace method

  // Convert RGBA to RGB with filter bytes
  const rawData = Buffer.alloc(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + width * 3)] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = y * (1 + width * 3) + 1 + x * 3;
      rawData[dstIdx] = pixels[srcIdx] ?? 0;     // R
      rawData[dstIdx + 1] = pixels[srcIdx + 1] ?? 0; // G
      rawData[dstIdx + 2] = pixels[srcIdx + 2] ?? 0; // B
    }
  }

  // Compress
  const compressed = deflateSync(rawData, { level: 9 });

  // Build chunks
  const chunks: Buffer[] = [signature];

  chunks.push(makeChunk('IHDR', ihdr));
  chunks.push(makeChunk('IDAT', compressed));
  chunks.push(makeChunk('IEND', Buffer.alloc(0)));

  return Buffer.concat(chunks);
}

function makeChunk(type: string, data: Buffer): Buffer {
  const typeBytes = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const crcData = Buffer.concat([typeBytes, data]);
  const crc = crc32(crcData);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc >>> 0, 0);

  return Buffer.concat([length, typeBytes, data, crcBuf]);
}

// CRC32 implementation
function crc32(buf: Buffer): number {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i] ?? 0;
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Generate all required icon sizes
const icons = [
  { name: 'pwa-64x64.png', size: 64, maskable: false },
  { name: 'pwa-192x192.png', size: 192, maskable: false },
  { name: 'pwa-512x512.png', size: 512, maskable: false },
  { name: 'maskable-icon-512x512.png', size: 512, maskable: true },
  { name: 'apple-touch-icon.png', size: 180, maskable: false },
];

for (const icon of icons) {
  const png = createPNG(icon.size, icon.size, icon.maskable);
  const outPath = resolve(PUBLIC_DIR, icon.name);
  writeFileSync(outPath, png);
  console.log(`Generated ${icon.name} (${icon.size}x${icon.size}${icon.maskable ? ' maskable' : ''})`);
}

console.log('All PWA icons generated successfully.');
