// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'functions/**/*.test.ts', 'worker/**/*.test.ts'],
    environment: 'node',
  },
});
