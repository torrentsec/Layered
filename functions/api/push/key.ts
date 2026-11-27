// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 torrentsec

import { handleKey } from '../../_lib/push';

interface Env {
  VAPID_PUBLIC_KEY?: string;
}

export const onRequest: PagesFunction<Env> = ({ request, env }) => handleKey(request, env.VAPID_PUBLIC_KEY);
