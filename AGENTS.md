# FlashMaster Repository Notes

## Current Scope

FlashMaster is now a Vite + Vue 3 + Vuetify 3 dense workstation for NAND Flash
part-number lookup, Flash ID lookup, database search, and result inspection. It
is no longer in the Step 1 migration phase.

Keep the app focused as a practical tool surface. Do not add a landing page or
marketing-style first screen.

## Toolchain

- Use `pnpm` as the package manager.
- The main commands are:
  - `pnpm install`
  - `pnpm dev`
  - `pnpm lint`
  - `pnpm build`
  - `pnpm preview`
- The app is built with Vite, Vue 3, Vue Router 4, Vue I18n 11, Vuetify 3, and
  Material Design Icons.
- Do not reintroduce Vue CLI, webpack, Yarn, or Vue 2 dependencies.

## Public Routes

Keep these routes available:

- `/decode`
- `/decodeId`
- `/searchPn`
- `/searchId`
- `/settings`
- `/about`

## Parser Architecture

The UI talks through `src/services/flashApi.js`. That service selects the active
backend based on Settings:

- Embedded parser: `src/services/fdnextApi.js` adapts the bundled iTXTech
  `fdnext` engine and resources from the `vendor/fdnext` Git submodule.
- HTTP parser: the legacy FlashDetector HTTP API remains available for
  compatibility and uses the configured server address.

Preserve behavior for these logical endpoints:

- `info`
- `decode`
- `decodeId`
- `searchPn`
- `searchId`
- `summary`
- `summaryId`

Update the embedded parser with:

```bash
git submodule update --remote vendor/fdnext
```

When the submodule changes, verify both embedded parsing and HTTP mode still
work.

## fdnext Update Rules

Treat `vendor/fdnext` as an upstream Git submodule, not as local application
source.

Standard update flow:

```bash
git submodule update --init --recursive
git -C vendor/fdnext status --short
git -C vendor/fdnext log --oneline --max-count=8
git submodule update --remote vendor/fdnext
git diff --submodule=log vendor/fdnext
```

After updating:

- Review the fdnext commit log between the old and new submodule commits.
- Summarize user-visible parser, database, rule, or resource changes in the
  FlashMaster changelog when they affect decoding/search behavior.
- Keep new changelog entries at the top of both `CHANGELOG.txt` and
  `CHANGELOG-zh.txt`.
- If the app version is bumped, update `package.json`; the build will append the
  FlashMaster Git short hash automatically.
- Do not manually edit `FDNEXT_VERSION`; it is derived in `vite.config.js` from
  the fdnext package version and submodule Git short hash.
- Stage the submodule pointer update itself, plus any app, changelog, or version
  files that intentionally changed.

Guardrails:

- Do not copy fdnext source or resource files out of `vendor/fdnext`.
- Do not replace the submodule with a direct `../fdnext` dependency.
- Do not make local edits inside `vendor/fdnext` unless the user explicitly asks
  for an upstream patch workflow.
- If `vendor/fdnext` is dirty before an update, inspect the changes first and
  avoid resetting them without explicit approval.
- Preserve the Vite aliases for `@itxtech/fdnext-core` and
  `@itxtech/fdnext-dsl` unless fdnext changes its package layout.

Minimum verification after an fdnext update:

```bash
pnpm lint
pnpm build
```

Manual smoke test:

- Embedded PN decode.
- Embedded Flash ID decode.
- Embedded PN search.
- Embedded Flash ID search.
- Settings parser version display.
- HTTP parser mode still loads and calls the configured FlashDetector server.

## Versioning And Changelog

- `package.json` contains the base app version.
- `vite.config.js` exposes `VERSION` as `<package version>-<git short hash>`.
- `vite.config.js` exposes `FDNEXT_VERSION` as `<fdnext package version>-<fdnext
  git short hash>`.
- Changelog display uses only the main version without the commit hash.
- Changelog source files live at the repository root:
  - `CHANGELOG.txt`
  - `CHANGELOG-zh.txt`
- New changelog entries go at the top. Do not delete older version entries.
- Changelog files are displayed by `src/components/ChangelogDialog.vue` as
  scrollable text.

## UI Rules

- Keep the UI high-density and workstation-like.
- The first screen should be directly usable.
- Preserve the compact left navigation, top title/language area, settings page,
  result panels, paged tables, and copy actions.
- Theme selection lives in Settings and supports only dark, light, and system.
- Keep footer copyright as `© 2019-2026 iTX Technologies`.
- In result data, prefer meaningful fields over repeated raw query echoes. Avoid
  showing duplicate PN/Flash ID values unless they add useful context.
- Vendor logos are rendered through `src/services/vendorLogos.js`; if a link row
  uses `img: "logo"`, show the vendor logo.

## Market Ticker

The optional market ticker is implemented by:

- `src/components/MarketTicker.vue`
- `src/services/marketApi.js`
- the `marketTicker` localStorage setting in `src/store/index.js`

It uses Hyperliquid `xyz` market data, preferring WebSocket updates and falling
back to HTTP snapshots. The default endpoints can be overridden with:

- `VITE_FLASHMASTER_MARKET_ENDPOINT`
- `VITE_FLASHMASTER_MARKET_WS_ENDPOINT`

Keep the ticker optional, quiet, and easy to disable. It should not distract
from FlashMaster's primary NAND tools.

Performance expectations:

- Render only the visible ticker slots plus a small buffer.
- Use fixed ticker slots to avoid wide-screen jumpiness.
- Keep the scrolling animation CSS-driven.
- Stop the market service while the document is hidden.
- Avoid excessive localStorage writes and UI updates.

## Analytics

`src/services/analytics.js` currently tracks lookup events only when
`window.gtag` exists. Query analytics are privacy-sensitive because part numbers
and Flash IDs are user input.

If analytics are expanded:

- Make the behavior transparent in the UI.
- Prefer aggregated or normalized query data where possible.
- Keep a Settings control for user choice.
- Do not silently add new externally visible analytics providers or endpoints.

## State And Persistence

Runtime settings are stored in `localStorage` through `src/store/index.js`.
Important persisted settings include:

- parser mode
- HTTP server address
- language
- theme
- capacity unit
- soft keyboard behavior
- local usage statistics
- changelog seen version
- market ticker visibility

## Test Plan

Before handing off meaningful changes, run:

```bash
pnpm lint
pnpm build
```

For UI changes, also run `pnpm dev` and manually verify in the browser:

- PN decode and PN search
- Flash ID decode and Flash ID search
- embedded fdnext mode
- FlashDetector HTTP mode when a server is available
- settings persistence
- language switching
- theme switching
- changelog dialog behavior
- copy buttons
- market ticker enable/disable behavior

## Guardrails

- Keep changes scoped to the requested behavior.
- Do not remove the HTTP API compatibility path.
- Do not remove the embedded fdnext parser path.
- Do not add direct dependencies on `../fdnext`; use the `vendor/fdnext`
  submodule.
- Do not commit generated `dist` output unless explicitly requested.
