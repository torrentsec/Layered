// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

const MARK = [
  '   ▄▄▄    ▄▄▄▄▄▄      ▄   ',
  ' ▟█████▙  ██████     ▟█▙  ',
  ' ███████  ██████    ▟███▙ ',
  ' ▜█████▛  ██████   ▟█████▙',
  '   ▀▀▀    ▀▀▀▀▀▀  ▀▀▀▀▀▀▀▀',
].join('\n');

let printed = false;

export function printBanner(): void {
  if (printed || import.meta.env.MODE === 'test') return;
  printed = true;
  console.log(
    `%c${MARK}\n\n%clayered — built by torrentsec`,
    'color:#e2332a;font-family:monospace;line-height:1.1',
    'font:500 13px/1.6 Jost,system-ui,sans-serif;letter-spacing:.04em',
  );
}
