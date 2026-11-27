// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Daniel Woo

const REPO = 'https://github.com/torrentsec/Layered';

export function AboutSection() {
  return (
    <>
    <h2 class="group-title">About</h2>
    <div class="group">
      <a class="row-item plain" href={REPO} target="_blank" rel="noopener" style={{ color: 'inherit', textDecoration: 'none' }}>
        <span class="grow">Source code<span class="sub">AGPL-3.0-or-later</span></span>
        <span class="meta">GitHub ›</span>
      </a>
      <a class="row-item plain" href="https://open-meteo.com/" target="_blank" rel="noopener" style={{ color: 'inherit', textDecoration: 'none' }}>
        <span class="grow">Weather data by Open-Meteo.com<span class="sub">CC BY 4.0</span></span>
        <span class="meta">›</span>
      </a>
      <a class="row-item plain" href="https://api.met.no/" target="_blank" rel="noopener" style={{ color: 'inherit', textDecoration: 'none' }}>
        <span class="grow">Fallback forecasts by MET Norway<span class="sub">CC BY 4.0</span></span>
        <span class="meta">›</span>
      </a>
      <div class="row-item plain">
        <span class="grow">Version</span>
        <span class="meta num">{__APP_VERSION__}</span>
      </div>
    </div>
    <p class="group-foot" style={{ textAlign: 'center', marginTop: '24px' }}>Made in London by torrentsec</p>
    </>
  );
}
