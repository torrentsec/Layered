// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { handleUnsubscribe } from '../../_lib/push';

interface Env {
  DB?: D1Database;
  RATE_LIMIT_SALT?: string;
}

export const onRequest: PagesFunction<Env, 'id'> = ({ request, env, params }) =>
  handleUnsubscribe(request, String(params.id), { db: env.DB, ip: request.headers.get('CF-Connecting-IP'), salt: env.RATE_LIMIT_SALT, now: Date.now() });
