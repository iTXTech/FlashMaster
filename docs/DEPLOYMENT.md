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

history 模式要求应用路由回落到 `index.html`，真实静态文件也必须直接返回。Cloudflare Pages 的 `_redirects` 规则会优先于静态文件匹配，因此不能只写一个裸的 `/* /index.html 200`。仓库内置的 `public/_redirects` 采用“静态文件直通 + SPA 兜底”的顺序：

```text
/robots.txt /robots.txt 200
/sitemap.xml /sitemap.xml 200
/site.webmanifest /site.webmanifest 200
/og/* /og/:splat 200
/assets/* /assets/:splat 200

/parts /index.html 200
/parts/* /index.html 200
/ids /index.html 200
/ids/* /index.html 200
/* /index.html 200
```

末尾的全局兜底会让未知 URL 进入 SPA 壳层；Vue Router 再显示 404 页面，并在客户端把 robots meta 改为 `noindex, follow`。不要把未知路由静默跳回首页，否则用户会迷失，搜索引擎也更容易看到大量首页重复内容。

面向搜索引擎的公开站点应使用 history 构建：

```bash
VITE_FLASHMASTER_ROUTER_MODE=history pnpm build
```

如果发布的是默认 hash 构建，应用仍可正常使用，但 sitemap 中的 `/parts`、`/ids`、`/about` 等普通 URL 需要服务器 rewrite 才能首次访问。

公开部署地址是 [fm.itxtech.org](https://fm.itxtech.org)。

### Cloudflare 入口域名

`fm.itxtech.org` 应尽量作为真正的 canonical 站点服务内容，而不是通过 URL Redirect 跳到镜像域名。SEO 最稳妥的配置是：

1. 在静态托管/CDN 侧绑定 `fm.itxtech.org` 作为自定义域名，或让 Cloudflare DNS 直接代理到同一个静态站点 origin。
2. 删除会把 `fm.itxtech.org/*` 跳转到 `fm.imlxy.net/` 的 Redirect Rule、Page Rule 或 Bulk Redirect。
3. 确认这些地址都是 `200`，且 Content-Type 正确：

```bash
curl -I https://fm.itxtech.org/parts
curl -I https://fm.itxtech.org/robots.txt
curl -I https://fm.itxtech.org/sitemap.xml
curl -I https://fm.itxtech.org/og/flashmaster.png
```

如果短期内仍必须让普通用户从 `fm.itxtech.org` 跳到 `fm.imlxy.net`，不要使用静态目标 `https://fm.imlxy.net/`，否则 `/robots.txt`、`/sitemap.xml`、`/og/flashmaster.png` 等路径会全部丢失。Cloudflare Redirect Rule 至少应保留路径和 query：

```text
When incoming requests match:
http.host eq "fm.itxtech.org" and not cf.client.bot

Then:
Type: Dynamic
Expression: concat("https://fm.imlxy.net", http.request.uri.path)
Status code: 308
Preserve query string: Enabled
```

这里的 `not cf.client.bot` 会让 Cloudflare 识别出的已知搜索爬虫不命中跳转规则。前提是 `fm.itxtech.org` 本身也已经能从 origin 返回同一份站点内容；否则爬虫虽然不走 302，但仍会看到错误页或空 origin。若无法让 `fm.itxtech.org` 直连源站，就不要在 sitemap 和 canonical 里使用它。

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

该文件用于直接双击并在浏览器中打开。这个完整单文件 flavor 会强制使用 hash 路由，内联编译后的 JavaScript、CSS、SVG 图标子集和厂商 Logo，保留 Web analytics，并保留与在线版一致的 Market Pulse 与 K 线能力。单文件 analytics 使用固定页面路径 `/singlefile/FlashMaster-<version>-<commitHash>.html`，避免 `file://` 本地路径进入统计。

如需无行情、无 analytics 的离线/内网分发包，可构建 nano flavor：

```bash
pnpm build:singlefile:nano
```

生成文件命名为：

```text
dist-singlefile/FlashMaster-<version>-<commitHash>-nano.html
```

nano flavor 不注入 Google tag，构建时将 analytics 替换为 noop 模块，不导入 Market Pulse、K 线组件、行情服务或商业服务横幅，因此不会打包 `lightweight-charts`。

单文件 flavor 不启用 PWA，因为 service worker 和 Web App Manifest 需要浏览器提供 origin。

## GitHub Release 自动发布

推送 `v*` tag 时，GitHub Actions 会自动创建或更新同名 GitHub Release，并上传以下文件：

- `FlashMaster-<version>-<commitHash>.html`：完整单文件构建，可直接在浏览器中打开。
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
