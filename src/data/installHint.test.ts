// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

import { describe, expect, it } from 'vitest';
import { isIosSafari, shouldShowInstallHint, type InstallEnv } from './installHint';

const UA = {
  iphoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  ipadSafariLegacy:
    'Mozilla/5.0 (iPad; CPU OS 15_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Mobile/15E148 Safari/604.1',
  ipadDesktopMode:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  iphoneChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1',
  iphoneFirefox:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/132.0 Mobile/15E148 Safari/605.1.15',
  iphoneInstagram:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 357.0.0.25.101',
  iphoneWebView:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  android:
    'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  windows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
};

const env = (userAgent: string, extra: Partial<InstallEnv> = {}): InstallEnv => ({
  userAgent,
  maxTouchPoints: 5,
  standalone: false,
  displayStandalone: false,
  ...extra,
});

describe('isIosSafari', () => {
  it('accepts Safari on iPhone and iPad', () => {
    expect(isIosSafari(UA.iphoneSafari, 5)).toBe(true);
    expect(isIosSafari(UA.ipadSafariLegacy, 5)).toBe(true);
  });

  it('treats a touch Mac user agent as iPadOS', () => {
    expect(isIosSafari(UA.ipadDesktopMode, 5)).toBe(true);
  });

  it('rejects desktop Safari on a real Mac', () => {
    expect(isIosSafari(UA.ipadDesktopMode, 0)).toBe(false);
  });

  it('rejects other iOS browsers and in-app views', () => {
    for (const ua of [UA.iphoneChrome, UA.iphoneFirefox, UA.iphoneInstagram, UA.iphoneWebView]) {
      expect(isIosSafari(ua, 5)).toBe(false);
    }
  });

  it('rejects Android and desktop', () => {
    expect(isIosSafari(UA.android, 5)).toBe(false);
    expect(isIosSafari(UA.windows, 0)).toBe(false);
  });
});

describe('shouldShowInstallHint', () => {
  it('shows in iPhone Safari when not installed and not seen', () => {
    expect(shouldShowInstallHint(env(UA.iphoneSafari), undefined)).toBe(true);
  });

  it('stays hidden once seen', () => {
    expect(shouldShowInstallHint(env(UA.iphoneSafari), true)).toBe(false);
  });

  it('stays hidden when already on the Home Screen', () => {
    expect(shouldShowInstallHint(env(UA.iphoneSafari, { standalone: true }), false)).toBe(false);
    expect(shouldShowInstallHint(env(UA.iphoneSafari, { displayStandalone: true }), false)).toBe(false);
  });

  it('never shows on other platforms', () => {
    expect(shouldShowInstallHint(env(UA.android, { standalone: undefined }), false)).toBe(false);
    expect(shouldShowInstallHint(env(UA.windows, { maxTouchPoints: 0, standalone: undefined }), false)).toBe(false);
  });
});
