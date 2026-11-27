// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { handleSync } from '../../_lib/sync';

interface Env {
  DB?: D1Database;
  /** Optional secret; without it the hash still keeps raw addresses out of the table. */
  RATE_LIMIT_SALT?: string;
}

export const onRequest: PagesFunction<Env, 'code'> = ({ request, env, params }) =>
  handleSync(request, String(params.code), {
    db: env.DB,
    ip: request.headers.get('CF-Connecting-IP'),
    salt: env.RATE_LIMIT_SALT,
    now: Date.now(),
  });
