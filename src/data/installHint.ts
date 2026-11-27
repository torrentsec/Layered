// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

export interface InstallEnv {
  userAgent: string;
  /** iPadOS reports a Mac user agent; touch points are what give it away. */
  maxTouchPoints: number;
  /** `navigator.standalone`, Safari only. */
  standalone?: boolean;
  /** `matchMedia('(display-mode: standalone)').matches`. */
  displayStandalone: boolean;
}

const OTHER_IOS_BROWSERS = /CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|YaBrowser|DuckDuckGo|GSA\/|FBAN|FBAV|Instagram|Line\//;

export function isIosSafari(ua: string, maxTouchPoints: number): boolean {
  const iphone = /iPhone|iPod/.test(ua);
  const ipad = /iPad/.test(ua) || (/Macintosh/.test(ua) && maxTouchPoints > 1);
  if (!iphone && !ipad) return false;
  // In-app web views drop the Safari token; other browsers add their own.
  return /Version\/[\d.]+.*Safari\//.test(ua) && !OTHER_IOS_BROWSERS.test(ua);
}

export function shouldShowInstallHint(env: InstallEnv, seen: boolean | undefined): boolean {
  if (seen) return false;
  if (env.standalone === true || env.displayStandalone) return false;
  return isIosSafari(env.userAgent, env.maxTouchPoints);
}
