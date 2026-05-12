# 部署与分发

FlashMaster 以静态 Web 应用形式发布。常规 Web 构建支持 PWA 安装，单文件构建用于直接分发本地 HTML。

## 常规 Web 构建

构建静态应用，并发布生成的 `dist` 目录：

```bash
pnpm build
```

默认构建使用 hash 路由和相对 base path：

```bash
VITE_FLASHMASTER_ROUTER_MODE=hash pnpm build
```

hash 模式是静态托管、便携压缩包、WebView 和无法控制 rewrite 规则的镜像站点的最稳妥默认选择。

history 模式会输出普通 URL：

```bash
VITE_FLASHMASTER_ROUTER_MODE=history pnpm build
```

history 模式要求所有应用路由都回落到 `index.html`。Cloudflare Pages 可以使用仓库内置的 `public/_redirects` 规则：

```text
/* /index.html 200
```

公开部署地址是 [fm.itxtech.org](https://fm.itxtech.org)。

## 侧边栏备案/自定义页脚信息

侧边栏版权信息下方可以通过构建环境变量追加一行备案或其他公开信息：

```bash
VITE_FLASHMASTER_FOOTER_NOTICE_TEXT="蜀ICP备XXXXXXXX号" pnpm build
```

如需点击跳转，同时设置链接地址：

```bash
VITE_FLASHMASTER_FOOTER_NOTICE_TEXT="蜀ICP备XXXXXXXX号" \
VITE_FLASHMASTER_FOOTER_NOTICE_URL="https://beian.miit.gov.cn/" \
pnpm build
```

未设置 `VITE_FLASHMASTER_FOOTER_NOTICE_TEXT` 时，界面只显示默认版权信息。设置文本但不设置 URL 时，该行会以纯文本展示；设置 URL 后会作为外部链接在新窗口打开。

## PWA 可安装 Web 构建

常规 Web 构建会生成 `site.webmanifest`、service worker 和 Workbox 预缓存：

```bash
pnpm build
```

将 `dist` 目录通过 HTTPS 发布后，可以从浏览器安装 FlashMaster：

- iOS Safari：打开站点，点击分享按钮，然后选择“添加到主屏幕”。
- Android Chrome：打开站点，使用“安装应用”或“添加到主屏幕”。
- 桌面 Chrome 或 Edge：地址栏出现安装按钮时点击安装。

PWA 会缓存构建后的应用壳。首次成功访问并完成缓存后，FlashMaster 可以在没有网络连接时重新打开。内嵌 fdnext 解析器可以离线工作；HTTP 解析模式仍依赖已配置的服务器及其 CORS 策略。

导航行为：

- hash 模式入口为 `./#/parts`，不需要服务器 rewrite 规则。
- history 模式入口为 `./parts`；首次访问仍需要服务器端 SPA rewrite，service worker 安装后会处理导航回落。

更新使用生成的 service worker 自动更新流程。新版本部署后，用户正常刷新页面即可让浏览器获取新的缓存。

## 单文件离线构建

对于不方便启动本地服务器的工程师或客户机，FlashMaster 也可以构建为一个自包含 HTML 文件：

```bash
pnpm build:singlefile
```

生成文件命名为：

```text
dist-singlefile/FlashMaster-<version>-<commitHash>.html
```

该文件用于直接双击并在浏览器中打开。这个构建 flavor 会强制使用 hash 路由，内联编译后的 JavaScript、CSS、SVG 图标子集和厂商 Logo，移除 Web analytics，并默认关闭可选市场 ticker。

单文件 flavor 不启用 PWA，因为 service worker 和 Web App Manifest 需要浏览器提供 origin。

## GitHub Release 自动发布

推送 `v*` tag 时，GitHub Actions 会自动创建或更新同名 GitHub Release，并上传以下文件：

- `FlashMaster-<version>-<commitHash>.html`：单文件离线构建，可直接在浏览器中打开。
- `FlashMaster-<version>-<commitHash>-web-hash.zip`：完整静态 Web 包，使用 hash 路由。
- `FlashMaster-<version>-<commitHash>-web-history.zip`：完整静态 Web 包，使用 history 路由，部署时需要 SPA rewrite。
- `SHA256SUMS.txt`：Release 附件的 SHA-256 校验值。

发布一个版本时，在目标提交上创建并推送 tag：

```bash
git tag v2.1.0
git push origin v2.1.0
```

## 公开路由集合

两种路由模式暴露同一组应用路由：

- `/parts`
- `/parts/:pn`
- `/parts/search/:query`
- `/ids`
- `/ids/:id`
- `/ids/search/:query`
- `/settings`
- `/about`

每个路由也支持可选的 URL 语言前缀，例如 `/en/parts/:pn` 或 `/zh/ids/:id`。URL 前缀优先于本地保存的语言设置，并会同步回 localStorage。
