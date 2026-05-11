# iTXTech FlashMaster

[Chinese](README-zh.md)

FlashMaster is a dense Memory Chip Intelligence Platform for memory-chip
part-number lookup, NAND Flash ID lookup, database search, and result
inspection.

[Launch FlashMaster](https://fm.itxtech.org)

## Overview

FlashMaster 2.x is a static Vue application designed as a practical workstation
surface rather than a marketing page. It runs the embedded fdnext parser in the
browser by default and can also call a compatible fdnext HTTP API deployment
when server-backed parsing is needed.

Core workflows:

- Part-number decode and search.
- NAND Flash ID decode and search.
- Dense result inspection with copy actions, vendor links, language switching,
  theme settings, and persistent local preferences.

## Architecture

The application has two parser backends:

- Embedded fdnext parser: the default mode. The fdnext engine and resources are
  bundled from the `vendor/fdnext` Git submodule and run directly in the browser.
- fdnext 2.0 HTTP API: an optional server-backed mode. The server endpoint is
  configured manually in Settings and must return the fdnext 2.0 result
  contract.

Key local boundaries:

- `src/views` contains the application screens.
- `src/services/flashApi.js` selects the active parser backend.
- `src/services/fdnextApi.js` adapts the embedded fdnext library for the UI.
- `src/store` owns runtime settings and local persistence.
- `vendor/fdnext` is an upstream Git submodule, not local application source.
- `vite.config.js` wires the fdnext submodule source and exposes build metadata.

## Toolchain

- Vite
- Vue 3
- Vue Router 4
- Vue I18n 11
- Vuetify 3
- Material Design Icons
- pnpm

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
pnpm build:singlefile
pnpm preview
```

To update the embedded fdnext dependency:

```bash
git submodule update --remote vendor/fdnext
```

## Documentation

- [Deployment, PWA, and offline distribution](docs/DEPLOYMENT.md)
- [Changelog](CHANGELOG.txt)

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
