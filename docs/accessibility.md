# Accessibility

Layered targets **WCAG 2.2 level AA**. This page records the audit done for v1.0.0 (issue #49, US-060): what was checked, what was found on each screen, what was fixed, and what is still open.

## How to check

```
npm run build
npm run test:a11y            # add -- --verbose to list minor findings too
```

`tests/a11y/axe.mjs` serves `dist` with `vite preview` (port 4599, or `A11Y_PORT`), mocks Open-Meteo with a fixed cold, showery fortnight, fixes the clock, and runs axe-core with the `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` and `wcag22aa` rules. Each screen and sheet is scanned in light and dark at 390px and 320px wide, with reduced motion on. The run fails on any **serious or critical** violation, or if the page scrolls sideways. Each case waits for a selector first, so a broken step can't pass as an empty page.

Automated checks find perhaps a third of real problems. Before a release, also do the manual checks below.

## Checklist

| Area | WCAG | How it was checked |
|---|---|---|
| Names, roles, values | 1.1.1, 4.1.2 | axe; reading the markup of every control |
| Headings and landmarks | 1.3.1, 2.4.6 | one `h1` per screen and per sheet, `h2` for sections, `main` on every screen |
| Page titles | 2.4.2 | document title follows the section |
| Keyboard | 2.1.1, 2.1.2 | Tab, Shift+Tab, Enter, Space, arrows and Esc through every screen in Chromium |
| Focus order and focus after navigation | 2.4.3 | list row to day view, Back buttons, sheets opening and closing |
| Focus visible | 2.4.7 | 3px ring in `--focus`, 6.9:1 (light) and 10.9:1 (dark) on paper |
| Focus not obscured | 2.4.11 | sticky title bar and fixed tab bar, with `scroll-padding` |
| Target size | 2.5.8 | at least 24px everywhere; 44px goal met by buttons, rows, pills and steppers |
| Dragging | 2.5.7 | sheet handle and day swiper have button alternatives |
| Contrast | 1.4.3, 1.4.11 | tokens measured in both themes (below) |
| Not by colour alone | 1.4.1 | current tab, selected segments, hourly window, rain, certainty, stale data |
| Reflow and zoom | 1.4.10, 1.4.4 | no sideways scroll at 320px; browser zoom to 200% |
| Motion | 2.3.3 | `prefers-reduced-motion` stops the title collapse, sheet slide, swiper smooth scroll and toast slide |
| Forms | 3.3.1, 3.3.2 | every input labelled; errors in `role="alert"`; disabled Save explained |
| Status messages | 4.1.3 | toasts, search results, loading and errors |

### Colour tokens

Text needs 4.5:1, control edges and state indicators 3:1.

| Token | Use | Light on paper / surface / surface-2 | Dark on paper / surface / surface-2 |
|---|---|---|---|
| `--ink` | body text | 16.7 / 18.6 / 15.2 | 15.9 / 14.4 / 12.7 |
| `--ink-2` | secondary text | 6.9 / 7.7 / 6.3 | 8.3 / 7.5 / 6.7 |
| `--blue-ink` | links, text buttons | 6.9 / 7.7 / 6.3 | 8.5 / 7.7 / 6.8 |
| `--red-ink` | offline, errors | 5.7 / 6.3 / 5.1 | 8.1 / 7.4 / 6.5 |
| `--focus` | focus ring | 6.9 / 7.7 / 6.3 | 10.9 / 9.8 / 8.7 |
| `--line-strong` (new) | input edges, selected segment | 3.3 / 4.4 / 3.6 | 4.7 / 4.2 / 3.7 |
| `--line` | dividers only | 1.3 / 1.5 / 1.2 | 1.6 / 1.4 / 1.2 |

`--line` is decorative and must not be the only edge of a control. White on the Delete button is now 5.8:1.

## Results per screen

Each screen passes the axe run with no serious or critical violations, in both themes, at both widths.

| Screen | Findings | Status |
|---|---|---|
| Onboarding (3 steps) | Focus moves to each step's heading; location errors are alerts | Pass, no changes |
| Today | Hourly strip scrolled but couldn't be reached by keyboard; poster read "Feels like N degrees" in Celsius even with °F; "Dress for" used `aria-label` on a plain `div` | Fixed |
| Today, Why this? | Sheet is a native modal `<dialog>` with an `h1`, Esc, back gesture and focus return | Pass |
| Today, Places sheet | Search results weren't announced | Fixed |
| Week | Feels range used `aria-label` on a `span`, which most screen readers ignore | Fixed |
| Week, day swiper | No `main` landmark; Tab and screen readers wandered into the off-screen neighbouring days; focus fell to the page after following a day link | Fixed |
| Trip list, editor, detail | Activity pills clipped their focus ring; Save was disabled with no reason; per-stop strip unreachable by keyboard; Delete text 4.4:1 | Fixed |
| Wardrobe and Details sheet | Steppers 44px, expanders expose state, counts in a polite live region | Pass, no changes |
| Settings | Text fields, time fields and selects had edges at 1.2 to 1.5:1; place names were editable but looked like plain text; selected segment shown only by a 1.2:1 fill | Fixed |
| Install hint | Native modal sheet with a heading and a "Got it" button | Pass |
| Toasts | The status role sat on a popover that went from hidden to shown at once, which screen readers often miss | Fixed |
| Tab bar | Current section shown by colour alone (ink against ink-2, 2.4:1 and 1.9:1) | Fixed |

## Fixes made

- **Keyboard:** the hourly and trip strips are focusable scroll regions, with the ring drawn inside as they run to the screen edge.
- **Focus:** after a navigation removes the focused control, focus goes to the new screen's heading (`RouteFocus`). Off-screen days in the swiper are `inert`. `scroll-padding-top` now clears the sticky bar plus the focus ring.
- **Names:** "Dress for" and the Week feels range use visually hidden text rather than `aria-label` on generic elements. The hero poster is decorative (`aria-hidden`); the readout under it gives the same in the user's units.
- **Landmarks and titles:** the day swiper and Week's empty state are `main`. The document title follows the section ("Week · Layered").
- **Contrast:** new `--line-strong` token for input edges and the selected segment; darker Delete button; place-name fields get an underline.
- **Not by colour alone:** the current tab is bold with a rule above it.
- **Status messages:** toasts go through a live region that stays in the page; place search says how many places it found.
- **Forms:** the trip editor says why Save is disabled.
- **Tests:** `npm run test:a11y` (axe-core through Playwright) and a unit test for the title rule.

## Known limitations

- **Text size settings:** type is set in `px`, so the browser's text size setting and iOS Dynamic Type don't enlarge it. Browser zoom to 200% works and reflows. Moving to `rem` is a larger change than this audit.
- **Reduced motion** uses one global rule that shortens every animation and transition, rather than opting in to motion rule by rule. It works, but new animations should still use `@media (prefers-reduced-motion: no-preference)`.
- **Screen readers:** checked through the accessibility tree and axe in Chromium. Not yet tried with VoiceOver on iOS or TalkBack on a device.
- **Hidden extra:** the seven-tap circle on the hero is pointer-only. It changes nothing.
- **Coverage:** the axe run uses an empty history, so the Your record chart and table and the What Layered has learned list are scanned only in their empty state. A case with seeded history would cover them.
- **CI:** `test:a11y` isn't in CI yet. The CI owner can add `npm run build && npm run test:a11y` after `npx playwright install chromium`.
