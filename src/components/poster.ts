// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import type { LayerAdvice } from '../engine/types';
import { tempColor } from './colors';

export const POSTER_W = 1080;
export const POSTER_H = 1350;
const M = 72;

// The poster is a printed object, so it keeps the paper palette whatever the
// app theme is.
export const PAPER = { paper: '#f4f1ea', ink: '#111111', muted: '#5c5850', red: '#e2332a', yellow: '#f3bf1a', blue: '#1e4fa0' };

const DISPLAY = "'Jost', system-ui, sans-serif";
const BODY = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
export const font = (weight: number, size: number, family: 'display' | 'body' = 'display') =>
  `${weight} ${size}px ${family === 'display' ? DISPLAY : BODY}`;

export type Measure = (text: string, font: string) => number;
export type MarkKind = LayerAdvice['kind'] | 'accessory';

export interface PosterData {
  place: string;
  /** Already formatted, e.g. "Thu 26 Nov". */
  dateLabel: string;
  /** Already in the user's units, e.g. "Feels 3° / 9°". */
  feelsLabel: string;
  verdict: string;
  layers: { kind: MarkKind; label: string }[];
  /** °C, for the circle colour. */
  feels: number;
  /** 0–100, tilts the square and triangle like the Today hero. */
  rain: number;
}

export interface TextOp {
  text: string;
  font: string;
  color: string;
  x: number;
  /** Alphabetic baseline. */
  y: number;
}

export interface MarkOp {
  kind: MarkKind;
  x: number;
  y: number;
  size: number;
}

export interface PosterLayout {
  text: TextOp[];
  marks: MarkOp[];
  /** Lowest baseline used by the body copy; must stay above the footer rule. */
  bottom: number;
}

/**
 * Greedy word wrap. A single word wider than the line is broken by
 * characters so nothing ever spills past the margin.
 */
export function wrapText(text: string, maxWidth: number, measure: Measure, f: string): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (measure(next, f) <= maxWidth) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    if (measure(word, f) <= maxWidth) {
      line = word;
      continue;
    }
    let part = '';
    for (const ch of word) {
      if (part && measure(part + ch, f) > maxWidth) {
        lines.push(part);
        part = ch;
      } else part += ch;
    }
    line = part;
  }
  if (line) lines.push(line);
  return lines;
}

/** Trims the last line until it fits with an ellipsis. */
function clamp(lines: string[], maxLines: number, maxWidth: number, measure: Measure, f: string): string[] {
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let last = `${kept[maxLines - 1]} ${lines[maxLines]}`;
  while (last.length > 1 && measure(`${last}…`, f) > maxWidth) last = last.slice(0, -1).trimEnd();
  kept[maxLines - 1] = `${last}…`;
  return kept;
}

/**
 * Picks the largest size at which `text` fits in `maxLines`. If even the
 * smallest size overflows, the last line is clamped with an ellipsis.
 */
export function fitText(
  text: string,
  maxWidth: number,
  maxLines: number,
  sizes: number[],
  fontAt: (size: number) => string,
  measure: Measure,
): { size: number; lines: string[] } {
  for (const size of sizes) {
    const lines = wrapText(text, maxWidth, measure, fontAt(size));
    if (lines.length <= maxLines) return { size, lines };
  }
  const size = sizes[sizes.length - 1];
  const f = fontAt(size);
  return { size, lines: clamp(wrapText(text, maxWidth, measure, f), maxLines, maxWidth, measure, f) };
}

// Hero coordinates (360×260 viewBox) scaled into the top of the poster.
export const HERO = { scale: 2.6, x: M, y: 40 };
const FOOTER_RULE = 1250;
const LEFT_W = 560;
const RIGHT_X = 680;
const RIGHT_W = POSTER_W - M - RIGHT_X;
const MARK = 40;

/**
 * Two columns under the composition: place, date, verdict and feels-like on
 * the left; the layers with their marks on the right.
 */
export function layoutPoster(d: PosterData, measure: Measure): PosterLayout {
  const text: TextOp[] = [];
  const marks: MarkOp[] = [];
  const add = (lines: string[], f: string, size: number, lh: number, x: number, y: number, color: string) => {
    lines.forEach((line, i) => text.push({ text: line, font: f, color, x, y: y + i * size * lh }));
    return y + (lines.length - 1) * size * lh;
  };

  let y = HERO.y + 260 * HERO.scale + 80;
  const place = fitText(d.place, LEFT_W, 2, [60, 52, 44], (s) => font(500, s), measure);
  y = add(place.lines, font(500, place.size), place.size, 1.1, M, y, PAPER.ink);
  y += 50;
  y = add(wrapText(d.dateLabel, LEFT_W, measure, font(400, 34, 'body')), font(400, 34, 'body'), 34, 1.2, M, y, PAPER.muted);
  const verdict = fitText(d.verdict, LEFT_W, 2, [96, 84, 72, 60], (s) => font(500, s), measure);
  y += verdict.size + 24;
  y = add(verdict.lines, font(500, verdict.size), verdict.size, 1.02, M, y, PAPER.ink);
  y += 64;
  y = add(wrapText(d.feelsLabel, LEFT_W, measure, font(500, 44)), font(500, 44), 44, 1.1, M, y, PAPER.ink);
  let bottom = y;

  let ry = HERO.y + 260 * HERO.scale + 80;
  text.push({ text: 'Wear', font: font(600, 26, 'body'), color: PAPER.muted, x: RIGHT_X, y: ry });
  ry += 30;
  const labelW = RIGHT_W - MARK - 20;
  const rows = d.layers.map((l) => wrapText(l.label, labelW, measure, font(400, 32, 'body')));
  // Rows shrink rather than run into the footer when the outfit is long.
  const rowH = (n: number, size: number, mark: number) => mark + (n - 1) * size * 1.2;
  const total = rows.reduce((n, r) => n + rowH(r.length, 32, MARK) + 22, 0);
  const room = FOOTER_RULE - 48 - ry;
  const k = Math.min(1, room / total);
  const size = Math.round(32 * k);
  const mark = Math.round(MARK * k);
  for (let i = 0; i < d.layers.length; i++) {
    const lines = rows[i];
    marks.push({ kind: d.layers[i].kind, x: RIGHT_X, y: ry, size: mark });
    // First line sits on the mark's centre line; the rest hang below it.
    add(lines, font(400, size, 'body'), size, 1.2, RIGHT_X + mark + 20, ry + mark / 2 + size * 0.36, PAPER.ink);
    const h = rowH(lines.length, size, mark);
    bottom = Math.max(bottom, ry + h);
    ry += h + 22 * k;
  }

  text.push({ text: 'layered', font: font(500, 40), color: PAPER.ink, x: M, y: FOOTER_RULE + 64 });
  return { text, marks, bottom };
}

export const FOOTER_TOP = FOOTER_RULE;

export function posterFilename(date: string): string {
  return `layered-${date}.png`;
}

function drawMark(c: CanvasRenderingContext2D, m: MarkOp): void {
  const s = m.size / 24;
  c.save();
  c.translate(m.x, m.y);
  c.scale(s, s);
  c.beginPath();
  switch (m.kind) {
    case 'base':
      c.fillStyle = PAPER.yellow;
      c.arc(12, 12, 10, 0, Math.PI * 2);
      break;
    case 'mid':
      c.fillStyle = PAPER.red;
      c.rect(3, 3, 18, 18);
      break;
    case 'outer':
      c.fillStyle = PAPER.blue;
      c.moveTo(12, 2);
      c.lineTo(22.5, 21);
      c.lineTo(1.5, 21);
      break;
    case 'accessory':
      c.fillStyle = PAPER.ink;
      c.moveTo(3, 21);
      c.lineTo(3, 3);
      c.arc(3, 21, 18, -Math.PI / 2, 0);
      break;
    case 'bottoms':
      c.fillStyle = PAPER.ink;
      c.rect(5, 3, 6, 18);
      c.rect(13, 3, 6, 18);
      break;
    case 'footwear':
      c.fillStyle = PAPER.ink;
      c.arc(12, 18, 10, Math.PI, 0);
      break;
  }
  c.closePath();
  c.fill();
  c.restore();
}

/** The Today hero, redrawn in canvas space with the paper palette. */
function drawHero(c: CanvasRenderingContext2D, feels: number, rain: number): void {
  const tilt = Math.round((rain / 100) * 12);
  c.save();
  c.translate(HERO.x, HERO.y);
  c.scale(HERO.scale, HERO.scale);
  c.fillStyle = PAPER.ink;
  c.beginPath();
  c.moveTo(0, 260);
  c.lineTo(0, 140);
  c.arc(0, 260, 120, -Math.PI / 2, 0);
  c.closePath();
  c.fill();

  c.save();
  c.translate(272, 74);
  c.rotate((tilt * Math.PI) / 180);
  c.fillStyle = PAPER.red;
  c.fillRect(-46, -46, 92, 92);
  c.restore();

  c.fillStyle = tempColor(feels);
  c.beginPath();
  c.arc(168, 128, 92, 0, Math.PI * 2);
  c.fill();

  c.fillStyle = PAPER.blue;
  c.beginPath();
  c.moveTo(300 - tilt, 150);
  c.lineTo(346, 246);
  c.lineTo(254, 246);
  c.closePath();
  c.fill();

  c.fillStyle = PAPER.ink;
  c.fillRect(24, 226, 312, 4);
  c.fillStyle = PAPER.yellow;
  c.fillRect(40, 36, 6, 64);
  c.restore();
}

export function drawPoster(c: CanvasRenderingContext2D, d: PosterData): void {
  c.fillStyle = PAPER.paper;
  c.fillRect(0, 0, POSTER_W, POSTER_H);
  drawHero(c, d.feels, d.rain);

  const layout = layoutPoster(d, (t, f) => {
    c.font = f;
    return c.measureText(t).width;
  });
  c.textBaseline = 'alphabetic';
  for (const t of layout.text) {
    c.font = t.font;
    c.fillStyle = t.color;
    c.fillText(t.text, t.x, t.y);
  }
  for (const m of layout.marks) drawMark(c, m);

  c.fillStyle = PAPER.ink;
  c.fillRect(M, FOOTER_RULE, POSTER_W - M * 2, 3);
  // The app's three primaries as a signature beside the wordmark.
  const fy = FOOTER_RULE + 34;
  drawMark(c, { kind: 'base', x: POSTER_W - M - 132, y: fy, size: 36 });
  drawMark(c, { kind: 'mid', x: POSTER_W - M - 84, y: fy, size: 36 });
  drawMark(c, { kind: 'outer', x: POSTER_W - M - 36, y: fy, size: 36 });
}

/** Jost may not be loaded yet if Today rendered before the stylesheet's fonts arrived. */
export async function loadPosterFonts(): Promise<void> {
  try {
    await Promise.race([document.fonts.load(font(500, 96)), new Promise((r) => setTimeout(r, 1500))]);
  } catch {
    // The system font fallback in the font stack is fine.
  }
}

export async function renderPoster(d: PosterData): Promise<Blob> {
  await loadPosterFonts();
  const canvas = document.createElement('canvas');
  canvas.width = POSTER_W;
  canvas.height = POSTER_H;
  const c = canvas.getContext('2d');
  if (!c) throw new Error('Canvas unavailable');
  drawPoster(c, d);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode the poster'))), 'image/png'),
  );
}
