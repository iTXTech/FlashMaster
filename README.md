# iTXTech FlashMaster

FlashMaster is a dense web workstation for NAND Flash part-number and Flash ID
lookup. It provides local decoding, database search, result inspection, copy
actions, language switching, theme settings, and optional server-backed queries
for compatibility with FlashDetector deployments.

[Launch FlashMaster](https://fm.itxtech.org)

## Architecture

FlashMaster 2.x is a static Vue application built around two parser backends:

- Embedded fdnext parser: the default mode. The fdnext engine and resources are
  bundled from the `vendor/fdnext` Git submodule and run directly in the browser.
- FlashDetector HTTP API: an optional compatibility mode. The server endpoint is
  configurable in Settings and keeps the existing HTTP integration available.

The application boundary is intentionally small:

- UI routes live under `src/views`.
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

- Decode NAND Flash part numbers.
- Decode Flash IDs.
- Search part numbers in the Flash database.
- Search Flash IDs in the Flash database.
- Inspect extra fields, Flash ID mappings, and related links.
- Switch between embedded fdnext and FlashDetector HTTP API modes.
- Persist parser mode, server address, theme, language, units, and statistics in
  localStorage.

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
