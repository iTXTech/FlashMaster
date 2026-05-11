# iTXTech FlashMaster

[English](README.md)

FlashMaster 是面向存储芯片料号查询、NAND Flash ID 查询、数据库搜索和结果检查的高密度存储芯片智能解析平台。

[打开 FlashMaster](https://fm.itxtech.org)

## 概览

FlashMaster 2.x 是一个静态 Vue 应用，定位为实用的工作台界面，而不是营销落地页。默认情况下，它在浏览器内运行内嵌 fdnext 解析器；需要服务端解析时，也可以调用兼容的 fdnext HTTP API 部署。

核心工作流：

- 料号解析与搜索。
- NAND Flash ID 解析与搜索。
- 高密度结果检查，包含复制操作、厂商链接、语言切换、主题设置和本地偏好持久化。

## 架构

应用提供两种解析后端：

- 内嵌 fdnext 解析器：默认模式。fdnext 引擎和资源来自 `vendor/fdnext` Git submodule，并直接在浏览器中运行。
- fdnext 2.0 HTTP API：可选的服务端模式。服务端地址在设置中手动配置，并需要返回 fdnext 2.0 结果合约。

关键本地边界：

- `src/views` 包含应用页面。
- `src/services/flashApi.js` 负责选择当前解析后端。
- `src/services/fdnextApi.js` 将内嵌 fdnext 库适配给 UI。
- `src/store` 负责运行时设置和本地持久化。
- `vendor/fdnext` 是上游 Git submodule，不是本地应用源码。
- `vite.config.js` 负责连接 fdnext submodule 源码并暴露构建元数据。

## 工具链

- Vite
- Vue 3
- Vue Router 4
- Vue I18n 11
- Vuetify 3
- Material Design Icons
- pnpm

## 开发

克隆仓库并拉取 submodule：

```bash
git clone --recurse-submodules https://github.com/iTXTech/FlashMaster.git
cd FlashMaster
```

如果克隆时没有拉取 submodule，可以之后初始化：

```bash
git submodule update --init --recursive
```

安装依赖并启动开发服务器：

```bash
pnpm install
pnpm dev
```

常用命令：

```bash
pnpm lint
pnpm build
pnpm build:singlefile
pnpm preview
```

更新内嵌 fdnext 依赖：

```bash
git submodule update --remote vendor/fdnext
```

## 文档

- [部署、PWA 与离线分发](docs/DEPLOYMENT.md)
- [更新日志](CHANGELOG-zh.txt)

## 应用

- [FlashMasterAndroid](https://github.com/iTXTech/FlashMasterAndroid)
- [FlashMasteriOS](https://github.com/iTXTech/FlashMasteriOS)

## 许可证

版权所有 (C) 2019-2026 iTX Technologies

本程序是自由软件：你可以根据自由软件基金会发布的 GNU Affero 通用公共许可证条款重新分发和/或修改它，可以选择许可证第 3 版，或任何后续版本。

本程序按“原样”分发，希望它有用，但不提供任何担保；甚至不包括适销性或特定用途适用性的默示担保。更多细节请参见 GNU Affero 通用公共许可证。

你应该已经随本程序收到 GNU Affero 通用公共许可证副本。如果没有，请访问 <https://www.gnu.org/licenses/>。
