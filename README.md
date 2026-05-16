# iTXTech FlashMaster

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Version](https://img.shields.io/github/v/release/iTXTech/FlashMaster?include_prereleases)](https://github.com/iTXTech/FlashMaster/releases)
[![Powered by iTXTech fdnext](https://img.shields.io/badge/Powered%20by-iTXTech%20fdnext-111827)](https://github.com/iTXTech/fdnext)

**FlashMaster** is a high-density Memory Chip Intelligence Platform powered by **[iTXTech fdnext](https://github.com/iTXTech/fdnext)**, designed for memory-chip Part Number decoding, NAND Flash ID lookup, and comprehensive database search.

[**🚀 Launch FlashMaster (Web)**](https://fm.itxtech.org) | [**📦 Download Offline HTML**](https://github.com/iTXTech/FlashMaster/releases) | [简体中文](README-zh.md)

---

## ✨ Overview

FlashMaster is a workstation-grade static Vue application. Unlike marketing-heavy landing pages, it provides a "dense" surface optimized for engineers and technicians dealing with NAND Flash, DRAM, and managed storage (eMMC, UFS, SSD).

### Core Workflows
- **Part Number Decoding:** Instant decoding of complex part numbers for Micron, Samsung, SK Hynix, Kioxia, and more.
- **Flash ID Decoding:** Detailed NAND Flash ID inspection with process, die-profile, and vendor-specific attributes.
- **Smart Search:** Cross-database search for PN, FBGA codes, package markings, and Flash IDs.
- **Offline-Ready:** Works entirely in your browser via PWA or as a standalone HTML file.

---

## 🏗️ Architecture

FlashMaster is designed with a "Thin UI, Thick Engine" philosophy.

- **Frontend:** Built with [Vue 3](https://vuejs.org/), [Vuetify 3](https://vuetifyjs.com/), and [Vite](https://vitejs.dev/).
- **Engine ([fdnext](https://github.com/iTXTech/fdnext)):** The core logic is powered by the `fdnext` engine, bundled as a Git submodule. It handles all parsing, rule matching, and database queries.
- **Dual Backends:**
  - **Embedded:** The engine runs directly in the browser. No server required.
  - **HTTP API:** Can be configured to talk to a remote [fdnext server](https://github.com/iTXTech/fdnext) for centralized updates or heavy workloads.

Key components:
- [`src/services/flashApi.js`](src/services/flashApi.js): Backend selector and abstraction layer.
- [`src/services/fdnextApi.js`](src/services/fdnextApi.js): Adapter for the embedded `fdnext` engine.
- [`src/store/index.js`](src/store/index.js): Local persistence for settings, history, and preferences.

---

## 🛠️ Toolchain & Development

FlashMaster uses the modern [pnpm](https://pnpm.io/) toolchain.

### Prerequisites
- Node.js 24+
- pnpm 10+

### Quick Start
```bash
# Clone with submodules
git clone --recurse-submodules https://github.com/iTXTech/FlashMaster.git
cd FlashMaster

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Useful Commands
| Command | Description |
| :--- | :--- |
| `pnpm build` | Standard Web build (PWA enabled) |
| `pnpm build:singlefile` | Portable, self-contained HTML build |
| `pnpm build:singlefile:nano` | Lightweight offline build (No charts/analytics) |
| `pnpm lint` | Run ESLint |
| `pnpm preview` | Preview local production build |

---

## 📦 Deployment & Distribution

FlashMaster is highly portable. Detailed guidance can be found in [**docs/DEPLOYMENT.md**](docs/DEPLOYMENT.md).

- **PWA:** Installable on iOS, Android, and Desktop for offline usage.
- **Single-File:** Distributed as a single `.html` file via [GitHub Releases](https://github.com/iTXTech/FlashMaster/releases), ideal for air-gapped environments.

---

## 📖 Documentation

- [Deployment, PWA, and Offline](docs/DEPLOYMENT.md)
- [Changelog](CHANGELOG.txt)

---

## ⚖️ License

Copyright (c) 2019-2026 iTX Technologies

This project is licensed under the **GNU Affero General Public License v3.0**. See the [LICENSE](LICENSE) file for details.

> FlashMaster: Powering the next generation of memory chip analysis.
