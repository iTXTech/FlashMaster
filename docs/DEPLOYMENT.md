# 部署与分发指南

FlashMaster 是一个纯静态 Web 应用，提供多种构建模式以适配不同的使用场景：从标准的在线托管到完全脱网的单文件运行。

---

## 1. 标准 Web 构建 (托管模式)

这是最常用的构建方式，生成的静态资产可部署至 GitHub Pages、Vercel、Cloudflare Pages 或任何静态 Web 服务器。

### 核心构建命令
```bash
# 执行生产环境构建
pnpm build
```

### 路由模式选择
应用支持 `hash`（默认）和 `history` 两种路由模式，通过环境变量控制：

- **Hash 模式 (推荐):**
  ```bash
  VITE_FLASHMASTER_ROUTER_MODE=hash pnpm build
  ```
  *特点：* 兼容性最强。无需服务器特殊配置，支持直接双击打开、静态托管及 WebView。

- **History 模式:**
  ```bash
  VITE_FLASHMASTER_ROUTER_MODE=history pnpm build
  ```
  *特点：* 产生整洁的 URL（如 `/parts/MT29F`），利于 SEO。
  *要求：* 服务端需配置 SPA 重写规则（Rewrite），将所有未知路径回落至 `index.html`。

### Cloudflare Pages 适配
若使用 History 模式部署至 Cloudflare Pages，需确保 `_redirects` 配置正确。项目已内置 `public/_redirects`，遵循“静态文件直通 + SPA 路由回落”的原则，避免 404 错误并支持爬虫优化。

---

## 2. 单文件离线构建 (自包含模式)

针对极端的离线环境（如无网络的工作站、内网机房），FlashMaster 支持将整个应用打包为一个独立的 `.html` 文件。

### 完整单文件 (Full Flavor)
```bash
pnpm build:singlefile
```
*输出：* `dist-singlefile/FFlashMaster-<version>-<commitHash>.html`
*包含：* 完整的解析引擎、UI 图标、厂商 Logo、行情脉搏（联网时可用）及基础统计。

### 精简单文件 (Nano Flavor)
```bash
pnpm build:singlefile:nano
```
*输出：* `dist-singlefile/FlashMaster-<version>-<commitHash>-nano.html`
*特点：* 极致精简，无行情功能、无统计代码、不包含 `lightweight-charts` 库。适合完全物理隔离的环境。

---

## 3. PWA 支持与移动端安装

标准 Web 构建默认包含 PWA (Progressive Web App) 支持。通过 HTTPS 部署后，用户可以将应用“安装”到设备桌面上。

- **安装路径：**
  - **iOS (Safari):** 分享 -> 添加到主屏幕。
  - **Android (Chrome):** 选项 -> 安装应用 / 添加到主屏幕。
  - **桌面端 (Chrome/Edge):** 地址栏右侧会出现“安装”图标。
- **离线能力：** PWA 会通过 Service Worker 缓存应用壳层。首次成功访问后，即便断网也能正常启动应用（内嵌解析引擎可完全离线运行）。

---

## 4. 自定义部署配置

你可以通过构建时的环境变量来自定义应用界面：

### 页脚备案/公告信息
在页脚版权信息下方显示自定义文本（如 ICP 备案号）：
```bash
# 仅显示文本
VITE_FLASHMASTER_FOOTER_NOTICE_TEXT="蜀ICP备XXXXXXXX号" pnpm build

# 显示带链接的文本
VITE_FLASHMASTER_FOOTER_NOTICE_TEXT="蜀ICP备XXXXXXXX号" \
VITE_FLASHMASTER_FOOTER_NOTICE_URL="https://beian.miit.gov.cn/" \
pnpm build
```

---

## 5. 持续集成与自动发布

项目集成了 GitHub Actions 流。每当推送以 `v*` 开头的 Tag（例如 `v2.3.0`）时，系统会自动执行以下操作：
1. 构建全量 Web 压缩包（Hash 与 History 两种版本）。
2. 构建单文件离线 HTML。
3. 自动创建 GitHub Release 并上传所有构建成品。

**发布新版本：**
```bash
git tag v2.x.x
git push origin v2.x.x
```

---

## 6. 公开路由与 SEO

无论使用何种路由模式，FlashMaster 均暴露以下标准入口：
- `/parts` - Part Number 解码与搜索
- `/ids` - Flash ID 解码与搜索
- `/settings` - 全局设置
- `/about` - 关于项目

支持 URL 级别的语言强制切换，例如访问 `/en/parts` 或 `/zh/parts` 将会覆盖浏览器的默认语言首选项。
