# Squeek Companion design system

## Overview

The site lets a visitor claim a pixel hamster and inspect companions whose art follows Squeekchain. Its established visual idea is the collection's pixel art on a dark blue night, with warm cream text and a gold mint action. This revision preserves that identity and the existing page structure.

The canonical implementation is `src/styles.css`, with page patterns in `src/App.tsx` and wallet controls in `src/ConnectSheet.tsx`. The first phone screen presents the product, supply and connect/mint action before the live art and explanatory sections. Evidence and verification limits are in `artifacts/validation.md`.

## Colors

Components consume semantic `--color-*` properties; the primitives remain in `:root` in `src/styles.css`.

| Role | Token | Implemented value |
| --- | --- | --- |
| Page | `--color-bg` | `--night-950`: `#0b1024` |
| Panels | `--color-surface` | `--night-900`: `#121a33` |
| Raised controls and empty art | `--color-surface-raised` | `--night-850`: `#18213f` |
| Hover | `--color-surface-hover` | `--night-800`: `#1f2a4d` |
| Pressed and standard border | `--color-surface-pressed`, `--color-border` | `--night-700`: `#2b3659` |
| Strong border | `--color-border-strong` | `--night-600`: `#3a4770` |
| Main text and focus | `--color-text`, `--color-focus` | `--cream-50`: `#fbf1dc` |
| Secondary text | `--color-text-secondary` | `--cream-300`: `#c3c6d6` |
| Primary action and links | `--color-accent-solid`, `--color-link` | `--gold-300`: `#f8d99c` |
| Primary hover / pressed | `--color-accent-solid-hover`, `--color-accent-solid-pressed` | `#fbe4b6` / `#fdeed0` |
| Text on gold | `--color-on-accent` | `--brown-900`: `#2a1d10` |
| Errors / success | `--color-error`, `--color-success` | `#ff9e8e` / `#9fe2b4` |
| Running / napping / sleeping dots | `--color-state-running`, `--color-state-napping`, `--color-state-sleeping` | `#f2b75e` / `#8fb0f0` / `#c9bff4` |

Badges retain written state labels, so color never carries the state alone. `--color-art-outline` is `oklch(1 0 0 / 0.1)`. Dark color-scheme is deliberate; no light theme or theme switch exists. Rendered text contrast passed the probe's 4.5:1 normal / 3:1 large-text thresholds; this does not certify image lettering or every translucent header background.

## Typography

`--font-sans` is `system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`. No font downloads are needed. The stylesheet requests weights 400, 600 and 700; the actual face is supplied by the operating system.

| Token | Size | Role |
| --- | --- | --- |
| `--fs-sm` | `0.875rem` | Fact labels, supply row, supporting messages and footer |
| `--fs-base` | `1rem` | Body, controls and compact gallery values |
| `--fs-md` | `1.25rem` | Intro, h3, state badges and live values |
| `--fs-lg` | `1.75rem` | h2 |
| `--fs-xl` | `clamp(2.25rem, 1.5rem + 3vw, 3.5rem)` | h1 |

Body line-height is 1.55. Headings use 1.15 and balanced wrapping; h1 tracking is -0.03em, h2 -0.02em. Prose uses pretty wrapping. The intro caps its measure at 34ch, section introductions at 62ch and the explanatory facts list at 68ch. `.num` and `.addr` use tabular digits. Fact labels and values remain visible; the grid wraps instead of clipping them.

## Layout

Spacing tokens are `--space-1/2/3/4/6/8/12/16`, resolving to 4, 8, 12, 16, 24, 32, 48 and 64px at the default root size. `.wrap` aligns sections to a `72rem` maximum with `--gutter: clamp(1rem, 4vw, 2rem)`. Panels have 24px padding; cards have 16px.

The header is sticky, using shared page edges. Below 52rem, `.top` wraps; account controls move below the brand when needed, stay right aligned and wrap inside a maximum 100% width. The brand image is fixed at its 28px size. Auto start margins remain active while navigation is hidden. At 52rem the section links appear and the adjacent account margin becomes zero.

The hero is one column below 56rem. At 56rem it becomes `minmax(0, 1.1fr) minmax(0, 1fr)` with a 48px gap. The live panel stacks its own art and facts on phones and large desktop layouts. Between 34rem and 55.99rem it puts art and status beside each other; the 34rem minimum prevents the live heading overflowing at 480px.

`.facts` fills its container and uses `repeat(auto-fit, minmax(8rem, 1fr))`, with 16px row and 24px column gaps. State, Squeek block and settled round remain separate facts: two columns fit at 390px and one at 320px. Gallery facts share this behavior with 8px/16px gaps. Card grids use `repeat(auto-fill, minmax(min(100%, 15rem), 1fr))` and 24px gaps.

The wallet sheet anchors to the bottom under 40rem and centers above that width; it is at most 420px wide and includes bottom safe-area padding. Header and live-panel layouts were rendered at 320, 390, intermediate widths and 1440px in Chromium and WebKit. Narrow layouts were tested independently of native zoom.

## Elevation & Depth

Panels use tonal separation without shadows. Control borders communicate affordance. Art has a 1px inset white outline. The sticky header uses a 92% page-color mix with transparency and an 8px backdrop blur. Stacking is header 10, skip link 30, wallet backdrop 40. The modal backdrop is `oklch(0 0 0 / 0.6)`.

## Shapes

`--radius-sm` is 8px for buttons, `--radius-md` is 12px for art and wallet rows, and `--radius-lg` is 20px for panels/cards/sheet. Progress and state dots are circular. Art frames preserve the source SVG ratio of 320:360 and use `image-rendering: pixelated`; overflow clipping is confined to the art, progress track and decorative/icon containers.

## Components

| Pattern and source | Use and behavior |
| --- | --- |
| `.btn` in `src/styles.css` | Native buttons/links; primary gold, ghost raised, quiet transparent. Minimum 44px height; `.btn-wide` is full width and at least 48px high. Hover, focus, active and disabled states are explicit. |
| `MintPanel` in `src/App.tsx` | Supply progress plus connect, network switch, eligibility checking, retry, used claim, confirm, pending, success and transaction-error states. Pending or failed eligibility cannot trigger mint. Only an explicit false `hasMinted` read earns the eligible sentence. |
| `LiveStatus` / `StateBadge` in `src/App.tsx` | Live art, textual state with colored dot, block/round values, last-read information and Refresh now. Reads have a loading placeholder and recoverable error text. |
| `Gallery` / `CompanionCard` in `src/App.tsx` | Wallet-dependent empty, loading and retry states; owned token art, traits and explorer link. Compact facts use the shared responsive grid. |
| `ConnectControl`, `ConnectSheetProvider` in `src/ConnectSheet.tsx` | One shared picker with discovered extensions, supported mobile links and Coinbase. Wrong-network control switches chain; address control reveals Disconnect. The portal marks the background inert, focuses the close control and returns focus after Escape/backdrop/close. |
| `.row`, `.ic` in `src/styles.css` | Wallet rows have at least 48px height, 28px official marks and an 8px grid gap. Removing an unsupported entry removes its row and gap without leaving a hole. |

The skip link, semantic headings and native controls support keyboard navigation. `:focus-visible` uses a 2px cream outline with 2px offset, with system Highlight in forced colors. Button presses scale to 0.96; reduced motion removes that scale. Named transition properties run for 150ms; no continuous UI animation is used. The page's existing success/error transaction area is a polite status region. Screen-reader behavior has not been manually audited.

## Do's and Don'ts

Reuse `.wrap`, the spacing tokens and semantic colors for future sections. Use the gold wide button for the main mint-panel action and neutral controls for supporting actions. Keep labels with their values and let groups wrap as content grows. Reuse `StateBadge` for the same three activity states, with text as well as color.

To add another section, use a semantic section with an h2 and `.section.wrap`, place controls before what they affect, then reuse the existing grid/card patterns. Keep it in the page's hash navigation unless static routes are explicitly exported. Avoid new fonts, extra type scales, clipping critical text or restoring fixed three-column facts on phones.

Design review followed Jakub Krehel's [Better Interface](https://github.com/jakubkrehel/skills/tree/267330e1adfc66a718fb65fa6918c1f06d0a689e/skills/better-interface) (MIT). The documentation method follows Paul Bakaus's [Impeccable document guide](https://github.com/pbakaus/impeccable/blob/9d715cc4f5564a990ca8345abfdd5df6dc9b41c8/skill/reference/document.md) (Apache-2.0), adapted here to describe this existing implementation. [Guidance license notices](artifacts/design-guidance-LICENSE.txt) are retained.
