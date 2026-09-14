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
  *特点：* 无需服务端 SPA 重写规则，适合静态托管及 WebView。标准 Web 产物仍需 HTTP(S) 服务；直接双击打开使用下文的单文件构建。

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

full/nano 使用 IIFE 格式的 classic 内联 Worker，支持通过 `file://` 直接打开，并且不重复打包主线程解析引擎。若 Worker 启动、通信或请求超时失败，当前及后续查询会保留首个失败原因，浏览器控制台记录一次诊断；预热失败也会留下诊断记录。诊断不记录查询载荷，也不会上传到外部服务。普通 Web 构建仍保留按需加载的主线程降级路径，Pico 仍为 HTTP-only。

所有单文件构建通过别名排除 PWA 安装服务、组件及专属文案，不初始化安装器或注册浏览器事件监听。
Web 与全部单文件构建均在构建时提取当前应用版本的中英文更新日志；仓库保留完整历史，
产物不携带旧版本日志，也不在浏览器中裁剪或解压。厂商图片保留原有格式与外观，
仅做静态 SVG 精简和 PNG 非显示元数据清理。

### 完整单文件 (Full Flavor)
```bash
pnpm build:singlefile
```
*输出：* `dist-singlefile/FlashMaster-<version>+<commitHash>.html`
*包含：* 完整的解析引擎、UI 图标、厂商 Logo、行情脉搏（联网时可用）及基础统计。

### 精简单文件 (Nano Flavor)
```bash
pnpm build:singlefile:nano
```
*输出：* `dist-singlefile/FlashMaster-<version>+<commitHash>-nano.html`
*特点：* 极致精简，无行情功能、无统计代码、不包含 `lightweight-charts` 库，默认关闭 ER 外部报告链接。适合完全物理隔离的环境。

### HTTP-only 单文件 (Pico Flavor)
```bash
pnpm build:singlefile:pico
```
*输出：* `dist-singlefile/FlashMaster-<version>+<commitHash>-pico.html`
*特点：* 不内嵌 fdnext 解析引擎，应用始终通过 HTTP API 查询远端 fdnext 服务，并默认关闭 ER 外部报告链接。适合统一维护服务端解析资源、前端只作为轻量入口的部署。

ER 外部报告链接可通过构建变量控制：

```bash
VITE_FLASHMASTER_ER_EXTERNAL_LINK=0 pnpm build
VITE_FLASHMASTER_ER_EXTERNAL_LINK=1 pnpm build:singlefile:nano
```

如需交付固定且不可编辑的服务器地址，可在构建时设置：

```bash
VITE_FLASHMASTER_LOCKED_SERVER=https://your-fdnext.example pnpm build:singlefile:pico
```

---

## 3. PWA 支持与移动端安装

标准 Web 构建默认包含 PWA (Progressive Web App) 支持。通过 HTTPS 部署后，用户可以将应用“安装”到设备桌面上。

- **安装路径：**
  - **iOS (Safari):** 分享 -> 添加到主屏幕。
  - **Android (Chrome):** 选项 -> 安装应用 / 添加到主屏幕。
  - **桌面端 (Chrome/Edge):** 地址栏右侧会出现“安装”图标。
- **离线能力：** PWA 会通过 Service Worker 缓存应用壳层和 Worker 版内嵌解析引擎。首次成功访问后，即便断网也能正常启动并完成内嵌解析。主线程降级引擎不进入预缓存，仅在 Worker 失效且仍在线时按需加载，避免安装阶段重复缓存两份 fdnext 引擎。
- **更新策略：** 入口 HTML、公开 SPA 路由、`sw.js`、`registerSW.js` 和 manifest 使用 `no-cache` 重新验证；hash 后的静态资源使用长期缓存。页面打开时会检查新的 Service Worker，已有安装检测到新版接管后刷新一次进入新版本，不做后台轮询刷新。

### 安装入口与提示

标准 Web 版本提供侧栏添加入口，包括局域网 HTTP 页面。Chrome、Edge 等 Chromium 浏览器
仅使用原生安装按钮：收到 `beforeinstallprompt` 后启用，点击调用一次浏览器确认；没有事件时
隐藏侧栏入口，不展示操作说明，也不主动推广。系统确认打开期间保留入口、显示等待状态并禁用重复点击；取消或调用失败后隐藏入口，等待浏览器再次提供安装事件。
缺少事件不代表设备未安装或浏览器完全不支持安装。
iPhone/iPad 使用 Safari 共享菜单引导（包括使用 WebKit 的 iOS Chrome），Mac Safari 引导添加到程序坞；
其他浏览器保留操作说明。Safari 的局域网 HTTP 页面仍可查看添加说明，离线能力文案只在安全上下文显示。
离线缓存需要安全上下文（HTTPS 或本机 localhost）和标准生产构建。

手机浏览器首次打开约 3 秒后检查一次，在底部显示简短安装提示。若已开始输入、输入框有焦点、
键盘展开、弹窗/临时侧栏打开或页面隐藏，本次访问跳过；查询结果和路由切换不触发提示。
提示展示期间暂时隐藏底部广告，提示结束后按广告原关闭状态恢复，不修改广告关闭记录。
“稍后”、打开添加引导或响应系统安装确认后，7 天内不再主动提示；冷却到期只在下次访问检查，
不打断已打开的页面。设置中关闭“显示安装提示”也隐藏侧栏入口；已关闭的偏好继续生效。
开关及冷却时间由 `src/store/index.js` 存在本机，不跟随版本更新重置，也不发送安装统计。
桌面浏览器只保留可用时的侧栏安装入口。更新日志仅从关于页手动打开，首次访问及升级均不自动弹出。

独立 App 窗口和所有单文件版本不显示安装推广。独立窗口检测只说明当前运行方式，
普通浏览器窗口不能据此确定设备是否已安装；接受安装后立即收起当前会话的推广。
验证使用标准构建预览检查 manifest、Service Worker 和离线启动；模拟安装事件只证明 UI
分支，原生确认及添加图标后的启动仍需对应浏览器/设备实测。

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

项目集成了 GitHub Actions 工作流。每当推送以 `v*` 开头的 Tag（例如 `v2.3.0`）时，系统会自动执行以下操作：
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
