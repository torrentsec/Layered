// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The CSP allows the pre-paint theme script by hash; editing it without
// updating _headers would silently fall back to the system theme in production.
describe('_headers', () => {
  it('pins the hash of the inline theme script', () => {
    const html = readFileSync('index.html', 'utf8');
    const inline = html.match(/<script>([\s\S]*?)<\/script>/)![1];
    const hash = createHash('sha256').update(inline).digest('base64');
    expect(readFileSync('public/_headers', 'utf8')).toContain(`'sha256-${hash}'`);
  });
});
