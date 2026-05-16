# iTXTech FlashMaster

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Version](https://img.shields.io/github/v/release/iTXTech/FlashMaster?include_prereleases)](https://github.com/iTXTech/FlashMaster/releases)

**FlashMaster** 是一个存储芯片智能平台，专为存储芯片料号解析、NAND Flash ID 解析以及全面的数据库搜索而设计。

[**🚀 打开 FlashMaster (Web)**](https://fm.itxtech.org) | [**📦 下载离线 HTML**](https://github.com/iTXTech/FlashMaster/releases) | [English](README.md)

---

## ✨ 概览

FlashMaster 是一个工作站级别的静态 Vue 应用。与偏向营销的落地页不同，它为工程师和技术人员提供了一个“高密度”的界面，优化了对 NAND Flash、DRAM 以及托管存储（eMMC、UFS、SSD）的处理效率。

### 核心工作流
- **料号解析 (Part Number Decoding):** 快速解析 美光、三星、SK海力士、铠侠 等主流厂商的复杂料号。
- **Flash ID 解析 (Flash ID Decoding):** 详细的 NAND Flash ID 检查，包含制程、Die 和厂商特定属性。
- **智能搜索 (Smart Search):** 跨数据库搜索料号、FBGA 代码、封装标记和 Flash ID。
- **离线就绪 (Offline-Ready):** 通过 PWA 或独立 HTML 文件完全在浏览器中运行，无需联网。

---

## 🏗️ 架构设计

FlashMaster 采用“轻 UI，重引擎”的设计哲学。

- **前端 (Frontend):** 基于 [Vue 3](https://vuejs.org/)、[Vuetify 3](https://vuetifyjs.com/) 和 [Vite](https://vitejs.dev/) 构建。
- **引擎 ([fdnext](https://github.com/iTXTech/fdnext)):** 核心逻辑由作为 Git 子模块引入的 `fdnext` 引擎驱动。它处理所有的解析、规则匹配和数据库查询。
- **双后端模式:**
  - **内嵌模式 (默认):** 引擎直接在浏览器中运行，无需服务器。
  - **HTTP API 模式:** 可配置连接到远程 [fdnext 服务器](https://github.com/iTXTech/fdnext)，适用于集中更新或重度负载。

关键组件:
- [`src/services/flashApi.js`](src/services/flashApi.js): 后端选择器与抽象层。
- [`src/services/fdnextApi.js`](src/services/fdnextApi.js): 内嵌 `fdnext` 引擎的适配器。
- [`src/store/index.js`](src/store/index.js): 设置、历史记录和偏好设置的本地持久化。

---

## 🛠️ 工具链与开发

FlashMaster 使用现代化的 [pnpm](https://pnpm.io/) 工具链。

### 前置条件
- Node.js 24+
- pnpm 10+

### 快速开始
```bash
# 克隆仓库并包含子模块
git clone --recurse-submodules https://github.com/iTXTech/FlashMaster.git
cd FlashMaster

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

### 常用命令
| 命令 | 描述 |
| :--- | :--- |
| `pnpm build` | 标准 Web 构建 (启用 PWA) |
| `pnpm build:singlefile` | 便携式单文件 HTML 构建 |
| `pnpm build:singlefile:nano` | 轻量化离线构建 (无图表/统计) |
| `pnpm lint` | 运行 ESLint |
| `pnpm preview` | 预览本地生产环境构建 |

---

## 📦 部署与分发

FlashMaster 具有极高的便携性。详细指南请参阅 [**docs/DEPLOYMENT.md**](docs/DEPLOYMENT.md)。

- **PWA:** 可在 iOS、Android 和桌面端安装以供离线使用。
- **单文件:** 通过 [GitHub Releases](https://github.com/iTXTech/FlashMaster/releases) 以单个 `.html` 文件分发，非常适合隔离环境。

---

## 📖 文档

- [部署、PWA 与离线分发](docs/DEPLOYMENT.md)
- [更新日志](CHANGELOG-zh.txt)
- [iTXTech fdnext](https://github.com/iTXTech/fdnext)

---

## ⚖️ 许可证

版权所有 (c) 2019-2026 iTX Technologies

This project is licensed under the **GNU Affero General Public License v3.0**. See the [LICENSE](LICENSE) file for details.

> FlashMaster: 为下一代存储芯片分析提供动力。
