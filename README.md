# iTXTech FlashMaster

FlashMaster is a dense Memory Chip Intelligence Platform for part-number and
NAND Flash ID lookup. It provides local decoding, database search, result
inspection, copy actions, language switching, theme settings, and optional
server-backed queries against fdnext 2.0 HTTP API deployments.

[Launch FlashMaster](https://fm.itxtech.org)

## Architecture

FlashMaster 2.x is a static Vue application built around two parser backends:

- Embedded fdnext parser: the default mode. The fdnext engine and resources are
  bundled from the `vendor/fdnext` Git submodule and run directly in the browser.
- fdnext 2.0 HTTP API: an optional server-backed mode. The server endpoint is
  configured manually in Settings and must return the fdnext 2.0 result
  contract.

The application boundary is intentionally small:

- UI routes live under `src/views` and route location helpers live under
  `src/router`.
- Runtime settings and persistence live in `src/store`.
- `src/services/flashApi.js` selects the active parser backend.
- `src/services/fdnextApi.js` adapts the embedded fdnext library for the UI.
- `vite.config.js` wires the fdnext submodule source and exposes build metadata.

## Toolchain

- Vite
- Vue 3
- Vue Router 4
- Vue I18n 11
- Vuetify 3
- Material Design Icons
- pnpm

## Features

- Decode memory-chip part numbers.
- Decode NAND Flash IDs.
- Search part numbers in the Flash database.
- Search Flash IDs in the Flash database.
- Inspect extra fields, Flash ID mappings, and related links.
- Switch between embedded fdnext and fdnext 2.0 HTTP API modes.
- Persist parser mode, server address, theme, language, and statistics in
  localStorage.

## Routes

FlashMaster uses one route set in both router modes:

- `/parts`
- `/parts/:pn`
- `/parts/search/:query`
- `/ids`
- `/ids/:id`
- `/ids/search/:query`
- `/settings`
- `/about`

Every route also supports an optional language prefix:

- `/en/parts/:pn`
- `/zh/ids/:id`

The URL language prefix wins over the saved local language setting and is synced
back to localStorage. Without a language prefix, FlashMaster keeps using the
saved language setting.

## Development

Clone the repository with submodules:

```bash
git clone --recurse-submodules https://github.com/iTXTech/FlashMaster.git
cd FlashMaster
```

If the repository was cloned without submodules, initialize them later:

```bash
git submodule update --init --recursive
```

Install dependencies and start the development server:

```bash
pnpm install
pnpm dev
```

Useful commands:

```bash
pnpm lint
pnpm build
pnpm preview
```

To update the embedded fdnext dependency:

```bash
git submodule update --remote vendor/fdnext
```

## Deployment

Build the static application and publish the generated `dist` directory:

```bash
pnpm build
```

By default, FlashMaster builds in hash-router mode with a relative base path,
which is suitable for static hosting, portable archives, and WebViews:

```bash
VITE_FLASHMASTER_ROUTER_MODE=hash pnpm build
```

History-router mode keeps the same route set but emits normal URLs. It is suited
for SEO-oriented web deployments and requires serving all application routes
through `index.html`:

```bash
VITE_FLASHMASTER_ROUTER_MODE=history pnpm build
```

Cloudflare Pages can use the bundled `public/_redirects` rule:

```text
/* /index.html 200
```

The public deployment is available at [fm.itxtech.org](https://fm.itxtech.org).

## Apps

- [FlashMasterAndroid](https://github.com/iTXTech/FlashMasterAndroid)
- [FlashMasteriOS](https://github.com/iTXTech/FlashMasteriOS)

## License

Copyright (C) 2019-2026 iTX Technologies

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU Affero General Public License as published by the Free
Software Foundation, either version 3 of the License, or (at your option) any
later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY
WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License along
with this program. If not, see <https://www.gnu.org/licenses/>.
