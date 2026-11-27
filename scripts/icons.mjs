// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

// Renders the app icons from one SVG source. Run with `npm run icons` after
// changing the mark; the PNGs are committed so builds don't need sharp.
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';

const out = new URL('../public/icons/', import.meta.url);

// `pad` shrinks the composition into the maskable safe zone (inner 80%).
function mark(pad = 0) {
  const s = 512;
  const k = (s - pad * 2) / s;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}">
  <rect width="${s}" height="${s}" fill="#f4f1ea"/>
  <g transform="translate(${pad} ${pad}) scale(${k})">
    <path d="M0 512 V300 A212 212 0 0 1 212 512 Z" fill="#111111"/>
    <rect x="300" y="56" width="156" height="156" fill="#e2332a"/>
    <circle cx="232" cy="236" r="150" fill="#f3bf1a"/>
    <path d="M392 284 L480 456 H304 Z" fill="#1e4fa0"/>
    <rect x="40" y="470" width="432" height="10" fill="#111111"/>
  </g>
</svg>`;
}

await mkdir(out, { recursive: true });
await writeFile(new URL('icon.svg', out), mark());
const render = (svg, size, name) => sharp(Buffer.from(svg)).resize(size, size).png({ compressionLevel: 9 }).toFile(new URL(name, out).pathname);
await Promise.all([
  render(mark(), 192, 'icon-192.png'),
  render(mark(), 512, 'icon-512.png'),
  render(mark(52), 512, 'maskable-512.png'),
  render(mark(20), 180, 'apple-touch-icon.png'),
]);
console.log('icons written');
